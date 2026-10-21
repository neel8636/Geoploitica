"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

/*
  A compact "sign in first" line for actions that cost money to run (building a report).
  The free account keeps the AI budget for people who use it; signing in brings them back here.
*/
export default function SignInGate({ what }: { what: string }) {
  const a = useAuth();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const here = typeof window === "undefined" ? "" : window.location.pathname.replace(base, "") + window.location.search + window.location.hash;
  const next = here ? `&next=${encodeURIComponent(here)}` : "";
  if (a.loading) return <p className="text-sm text-ink-3">Checking your account…</p>;
  return (
    <div className="rounded-md border border-line bg-paper-2 px-3 py-2.5 text-sm">
      <p className="font-medium">A free account is needed to {what}.</p>
      <p className="mt-1 text-ink-2">Reports are written by AI for each request, so we keep them for signed-in readers.</p>
      <p className="mt-2 flex flex-wrap gap-2">
        <Link href={`/join?mode=signup${next}`} className="inline-flex items-center rounded-sm bg-teal px-3 py-1.5 font-semibold text-paper no-underline hover:opacity-90">Create a free account</Link>
        <Link href={`/join?mode=signin${next}`} className="inline-flex items-center rounded-sm border border-line px-3 py-1.5 no-underline hover:border-ink">Sign in</Link>
      </p>
    </div>
  );
}
