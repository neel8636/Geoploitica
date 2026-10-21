"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, analyticsConfigured, consent, setConsentChoice, track } from "@/lib/firebase";

/*
  Asks once whether visits may be counted with Google Analytics. Nothing loads until the reader
  accepts; "No thanks" is remembered too. The choice can be changed from the privacy section of
  the guide (<ConsentChoice />).
*/
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!analyticsConfigured) return;
    const sync = () => setOpen(consent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!open) return null;

  function choose(v: "granted" | "denied") {
    setConsentChoice(v);
    if (v === "granted") track("page_view", { page_path: location.pathname, page_location: location.href, page_title: document.title });
  }

  return (
    <div role="dialog" aria-label="Analytics choice" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-lg border border-line bg-paper p-4 text-[15px] shadow-lg sm:inset-x-6">
      <p>
        May we count your visit with Google Analytics? It tells us which pages help readers. No ads, and nothing is sold.{" "}
        <Link href="/guide#privacy" className="underline">Privacy</Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => choose("granted")} className="rounded-sm bg-teal px-4 py-1.5 text-paper hover:opacity-90">Accept</button>
        <button type="button" onClick={() => choose("denied")} className="rounded-sm border border-line px-4 py-1.5 hover:border-ink">No thanks</button>
      </div>
    </div>
  );
}

export function ConsentChoice() {
  const [v, setV] = useState<"granted" | "denied" | null>(null);
  useEffect(() => {
    const sync = () => setV(consent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  if (!analyticsConfigured) return <span>Analytics are not switched on for this copy of the site.</span>;
  return (
    <span>
      Your choice: <span className="text-ink">{v === "granted" ? "visits counted" : v === "denied" ? "not counted" : "not made yet"}</span>.{" "}
      <button type="button" className="underline" onClick={() => setConsentChoice(v === "granted" ? "denied" : "granted")}>
        {v === "granted" ? "Stop counting my visits" : "Allow counting my visits"}
      </button>
      {v === "granted" ? " (takes full effect on the next page load)." : "."}
    </span>
  );
}
