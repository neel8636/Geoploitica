"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MessageCircleQuestion, Send, X } from "lucide-react";
import { getEvent } from "@/content/events";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadRipples } from "@/components/ripple/RippleProvider";
import { track } from "@/lib/firebase";

/*
  Ask a question while reading. A panel slides in beside whatever you are reading, about one
  event; Claude answers from that event's report, its connections (which way each ripple
  travels, through what, and the driver behind it) and the headlines on the page. Signed-in
  readers only, a few dozen questions a day. Answers stream in as they are written.
*/
const API = process.env.NEXT_PUBLIC_REPORT_API ?? "";

interface Ctx {
  open: (eventId: string, question?: string) => void;
  available: boolean;
}
const C = createContext<Ctx | null>(null);
export const useAsk = () => useContext(C);

const STARTERS = [
  "Explain this simply",
  "Why does this matter to me?",
  "Which way does this ripple, and to whom?",
  "What happens next?",
];

interface Turn {
  q: string;
  a: string;
  done: boolean;
  error?: string;
}

export default function AskProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [first, setFirst] = useState<string | undefined>();
  const open = useCallback((id: string, question?: string) => {
    setEventId(id);
    setFirst(question);
    track("ask_open", { event_id: id });
  }, []);
  return (
    <C.Provider value={{ open, available: Boolean(API) }}>
      {children}
      {eventId ? <AskPanel key={eventId} eventId={eventId} first={first} onClose={() => setEventId(null)} /> : null}
    </C.Provider>
  );
}

export function AskButton({ eventId, compact = false }: { eventId: string; compact?: boolean }) {
  const ask = useAsk();
  if (!ask?.available) return null;
  return (
    <button
      type="button"
      data-spotlight="ask"
      onClick={() => ask.open(eventId)}
      className={`inline-flex items-center gap-1.5 rounded-sm border border-line hover:border-ink ${compact ? "px-2.5 py-1 text-sm" : "px-3 py-2 text-[15px]"}`}
    >
      <MessageCircleQuestion size={compact ? 15 : 17} className="text-teal" aria-hidden /> Ask
    </button>
  );
}

function AskPanel({ eventId, first, onClose }: { eventId: string; first?: string; onClose: () => void }) {
  const a = useAuth();
  const event = getEvent(eventId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [slow, setSlow] = useState(false);
  const busy = turns.some((t) => !t.done);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const signedIn = Boolean(a.user) || !a.enabled;

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;
      setQ("");
      setSlow(false);
      const history = turns.filter((t) => t.done && !t.error).slice(-3).map((t) => ({ q: t.q, a: t.a }));
      setTurns((ts) => [...ts, { q: text, a: "", done: false }]);
      track("ask", { event_id: eventId });
      const timer = window.setTimeout(() => setSlow(true), 5000);
      const patch = (fn: (t: Turn) => Turn) => setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? fn(t) : t)));
      try {
        const cards = await loadRipples().catch(() => null);
        const card = cards?.[eventId];
        const token = a.user ? await a.user.getIdToken() : "";
        const res = await fetch(`${API}/api/ask`, {
          method: "POST",
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            eventId,
            question: text,
            history,
            headlines: card?.recent ?? [],
            update: card?.update?.text ?? "",
          }),
        });
        if (!res.ok || !res.body) {
          let msg = `Something went wrong (${res.status}).`;
          try {
            msg = ((await res.json()) as { error?: string }).error ?? msg;
          } catch {}
          throw new Error(msg);
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          window.clearTimeout(timer);
          setSlow(false);
          const chunk = dec.decode(value, { stream: true });
          patch((t) => ({ ...t, a: t.a + chunk }));
        }
        patch((t) => ({ ...t, done: true }));
      } catch (err) {
        patch((t) => ({ ...t, done: true, error: (err as Error).message || "Couldn't reach the answer server. Try again." }));
      } finally {
        window.clearTimeout(timer);
        setSlow(false);
      }
    },
    [a.user, busy, eventId, turns],
  );

  // a question passed in when the panel opened is asked straight away
  const asked = useRef(false);
  useEffect(() => {
    if (first && signedIn && !asked.current) {
      asked.current = true;
      void send(first);
    }
  }, [first, signedIn, send]);

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(q);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-ink/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Ask about ${event?.title ?? "this event"}`}
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-teal"><MessageCircleQuestion size={16} aria-hidden /> Ask about</p>
            <p className="font-serif text-xl leading-snug">{event?.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-line p-1.5 hover:border-ink" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!signedIn ? (
            <div className="rounded-lg border border-line bg-paper-2 p-4 text-[15px]">
              <p className="font-medium">Ask anything about this event</p>
              <p className="mt-1 text-ink-2">Questions are free with an account. Answers come from the event&apos;s report, its connections and today&apos;s headlines.</p>
              <div className="mt-3 flex gap-2">
                <Link href="/join" onClick={onClose} className="rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">Join free</Link>
                <Link href="/join?mode=signin" onClick={onClose} className="rounded-sm border border-line px-4 py-2 no-underline hover:border-ink">Sign in</Link>
              </div>
            </div>
          ) : !turns.length ? (
            <div>
              <p className="text-sm text-ink-2">Try one of these, or type your own.</p>
              <ul className="mt-3 space-y-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => void send(s)} className="w-full rounded-lg border border-line px-3 py-2 text-left text-[15px] hover:border-ink">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="space-y-5">
              {turns.map((t, i) => (
                <li key={i}>
                  <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-teal-2 px-3 py-2 text-[15px]">{t.q}</p>
                  <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                    {t.error ? <span className="text-red">{t.error}</span> : t.a || <span className="text-ink-3">{slow ? "Waking the answer server, this can take up to a minute the first time…" : "Thinking…"}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div ref={end} />
        </div>

        {signedIn ? (
          <form onSubmit={submit} className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(q);
                  }
                }}
                rows={2}
                maxLength={500}
                placeholder="Ask about this event…"
                className="min-h-[2.75rem] flex-1 resize-none rounded-sm border border-line bg-paper px-3 py-2 text-[15px] focus:border-teal focus:outline-none"
                aria-label="Your question"
              />
              <button type="submit" disabled={busy || !q.trim()} className="rounded-sm bg-teal p-2.5 text-paper hover:opacity-90 disabled:opacity-50" aria-label="Send">
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-3">Answers by Claude from this event&apos;s report, connections and headlines. They can be wrong; check the sources.</p>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
