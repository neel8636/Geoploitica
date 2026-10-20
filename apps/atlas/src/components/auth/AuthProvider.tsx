"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  deleteUser,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { auth, db, firebaseEnabled, track } from "@/lib/firebase";

/*
  Reader accounts. One context for the whole Atlas: who is signed in, whether their profile
  is complete, and the actions the sign-in screen needs. Profiles live in Firestore at
  users/{uid}; the rules in /firebase/firestore.rules let each reader touch only their own.
*/

export type Interest = "student" | "professional" | "educator" | "journalist" | "curious";

export interface Profile {
  name: string;
  email: string;
  country: string;
  interest: Interest | "";
  provider: "password" | "google";
  source?: Source;
}

// Where a reader first arrived from (first visit in this browser), saved with their profile so
// sign-ups can be counted by channel: ?utm_source=reddit, ?ref=linkedin, or the referring site.
export interface Source {
  from: string;
  medium: string;
  campaign: string;
  landing: string;
}

const SOURCE_KEY = "geopolitica.firstTouch";

function clip(v: string | null | undefined, n = 100): string {
  return (v ?? "").slice(0, n);
}

function rememberFirstTouch(): void {
  try {
    if (localStorage.getItem(SOURCE_KEY)) return;
    const q = new URLSearchParams(location.search);
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {}
    if (ref === location.hostname) ref = "";
    const s: Source = {
      from: clip(q.get("utm_source") || q.get("ref") || ref || "direct", 60),
      medium: clip(q.get("utm_medium"), 60),
      campaign: clip(q.get("utm_campaign"), 60),
      landing: clip(location.pathname, 100),
    };
    localStorage.setItem(SOURCE_KEY, JSON.stringify(s));
  } catch {}
}

function firstTouch(): Source {
  try {
    const s = JSON.parse(localStorage.getItem(SOURCE_KEY) || "null") as Source | null;
    if (s && typeof s.from === "string") return { from: clip(s.from, 60), medium: clip(s.medium, 60), campaign: clip(s.campaign, 60), landing: clip(s.landing) };
  } catch {}
  return { from: "unknown", medium: "", campaign: "", landing: "" };
}

interface AuthState {
  enabled: boolean; // false when no Firebase config was built in: the site runs open
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  profileComplete: boolean;
  signUp: (p: { name: string; email: string; password: string; country: string; interest: Interest | "" }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeProfile: (p: { country: string; interest: Interest | "" }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

const SESSION_KEY = "geopolitica.lastSeenWritten";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(firebaseEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    rememberFirstTouch();
  }, []);

  // one page view per route, including client-side navigation
  useEffect(() => {
    track("page_view", { page_path: pathname, page_location: location.href, page_title: document.title });
  }, [pathname]);

  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db(), "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data() as Profile);
          // a visit counter that costs one write per browser session
          let written = false;
          try {
            written = sessionStorage.getItem(SESSION_KEY) === u.uid;
          } catch {}
          if (!written) {
            updateDoc(ref, { lastSeen: serverTimestamp() }).catch(() => {});
            try {
              sessionStorage.setItem(SESSION_KEY, u.uid);
            } catch {}
          }
        } else {
          setProfile(null);
        }
      } catch {
        // Firestore unreachable or rules not deployed yet: let the reader in rather than lock them out
        setProfile({ name: u.displayName ?? "", email: u.email ?? "", country: "?", interest: "", provider: "password" });
      }
      setLoading(false);
    });
  }, []);

  async function writeProfile(u: User, profileIn: Profile, isNew: boolean) {
    let p = profileIn;
    const ref = doc(db(), "users", u.uid);
    if (isNew) {
      p = { ...p, source: firstTouch() };
      try {
        await setDoc(ref, { ...p, createdAt: serverTimestamp(), lastSeen: serverTimestamp() });
      } catch (err) {
        // older published rules do not know the source field yet: save the profile without it
        if ((err as { code?: string }).code !== "permission-denied") throw err;
        const { source: _drop, ...rest } = p;
        void _drop;
        p = rest;
        await setDoc(ref, { ...p, createdAt: serverTimestamp(), lastSeen: serverTimestamp() });
      }
      track("sign_up", { method: p.provider, source: p.source?.from ?? "" });
    }
    else await setDoc(ref, { ...p, lastSeen: serverTimestamp() }, { merge: true });
    setProfile(p);
  }

  const value: AuthState = {
    enabled: firebaseEnabled,
    loading,
    user,
    profile,
    profileComplete: Boolean(profile && profile.country),
    async signUp({ name, email, password, country, interest }) {
      const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      sendEmailVerification(cred.user).catch(() => {});
      await writeProfile(cred.user, { name: name.trim(), email: email.trim(), country: country.trim(), interest, provider: "password" }, true);
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth(), email.trim(), password);
      track("login", { method: "password" });
    },
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth(), provider);
      } catch (err) {
        const code = (err as { code?: string }).code ?? "";
        if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
          await signInWithRedirect(auth(), provider);
          return;
        }
        throw err;
      }
    },
    async completeProfile({ country, interest }) {
      if (!user) return;
      await writeProfile(
        user,
        { name: user.displayName ?? "", email: user.email ?? "", country: country.trim(), interest, provider: "google" },
        !profile,
      );
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth(), email.trim());
    },
    async deleteAccount() {
      if (!user) return;
      // the profile first (needs the sign-in), then the account itself; Firebase asks for a
      // fresh sign-in if the last one is old (auth/requires-recent-login)
      await deleteDoc(doc(db(), "users", user.uid)).catch(() => {});
      await deleteUser(user);
      setProfile(null);
      try {
        localStorage.removeItem(SOURCE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    },
    async signOut() {
      await fbSignOut(auth());
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
