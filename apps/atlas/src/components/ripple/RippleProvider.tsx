"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RippleCard } from "@/content/ripples";
import RipplePostcard from "@/components/ripple/RipplePostcard";

/*
  Click any event, anywhere, and its ripple opens as a postcard over the page. The cards come
  from /ripples.json (rebuilt every hour), fetched once on first use.
*/
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface RippleCtx {
  open: (id: string) => void;
  close: () => void;
}

const Ctx = createContext<RippleCtx | null>(null);

export function useRipple(): RippleCtx | null {
  return useContext(Ctx);
}

let cardsP: Promise<Record<string, RippleCard>> | null = null;
export function loadRipples(): Promise<Record<string, RippleCard>> {
  if (!cardsP) {
    cardsP = fetch(`${BASE}/ripples.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .catch((err) => {
        cardsP = null; // let a later click retry
        throw err;
      });
  }
  return cardsP;
}

export default function RippleProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const [cards, setCards] = useState<Record<string, RippleCard> | null>(null);
  const [failed, setFailed] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((next: string) => {
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement | null;
    setId(next);
    setFailed(false);
    loadRipples().then(setCards).catch(() => setFailed(true));
  }, []);

  const close = useCallback(() => {
    setId(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    el?.focus?.();
  }, []);

  // the back button closes the postcard rather than leaving the page (one history entry per
  // opening, however many cards are followed inside it)
  const isOpen = id !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onPop = () => close();
    window.history.pushState({ ripple: true }, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOpen, close]);

  const closeAndUnwind = useCallback(() => {
    if (window.history.state?.ripple) window.history.back();
    else close();
  }, [close]);

  return (
    <Ctx.Provider value={{ open, close: closeAndUnwind }}>
      {children}
      {id ? <RipplePostcard key={id} id={id} card={cards?.[id]} failed={failed} onClose={closeAndUnwind} onLeave={close} onOpen={(n) => setId(n)} /> : null}
    </Ctx.Provider>
  );
}
