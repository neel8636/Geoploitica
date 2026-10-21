"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileStep, SignUpCard } from "@/components/auth/AccountForms";

export default function JoinView() {
  const a = useAuth();
  const q = useSearchParams();
  const start = q.get("mode") === "signin" ? "signin" : "signup";
  // back to where the reader was (the report they wanted to build or read) once they are in
  const next = q.get("next") ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const router = useRouter();
  const ready = a.enabled && a.user && a.profileComplete;
  useEffect(() => {
    if (ready && safeNext) router.replace(safeNext);
  }, [ready, safeNext, router]);

  if (a.enabled && a.user && a.profileComplete) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl">You&apos;re in.</h1>
        <p className="mt-2 text-ink-2">Every report is open to you now, in full.</p>
        <Link href="/" className="mt-6 inline-block rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">Go to the map</Link>
        <DeleteAccount />
      </div>
    );
  }
  if (a.enabled && a.user) return <ProfileStep />;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <section>
        <p className="signpost">Free, for anyone, anywhere</p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.08] sm:text-5xl">Follow one event to everything it touches.</h1>
        <p className="prose-dossier mt-4 text-ink-2">
          The map, every event, what is fueling it and how it connects are open to everyone. A free account adds the reports: read
          the full layered report on any event, and build a fresh one at the size you need, built around what is fueling it.
        </p>
        <ul className="mt-6 space-y-3 text-[15px]">
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" /> Every report, in full, for every event on the map.</li>
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" /> Build reports yourself: snapshot, standard or deep dive, three a day.</li>
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber" /> Headlines matched to events every hour.</li>
          <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full border border-ink" /> A source behind every claim, and a way to flag anything wrong.</li>
        </ul>
        <p className="mt-6 text-sm text-ink-3">
          {a.enabled ? "No cost and no ads. We never sell or share your details." : "Accounts are not switched on for this copy of the site; everything is open."}
        </p>
      </section>
      {a.enabled ? <SignUpCard start={start} /> : null}
    </div>
  );
}

function DeleteAccount() {
  const a = useAuth();
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function go() {
    setStep("busy");
    try {
      await a.deleteAccount();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setMsg(code === "auth/requires-recent-login" ? "For safety, sign out, sign back in, and try again." : "Could not delete the account. Please try again.");
      setStep("error");
    }
  }
  return (
    <div id="delete" className="mt-12 border-t border-line pt-6 text-sm text-ink-2">
      {step === "idle" ? (
        <button type="button" className="underline" onClick={() => setStep("confirm")}>Delete my account</button>
      ) : step === "confirm" ? (
        <p>
          This removes your account and profile for good.{" "}
          <button type="button" className="font-medium text-red underline" onClick={go}>Yes, delete it</button>{" "}
          <button type="button" className="underline" onClick={() => setStep("idle")}>Cancel</button>
        </p>
      ) : step === "busy" ? (
        <p>Deleting…</p>
      ) : (
        <p className="text-red">{msg}</p>
      )}
    </div>
  );
}
