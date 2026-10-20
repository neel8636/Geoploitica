import { createRemoteJWKSet, jwtVerify } from "jose";

/*
  Signed-in Atlas readers. The Atlas sends the reader's Firebase ID token as
  `Authorization: Bearer <token>`; it is verified here against Google's published keys for the
  Firebase project, so only a real, current sign-in passes. Each reader gets a small daily
  allowance of generated reports (the Claude API is paid per call).

    FIREBASE_PROJECT_ID   default geopolitica-941b0
    READER_REPORTS_PER_DAY  default 3
*/
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "geopolitica-941b0";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export interface Reader {
  uid: string;
  email: string;
}

export async function verifyReader(authorization: string | null): Promise<Reader | null> {
  const m = /^Bearer (.+)$/.exec(authorization ?? "");
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT}`,
      audience: PROJECT,
      algorithms: ["RS256"],
    });
    if (!payload.sub) return null;
    return { uid: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

// In memory: resets when the server restarts, which on this plan is roughly daily. Good enough
// to stop one account from running up the bill; not an accounting system.
const used = new Map<string, { day: string; n: number }>();

export function perDay(): number {
  const n = Number(process.env.READER_REPORTS_PER_DAY ?? "3");
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

export function remaining(uid: string): number {
  const day = new Date().toISOString().slice(0, 10);
  const u = used.get(uid);
  return perDay() - (u && u.day === day ? u.n : 0);
}

export function spend(uid: string): void {
  const day = new Date().toISOString().slice(0, 10);
  const u = used.get(uid);
  used.set(uid, { day, n: u && u.day === day ? u.n + 1 : 1 });
}
