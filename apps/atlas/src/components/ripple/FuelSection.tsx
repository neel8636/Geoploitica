"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, Flame, Loader2, MapPin } from "lucide-react";
import type { FuelEvent, FuelSet } from "@/content/fueling";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadRipples } from "@/components/ripple/RippleProvider";
import { timeAgo } from "@/components/ripple/Pulse";
import { AspectBadge, FamilyKey, familyColor, familyOf } from "@/components/ripple/Aspect";
import { track } from "@/lib/firebase";

/*
  What's fueling it: the small local events feeding this one, each with where and when, how it
  feeds in, and the headlines that report it. Mapped by the pipeline for active events; any
  signed-in reader can ask Claude to map it again from the latest local news.
*/
const API = process.env.NEXT_PUBLIC_REPORT_API ?? "";

export default function FuelSection({ eventId, initial, compact = false }: { eventId: string; initial?: FuelSet; compact?: boolean }) {
  const a = useAuth();
  const [set, setSet] = useState<FuelSet | undefined>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // a reader may have mapped it more recently than the last pipeline run
  useEffect(() => {
    if (!API) return;
    let off = false;
    fetch(`${API}/api/fuel?id=${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<FuelSet>) : null))
      .then((live) => {
        if (!off && live?.items?.length) setSet((cur) => (!cur || live.at > cur.at ? live : cur));
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [eventId]);

  async function run() {
    setBusy(true);
    setError("");
    track("fuel_run", { event_id: eventId });
    try {
      const cards = await loadRipples().catch(() => null);
      const token = a.user ? await a.user.getIdToken() : "";
      const res = await fetch(`${API}/api/fuel`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ eventId, headlines: cards?.[eventId]?.recent ?? [] }),
      });
      const j = (await res.json()) as FuelSet & { ok?: boolean; error?: string };
      if (!res.ok || !j.items?.length) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
      setSet({ at: j.at, by: j.by, items: j.items });
    } catch (err) {
      setError((err as Error).message || "Couldn't reach the server. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  const canRun = Boolean(API) && (!a.enabled || Boolean(a.user));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={compact ? "signpost" : "flex items-center gap-2 text-2xl"}>
          {compact ? null : <Flame size={22} className="text-amber" aria-hidden />} What&apos;s fueling it
        </p>
        {set ? <p className="text-xs text-ink-3">Mapped by Claude from local news {timeAgo(set.at)}</p> : null}
      </div>
      <p className="mt-0.5 text-sm text-ink-2">
        The smaller events in the latest local news that feed this one, and what each moves into it.
      </p>
      <FamilyKey className="mt-1.5" />

      {set?.items.length ? (
        <ul className={`mt-3 grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {set.items.map((f) => (
            <FuelRow key={f.id} f={f} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-3">
          {set ? "No clear inputs in the latest local news: most of it is about this event's effects, not what feeds it." : "Not mapped yet. Events are mapped once their local news picks up."}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {canRun ? (
          <button type="button" onClick={run} disabled={busy} data-spotlight="fuel" className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 hover:border-ink disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Flame size={15} className="text-amber" aria-hidden />}
            {busy ? "Reading the latest local news…" : set ? "Map it again from the latest news" : "Find what's fueling this"}
          </button>
        ) : API ? (
          <span className="text-ink-2">
            <Link href="/join" className="underline">Join free</Link> to ask Claude to map what&apos;s fueling this from the latest local news.
          </span>
        ) : null}
        {error ? <span className="text-red">{error}</span> : null}
      </div>
    </div>
  );
}

function FuelRow({ f }: { f: FuelEvent }) {
  const Icon = f.flow === "both" ? ArrowLeftRight : ArrowRight;
  const aspect = f.aspect ?? "politics";
  return (
    <li className="rounded-lg border border-line border-l-4 p-3" style={{ borderLeftColor: familyColor(familyOf(aspect)) }}>
      <AspectBadge aspect={aspect} />
      <p className="mt-1.5 font-medium leading-snug">{f.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-3">
        <MapPin size={12} aria-hidden /> {f.place} · {f.when === "ongoing" ? "ongoing" : f.when}
      </p>
      <p className="mt-1.5 text-sm text-ink-2">{f.what}</p>
      {f.via ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm">
          <Icon size={15} className="mt-0.5 shrink-0 text-ink-2" aria-label={f.flow === "both" ? "both ways" : "moves into"} />
          <span>
            <span className="text-ink-3">{f.flow === "both" ? "Moves in, and back: " : "Moves in: "}</span>
            <span className="font-medium">{f.via}</span>
          </span>
        </p>
      ) : null}
      <p className="mt-1.5 text-xs text-ink-3">
        {f.sources.slice(0, 2).map((s, i) => (
          <span key={s.url}>
            {i ? " · " : ""}
            <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.publisher}</a>
          </span>
        ))}
      </p>
    </li>
  );
}
