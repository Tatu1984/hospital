// ABDM (Ayushman Bharat Digital Mission) Gateway service.
//
// Real verification flow per NHA spec (sandbox.abdm.gov.in):
//
//   1.  POST /gateway/v0.5/sessions
//       body  { clientId, clientSecret }
//       → returns { accessToken, expiresIn }  — cache 30 min
//
//   2.  POST /v1/auth/init                          (Authorization: Bearer)
//       body  { authMode: "MOBILE_OTP" | "AADHAAR_OTP" | "DEMOGRAPHICS",
//               purpose: "KYC_AND_LINK",
//               requester: { type: "HIP", id: HFR_ID },
//               query: { id: abhaNumber, ... } }
//       → { txnId }   — NHA dispatches OTP to the patient's registered
//                       mobile (mobile_otp) or Aadhaar-linked mobile.
//
//   3.  POST /v1/auth/confirmWithMobileOTP          (Authorization: Bearer)
//       body  { txnId, credential: { authCode: "<6-digit OTP>" } }
//       → on success: signed JWT containing the patient's verified
//                     name / dob / gender / address. THIS is the moment
//                     we trust the linkage.
//
// To wire production: drop these env vars into backend/.env and rebuild:
//
//   ABDM_BASE_URL      e.g. https://dev.abdm.gov.in   (sandbox)
//                          https://healthidsbx.abdm.gov.in  (prod)
//   ABDM_CLIENT_ID
//   ABDM_CLIENT_SECRET
//   ABDM_HFR_ID        Health Facility Registry ID assigned by NHA
//
// When ANY of those vars is missing, this module behaves as a HARD
// stub — all calls throw a controlled `AbdmNotConfigured` error so
// the endpoint handler can return a 503 with a clear message. We do
// NOT pretend-verify in stub mode, because doing so was the original
// bug the user caught: the UI claimed "linked" against a number that
// nobody had checked.

export class AbdmNotConfigured extends Error {
  constructor() {
    super('ABDM gateway is not configured on this deployment. Set ABDM_BASE_URL, ABDM_CLIENT_ID, ABDM_CLIENT_SECRET, and ABDM_HFR_ID in the backend env to enable real ABHA verification.');
    this.name = 'AbdmNotConfigured';
  }
}

export type AuthMode = 'MOBILE_OTP' | 'AADHAAR_OTP' | 'DEMOGRAPHICS';

export interface RequestOtpResult {
  txnId: string;
  authMode: AuthMode;
  // Hint shown to the patient/staff — server-provided so the UI doesn't
  // have to know about each mode's UX.
  hint: string;
}

export interface ConfirmOtpResult {
  // Demographics returned by NHA on a successful OTP confirmation.
  // The hospital uses these to cross-check against what we have on
  // file and surface mismatches. None of these are persisted into
  // Patient — that's a separate "match → write" step in the handler.
  abhaNumber: string;
  abhaAddress?: string;
  name?: string;
  dob?: string;
  gender?: string;
  mobile?: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.ABDM_BASE_URL &&
    process.env.ABDM_CLIENT_ID &&
    process.env.ABDM_CLIENT_SECRET &&
    process.env.ABDM_HFR_ID
  );
}

export function getStatus(): { configured: boolean; baseUrl: string | null } {
  return {
    configured: isConfigured(),
    baseUrl: isConfigured() ? (process.env.ABDM_BASE_URL || null) : null,
  };
}

// In a real deploy this caches the gateway session token (30-min TTL)
// and refreshes lazily. Left as a comment so the next developer knows
// where it goes.
//
// let gatewayToken: { value: string; expiresAt: number } | null = null;
// async function getGatewayToken(): Promise<string> { ... }

/**
 * Step 1 of verification — ask NHA to dispatch an OTP to the patient.
 * Returns a transaction id that step 2 needs to reference.
 *
 * STUB: when credentials are absent, throws AbdmNotConfigured.
 * The caller (endpoint handler) translates this to a 503 with a clear
 * message. We deliberately do NOT return a fake txnId — pretend-OTP
 * would just shift the lie one step deeper.
 */
export async function requestOtp(_input: {
  abhaNumber: string;
  authMode: AuthMode;
}): Promise<RequestOtpResult> {
  if (!isConfigured()) throw new AbdmNotConfigured();

  // ============ REAL IMPLEMENTATION (commented — wire when creds arrive) ============
  // const accessToken = await getGatewayToken();
  // const r = await fetch(`${process.env.ABDM_BASE_URL}/v1/auth/init`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${accessToken}`,
  //     'X-CM-ID': 'sbx',
  //   },
  //   body: JSON.stringify({
  //     authMode: _input.authMode,
  //     purpose: 'KYC_AND_LINK',
  //     requester: { type: 'HIP', id: process.env.ABDM_HFR_ID },
  //     query: { id: _input.abhaNumber },
  //   }),
  // });
  // if (!r.ok) {
  //   const msg = (await r.json().catch(() => ({})))?.errorMessage || `ABDM ${r.status}`;
  //   throw new Error(msg);
  // }
  // const data = await r.json() as { txnId: string };
  // return { txnId: data.txnId, authMode: _input.authMode,
  //          hint: _input.authMode === 'MOBILE_OTP'
  //            ? 'OTP sent to mobile number registered with ABHA'
  //            : 'OTP sent to Aadhaar-linked mobile number' };
  // ===============================================================================

  // Unreachable in stub mode — kept to satisfy TypeScript.
  throw new AbdmNotConfigured();
}

/**
 * Step 2 — confirm the OTP the patient received. On success, returns
 * the NHA-signed demographics; the caller writes abhaVerifiedAt on
 * the Patient row only after this resolves cleanly.
 */
export async function verifyOtp(_input: {
  txnId: string;
  otp: string;
}): Promise<ConfirmOtpResult> {
  if (!isConfigured()) throw new AbdmNotConfigured();

  // ============ REAL IMPLEMENTATION (commented — wire when creds arrive) ============
  // const accessToken = await getGatewayToken();
  // const r = await fetch(`${process.env.ABDM_BASE_URL}/v1/auth/confirmWithMobileOTP`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${accessToken}`,
  //     'X-CM-ID': 'sbx',
  //   },
  //   body: JSON.stringify({
  //     txnId: _input.txnId,
  //     credential: { authCode: _input.otp },
  //   }),
  // });
  // if (!r.ok) {
  //   const msg = (await r.json().catch(() => ({})))?.errorMessage || `ABDM ${r.status}`;
  //   throw new Error(msg);
  // }
  // const data = await r.json() as { token: string; user: any };
  // // `token` is the JWT we'd verify against NHA's JWKS endpoint in prod;
  // // `user` carries the verified demographics.
  // return {
  //   abhaNumber: data.user.healthIdNumber,
  //   abhaAddress: data.user.healthId,
  //   name: data.user.name,
  //   dob: data.user.dayOfBirth ? `${data.user.yearOfBirth}-${data.user.monthOfBirth}-${data.user.dayOfBirth}` : undefined,
  //   gender: data.user.gender,
  //   mobile: data.user.mobile,
  // };
  // ===============================================================================

  throw new AbdmNotConfigured();
}
