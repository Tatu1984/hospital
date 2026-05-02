// k6 smoke + soak script for HMS.
//
// Run locally:
//   K6_BASE_URL=https://hospital-api-xxx.vercel.app \
//   K6_USERNAME=loadtest \
//   K6_PASSWORD='your-loadtest-password' \
//   k6 run loadtest/k6-smoke.js
//
// What it does:
//   - Logs in once at setup, hands the token to every VU.
//   - Each VU repeatedly hits the patient + appointment + dashboard list
//     endpoints in a realistic mix (lots of reads, occasional writes).
//   - The "scenarios" section ramps from 1 → 20 concurrent users over 5
//     minutes and holds for another 2. Adjust to taste.
//
// SLO checks (gate via k6's --linger or CI):
//   - http_req_failed rate < 0.5%
//   - read p95 < 500ms
//   - write p95 < 1000ms
//   - any 5xx is a failure
//
// Notes:
//   - Use a DEDICATED loadtest user, not 'admin'. Create one with the
//     ADMIN role and a password that's only used for this script.
//   - DO NOT run against the live patient-facing prod DB without warning
//     the hospital — even read load competes with real users.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL;
const USERNAME = __ENV.K6_USERNAME || 'loadtest';
const PASSWORD = __ENV.K6_PASSWORD;

if (!BASE_URL) throw new Error('K6_BASE_URL is required');
if (!PASSWORD) throw new Error('K6_PASSWORD is required');

// Custom metrics so we can split read vs write percentiles in the summary.
const readLatency = new Trend('read_latency_ms', true);
const writeLatency = new Trend('write_latency_ms', true);
const errors = new Rate('errors');

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },   // ramp to 5
        { duration: '2m', target: 20 },  // ramp to 20
        { duration: '2m', target: 20 },  // soak
        { duration: '1m', target: 0 },   // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    read_latency_ms: ['p(95)<500', 'p(99)<1000'],
    write_latency_ms: ['p(95)<1000', 'p(99)<2500'],
    errors: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${res.body}`);
  }
  const token = JSON.parse(res.body).token;
  return { token };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('reads', () => {
    const endpoints = [
      '/api/auth/me',
      '/api/patients?limit=20',
      '/api/dashboard/stats',
      '/api/appointments?limit=20',
      '/api/admissions?limit=20',
      '/api/invoices?limit=20',
    ];
    for (const path of endpoints) {
      const r = http.get(`${BASE_URL}${path}`, { headers, tags: { kind: 'read' } });
      readLatency.add(r.timings.duration);
      const ok = check(r, {
        'status 2xx': (resp) => resp.status >= 200 && resp.status < 300,
      });
      if (!ok) errors.add(1);
    }
  });

  // 1-in-10 VU iterations does a write to spread the load realistically.
  if (Math.random() < 0.1) {
    group('write — patient register', () => {
      const body = JSON.stringify({
        name: `Load Test Patient ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        gender: 'OTHER',
        purpose: 'k6 load test',
      });
      const r = http.post(`${BASE_URL}/api/patients`, body, { headers, tags: { kind: 'write' } });
      writeLatency.add(r.timings.duration);
      const ok = check(r, {
        'patient created': (resp) => resp.status === 201 || resp.status === 200,
      });
      if (!ok) errors.add(1);
    });
  }

  // 1-in-30 logs out + back in to exercise the JWT refresh path.
  if (Math.random() < 0.033) {
    group('refresh', () => {
      const r = http.post(`${BASE_URL}/api/auth/refresh`, '{}', { headers, tags: { kind: 'auth' } });
      check(r, { 'refresh ok': (resp) => resp.status === 200 || resp.status === 401 });
    });
  }

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

export function teardown(/* data */) {
  // Could clean up the patients we created here, but leaving them is
  // typically fine — they're tagged "Load Test Patient" and easy to bulk
  // delete: DELETE FROM patients WHERE name LIKE 'Load Test Patient %';
  // Run that against the loadtest tenant only.
}
