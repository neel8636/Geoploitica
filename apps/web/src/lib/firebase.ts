"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";

/*
  Firebase for reader accounts: Auth for sign-up and sign-in, Firestore for a small profile
  per reader. The web config is public by design (it identifies the project; security comes
  from Auth and the Firestore rules in /firebase), so it is supplied at build time through
  NEXT_PUBLIC_ variables. With no config the site runs open, which is how local development
  works.
*/
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let app: FirebaseApp | null = null;

function firebaseApp(): FirebaseApp {
  if (!firebaseEnabled) throw new Error("Firebase is not configured");
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function auth(): Auth {
  return getAuth(firebaseApp());
}

export function db(): Firestore {
  return getFirestore(firebaseApp());
}

// Google Analytics through Firebase: page views and sign-ups, so a campaign can be measured.
// Loads only after the reader accepts in the consent banner (choice kept in this browser), and
// only when a measurement ID was built in and the browser supports it.
export const analyticsConfigured = firebaseEnabled && Boolean(config.measurementId);
export const CONSENT_KEY = "geopolitica.analyticsConsent"; // "granted" | "denied"
export const CONSENT_EVENT = "geopolitica:consent";

export function consent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsentChoice(v: "granted" | "denied"): void {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {}
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

let analyticsP: Promise<Analytics | null> | null = null;

function analytics(): Promise<Analytics | null> {
  if (!analyticsConfigured || typeof window === "undefined" || consent() !== "granted") return Promise.resolve(null);
  if (!analyticsP) analyticsP = isSupported().then((ok) => (ok ? getAnalytics(firebaseApp()) : null)).catch(() => null);
  return analyticsP;
}

export function track(name: string, params: Record<string, string | number> = {}): void {
  analytics().then((a) => {
    if (a) logEvent(a, name, params);
  }).catch(() => {});
}
