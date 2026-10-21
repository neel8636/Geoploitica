"use client";

import { useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { FuelEvent } from "@/content/fueling";
import { FuelCard } from "@/components/live/Live";

// "Find what's fueling this" in the enterprise edition: same endpoint as the Atlas, unlocked by
// the report passcode here (the Atlas uses reader sign-in).
export default function FuelRun({ eventId, hasItems }: { eventId: string; hasItems: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<FuelEvent[] | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/fuel", { method: "POST", headers: { "content-type": "application/json", ...(code ? { "x-passcode": code } : {}) }, body: JSON.stringify({ eventId }) });
      const j = (await res.json()) as { items?: FuelEvent[]; error?: string };
      if (!res.ok || !j.items?.length) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
      setItems(j.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {items ? (
        <>
          <p className="text-sm font-medium">Mapped just now from the latest local news</p>
          <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((f) => <FuelCard key={f.id} f={f} />)}</ul>
        </>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Passcode" aria-label="Passcode" className="rounded-sm border border-line bg-paper px-2 py-1.5" />
        <button type="button" onClick={run} disabled={busy || !code} className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 hover:border-ink disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Flame size={15} className="text-amber" aria-hidden />}
          {busy ? "Reading the latest local news…" : hasItems || items ? "Map it again from the latest news" : "Find what's fueling this"}
        </button>
        {error ? <span className="text-red">{error}</span> : null}
      </div>
    </div>
  );
}
