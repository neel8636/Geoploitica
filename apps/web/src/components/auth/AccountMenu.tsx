"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AccountMenu() {
  const a = useAuth();
  if (!a.enabled || a.loading) return null;
  if (!a.user) {
    return (
      <span className="flex items-center gap-3 text-sm">
        <Link href="/join?mode=signin" className="no-underline hover:underline">Sign in</Link>
        <Link href="/join" className="rounded-full bg-teal px-3 py-1 text-paper no-underline hover:opacity-90">Join free</Link>
      </span>
    );
  }
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
