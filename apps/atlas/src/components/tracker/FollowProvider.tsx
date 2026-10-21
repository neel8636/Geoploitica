"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/firebase";
import { loadRipples } from "@/components/ripple/RippleProvider";
import type { RippleCard } from "@/content/ripples";

/*
  The tracker's memory: what a reader follows (events, and drivers as "driver:<id>") and when
  they last looked at each. Kept in this browser; for a signed-in reader also in their profile
  (users/{uid}.tracker), merged on sign-in, so it follows them across devices.
*/
const KEY = "geopolitica.tracker.v1";
const MAX = 60;

export interface TrackerState {
  follows: string[];
  seen: Record<string, string>; // id -> ISO time last looked at
}

interface Ctx {
  state: TrackerState;
  isFollowing: (id: string) => boolean;
  toggle: (id: string) => void;
  markSeen: (ids: string[]) => void;
  cards: Record<string, RippleCard> | null; // loaded once anything is followed
  newCount: (id: string) => number;
  totalNew: number;
}

const C = createContext<Ctx | null>(null);
export const useTracker = () => useContext(C);

function read(): TrackerState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null") as TrackerState | null;
    if (v && Array.isArray(v.follows)) return { follows: v.follows.slice(0, MAX), seen: v.seen ?? {} };
  } catch {}
  return { follows: [], seen: {} };
}

export default function FollowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<TrackerState>({ follows: [], seen: {} });
  const [cards, setCards] = useState<Record<string, RippleCard> | null>(null);
  const loaded = useRef(false);

  // this browser's copy, once mounted (never during the server render)
  useEffect(() => {
    const local = read();
    loaded.current = true;
    // after the first paint, so the server render and the first client render agree
    if (local.follows.length || Object.keys(local.seen).length) queueMicrotask(() => setState(local));
  }, []);

  // signed in: merge the account's copy in, once per sign-in
  useEffect(() => {
    if (!user) return;
    let off = false;
    getDoc(doc(db(), "users", user.uid))
      .then((snap) => {
        const remote = (snap.data()?.tracker ?? null) as TrackerState | null;
        if (off || !remote) return;
        setState((cur) => ({
          follows: Array.from(new Set([...cur.follows, ...(remote.follows ?? [])])).slice(0, MAX),
          seen: { ...(remote.seen ?? {}), ...cur.seen },
        }));
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [user]);

  // save: this browser always; the account when signed in (quietly skipped if rules refuse)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
    if (!user) return;
    const t = window.setTimeout(() => {
      const seen = Object.fromEntries(Object.entries(state.seen).filter(([k]) => state.follows.includes(k)).slice(0, 80));
      setDoc(doc(db(), "users", user.uid), { tracker: { follows: state.follows, seen } }, { merge: true }).catch(() => {});
    }, 800);
    return () => window.clearTimeout(t);
  }, [state, user]);

  // the cards, as soon as there is something to track
  useEffect(() => {
    if (!state.follows.length || cards) return;
    loadRipples().then(setCards).catch(() => {});
  }, [state.follows.length, cards]);

  const toggle = useCallback((id: string) => {
    setState((cur) => {
      const on = cur.follows.includes(id);
      track(on ? "unfollow" : "follow", { item_id: id });
      return on
        ? { follows: cur.follows.filter((x) => x !== id), seen: cur.seen }
        : { follows: [id, ...cur.follows].slice(0, MAX), seen: { ...cur.seen, [id]: new Date().toISOString() } };
    });
  }, []);

  const markSeen = useCallback((ids: string[]) => {
    const now = new Date().toISOString();
    setState((cur) => ({ ...cur, seen: { ...cur.seen, ...Object.fromEntries(ids.map((i) => [i, now])) } }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const newCount = (id: string) => {
      if (!cards || id.startsWith("driver:")) return 0;
      const c = cards[id];
      const since = state.seen[id] ?? "";
      if (!c) return 0;
      return c.recent.filter((h) => h.published > since).length + (c.update && c.update.at > since ? 1 : 0);
    };
    return {
      state,
      isFollowing: (id) => state.follows.includes(id),
      toggle,
      markSeen,
      cards,
      newCount,
      totalNew: state.follows.reduce((n, id) => n + newCount(id), 0),
    };
  }, [state, cards, toggle, markSeen]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
