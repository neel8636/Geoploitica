"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth, type Interest } from "@/components/auth/AuthProvider";

/*
  The sign-up wall. Readers who are signed in (with a complete profile) see the Atlas; everyone
  else sees one screen to create a free account or sign in. Google sign-ins get a single extra
  step for country and interest, which the email form asks up front.
*/

const INTERESTS: { value: Interest; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "My work touches trade, policy or supply chains" },
  { value: "educator", label: "Teacher or educator" },
  { value: "journalist", label: "Journalist or researcher" },
  { value: "curious", label: "Just curious about the world" },
];

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "There is already an account with this email. Sign in instead.",
  "auth/invalid-email": "That email address does not look right.",
  "auth/weak-password": "Use at least 8 characters for the password.",
  "auth/invalid-credential": "Email or password is wrong.",
  "auth/wrong-password": "Email or password is wrong.",
  "auth/user-not-found": "No account with this email. Create one below.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before signing in.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/operation-not-allowed": "Sign-up is being switched on. Please try again in a few minutes.",
  "auth/configuration-not-found": "Sign-up is being switched on. Please try again in a few minutes.",
  "auth/unauthorized-domain": "This site is not yet allowed to use Google sign-in. Use email for now.",
};

function friendly(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

const input = "w-full rounded-sm border border-line bg-paper px-3 py-2 text-[15px] focus:border-teal focus:outline-none";
const label = "block text-sm font-medium";

export default function AuthGate({ children }: { children: ReactNode }) {
  const a = useAuth();
  if (!a.enabled) return <>{children}</>;
  if (a.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-2" aria-busy="true">
        Opening the atlas…
      </div>
    );
  }
  if (!a.user) return <Welcome />;
  if (!a.profileComplete) return <ProfileStep />;
  return <>{children}</>;
}

function Welcome() {
  const a = useAuth();
  const [mode, setMode] = useState<"signup" | "signin" | "reset">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [interest, setInterest] = useState<Interest | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setError("");
    setNote("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw { code: "auth/weak-password" };
        await a.signUp({ name, email, password, country, interest });
      } else if (mode === "signin") {
        await a.signIn(email, password);
      } else {
        await a.resetPassword(email);
        setNote("If there is an account for that email, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      await a.signInWithGoogle();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <section>
        <p className="signpost">Free, for anyone, anywhere</p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.08] sm:text-5xl">Learn how the world&apos;s events connect.</h1>
        <p className="prose-dossier mt-4 text-ink-2">
          Geopolitica Atlas puts today&apos;s world events on one map, draws the lines between them, and explains each one in
          layers: a 30-second card, a 5-minute brief, and a deep dive into causes, who wins and loses, and what comes next.
          Every claim links to its source.
        </p>
        <ul className="mt-6 space-y-3 text-[15px]">
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" /> A live map of the events that matter, refreshed every morning.</li>
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber" /> Why each event happened and where it leads, written to be read in minutes.</li>
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full border border-ink" /> The connections: how a riot in one country moves prices, votes and policy in another.</li>
        </ul>
        <p className="mt-6 text-sm text-ink-3">
          An account is free. We ask for your country and what brings you here so we can see who the atlas serves; we never
          sell or share it.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-paper-2 p-5" aria-label="Account">
        <div className="flex border-b border-line" role="tablist">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(""); setNote(""); }}
              className={`flex-1 border-b-2 pb-2 text-sm ${mode === m || (m === "signin" && mode === "reset") ? "border-teal font-medium" : "border-transparent text-ink-2"}`}
            >
              {m === "signup" ? "Create a free account" : "Sign in"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-line bg-paper px-3 py-2 text-[15px] hover:border-ink disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
          </svg>
          Continue with Google
        </button>
        <p className="my-4 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" /></p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <div>
              <label className={label} htmlFor="name">Your name</label>
              <input id="name" className={input} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
          ) : null}
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          {mode !== "reset" ? (
            <div>
              <label className={label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" ? <p className="mt-1 text-xs text-ink-3">At least 8 characters.</p> : null}
            </div>
          ) : null}
          {mode === "signup" ? (
            <>
              <div>
                <label className={label} htmlFor="country">Country</label>
                <input id="country" className={input} value={country} onChange={(e) => setCountry(e.target.value)} required autoComplete="country-name" placeholder="Where you are reading from" />
              </div>
              <div>
                <label className={label} htmlFor="interest">What brings you here? <span className="font-normal text-ink-3">(optional)</span></label>
                <select id="interest" className={input} value={interest} onChange={(e) => setInterest(e.target.value as Interest | "")}>
                  <option value="">Choose one</option>
                  {INTERESTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm text-red" role="alert">{error}</p> : null}
          {note ? <p className="text-sm text-green" role="status">{note}</p> : null}

          <button type="submit" disabled={busy} className="w-full rounded-sm bg-teal px-4 py-2 text-paper hover:opacity-90 disabled:opacity-60">
            {busy ? "One moment…" : mode === "signup" ? "Create my free account" : mode === "signin" ? "Sign in" : "Send reset link"}
          </button>
        </form>

        <p className="mt-3 text-center text-sm text-ink-2">
          {mode === "signin" ? (
            <button type="button" className="underline" onClick={() => { setMode("reset"); setError(""); }}>Forgot your password?</button>
          ) : mode === "reset" ? (
            <button type="button" className="underline" onClick={() => setMode("signin")}>Back to sign in</button>
          ) : (
            <>Already have an account? <button type="button" className="underline" onClick={() => setMode("signin")}>Sign in</button></>
          )}
        </p>
      </section>
    </div>
  );
}

function ProfileStep() {
  const a = useAuth();
  const [country, setCountry] = useState(a.profile?.country === "?" ? "" : a.profile?.country ?? "");
  const [interest, setInterest] = useState<Interest | "">(a.profile?.interest ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      await a.completeProfile({ country, interest });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="signpost">One last step</p>
      <h1 className="mt-2 text-3xl">Welcome{a.user?.displayName ? `, ${a.user.displayName.split(" ")[0]}` : ""}.</h1>
      <p className="mt-2 text-ink-2">Two quick questions, then the atlas is yours.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className={label} htmlFor="p-country">Country</label>
          <input id="p-country" className={input} value={country} onChange={(e) => setCountry(e.target.value)} required autoComplete="country-name" />
        </div>
        <div>
          <label className={label} htmlFor="p-interest">What brings you here? <span className="font-normal text-ink-3">(optional)</span></label>
          <select id="p-interest" className={input} value={interest} onChange={(e) => setInterest(e.target.value as Interest | "")}>
            <option value="">Choose one</option>
            {INTERESTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        {error ? <p className="text-sm text-red" role="alert">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded-sm bg-teal px-4 py-2 text-paper hover:opacity-90 disabled:opacity-60">
          {busy ? "Saving…" : "Open the atlas"}
        </button>
        <button type="button" onClick={() => a.signOut()} className="w-full text-sm text-ink-2 underline">Use a different account</button>
      </form>
    </div>
  );
}

export function AccountMenu() {
  const a = useAuth();
  if (!a.enabled || !a.user) return null;
  const first = (a.user.displayName || a.user.email || "").split(/[ @]/)[0];
  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-ink-2" title={a.user.email ?? ""}>{first}</span>
      <button type="button" onClick={() => a.signOut()} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">
        Sign out
      </button>
    </span>
  );
}

export function GatedNav({ children }: { children: ReactNode }) {
  const a = useAuth();
  if (a.enabled && (a.loading || !a.user || !a.profileComplete)) return null;
  return <>{children}</>;
}
