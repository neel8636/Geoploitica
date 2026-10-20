"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

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
