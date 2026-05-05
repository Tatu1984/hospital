# Mobile apps

Two React Native (Expo) apps that talk to the same `hospital-c3k5` backend
the desktop portal uses. They live next to `frontend/` and `backend/` in
the same repo so changes to the backend API contract can be made and
verified across all three surfaces in one PR.

## Apps

| Path | Audience | Key flows |
|---|---|---|
| `mobile/patient/` | Outpatients, family of admitted patients | Book appointment, view Rx, lab reports, bills, OT tracker |
| `mobile/doctor/` | Consultants, round physicians, surgeons | Today's schedule, encounter notes, Rx writer, OT stage updater |

## Stack (locked in 2026-05-05)

- **Expo SDK 52** (Managed) — single codebase, EAS Build for both stores
- **expo-router** — file-based routing inside `app/`
- **NativeWind v4** — Tailwind for React Native
- **react-native-reusables** — shadcn-style component library (Button, Card,
  Dialog, etc.) so the visual language matches the web portal
- **Moti + react-native-reanimated** — animations
- **expo-secure-store** — token storage (encrypted on iOS Keychain / Android
  EncryptedSharedPreferences)
- **expo-local-authentication** — Touch ID / Face ID / fingerprint unlock
- **axios** — HTTP client (same as the web portal)
- **zustand** — lightweight global state (auth, theme)

## Getting started

Each app is a standalone Expo project with its own `package.json`. From
either directory:

```bash
cd mobile/patient        # or mobile/doctor
npm install
npx expo start           # dev server + QR for Expo Go
```

Both apps point at `https://hospital-c3k5.vercel.app` by default. To use a
local backend, set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000` in the
relevant `.env` file before starting.

## Backend contract

Both apps talk to `/api/mobile/v1/*` for mobile-only endpoints (auth, home
aggregation, push registration) and the existing `/api/*` for shared
domain entities (patients, appointments, drugs, surgeries, etc.). The
mobile namespace lives in `backend/src/modules/` and follows the layered
controller/service/repository/routes/model architecture — see
`backend/src/modules/README.md`.

## Login (current state — 2026-05-05)

Both apps use **username/password**. Phase-2 OTP login depends on the SMS
provider (currently `mock`); the routes are already wired and will start
working as soon as DLT-registered MSG91 / Twilio credentials are added to
the backend's Vercel environment.

For local testing, the seed users in the backend work:

| Username | Password | App |
|---|---|---|
| `admin` | `password123` | Either (admin sees all) |
| `doctor1` | `password123` | Doctor app |

A patient seed user will be added once the auth.service `findLinkedPatient`
join is verified end-to-end (currently links by email).
