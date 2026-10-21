"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, track } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

type Freq = "off" | "daily" | "weekly";

// "Email me what changed": off, daily or weekly, saved on the reader's profile; the digest
// workflow reads it each morning.
export default function DigestChoice() {
  const a = useAuth();
  const [freq, setFreq] = useState<Freq | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!a.user) return;
    getDoc(doc(db(), "users", a.user.uid))
      .then((s) => setFreq(((s.data()?.digest as Freq) ?? "off")))
      .catch(() => setFreq("off"));
  }, [a.user]);

  if (!a.enabled) return null;

  async function choose(v: Freq) {
    if (!a.user) return;
    const before = freq;
    setFreq(v);
    setNote("");
    try {
      await setDoc(doc(db(), "users", a.user.uid), { digest: v }, { merge: true });
      track("digest", { frequency: v });
      setNote(v === "off" ? "Digest off." : `Saved. Your ${v} digest goes to ${a.user.email} around 7 AM Eastern.`);
    } catch {
      setFreq(before);
      setNote("Couldn't save that just now. Please try again in a moment.");
    }
  }

  return (
    <section id="digest" className="mt-6 scroll-mt-24 rounded-lg border border-line bg-paper-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium">
          <Mail size={18} className="text-teal" aria-hidden /> Email me what changed
        </p>
        {a.user ? (
          <div className="inline-flex rounded-full border border-line bg-paper p-0.5 text-sm" role="radiogroup" aria-label="Digest frequency">
            {(["off", "daily", "weekly"] as Freq[]).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={freq === v}
                onClick={() => choose(v)}
                className={`rounded-full px-3 py-1 capitalize ${freq === v ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-sm text-ink-2">
            <Link href="/join" className="underline">Join free</Link> to get it by email.
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        {note || "One short email with what changed on what you follow, the ripples heading its way, and today's ripples. Nothing new, no email."}
      </p>
    </section>
  );
}
