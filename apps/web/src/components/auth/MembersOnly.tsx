"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileStep, SignUpCard } from "@/components/auth/AccountForms";

/*
  The sign-up line. Everything above it (the map, every event, the 30-second card, the ripple,
  the connections and the sources) is open to anyone. What sits inside <MembersOnly> needs a
  free account: the full report's deeper layers and on-demand report generation. Signing up
  happens right here, and the content appears in place once it is done.

  This is a reading wall, not access control: the site is static and its source is public.
*/
export default function MembersOnly({
  children,
  title = "Keep reading with a free account",
  points = [],
  anchors = [],
  compact = false,
}: {
  children: ReactNode;
  title?: string;
  points?: string[];
  anchors?: string[]; // ids inside the locked content, kept so in-page links still land here
  compact?: boolean;
}) {
  const a = useAuth();
  if (!a.enabled || (a.user && a.profileComplete)) return <>{children}</>;

  const marks = anchors.map((id) => <span key={id} id={id} className="block scroll-mt-24" aria-hidden />);

  if (a.loading) {
    return <div className="py-10 text-center text-ink-2" aria-busy="true">{marks}Checking your account…</div>;
  }

  if (a.user && !a.profileComplete) {
    return <div className="py-8">{marks}<ProfileStep inline /></div>;
  }

  if (compact) {
    return (
      <p className="rounded-sm border border-line bg-paper-2 px-3 py-2 text-sm">
        {marks}
        <Link href="/join" className="font-medium underline">Create a free account</Link> or{" "}
        <Link href="/join?mode=signin" className="underline">sign in</Link> to {title}.
      </p>
    );
  }

  return (
    <section className="mt-14 rounded-lg border-2 border-teal/40 bg-paper p-5 sm:p-8" aria-label="Free account">
      {marks}
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div>
          <p className="signpost">Free, for anyone, anywhere</p>
          <h2 className="mt-2 text-3xl">{title}</h2>
          {points.length ? (
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {points.map((p) => (
                <li key={p} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" />{p}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-5 text-sm text-ink-3">
            No cost and no ads. We ask for your country and what brings you here so we know who Geopolitica serves; we never sell or
            share it.
          </p>
        </div>
        <SignUpCard />
      </div>
    </section>
  );
}
