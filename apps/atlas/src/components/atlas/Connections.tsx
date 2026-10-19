import Link from "next/link";
import { LINK_WORDS, TYPE_LABELS, neighbours, type WorldEvent } from "@/content/events";
import { formatDate } from "@/content/dossiers";

/*
  How one event connects to the rest of the world: each linked event, the kind of link,
  and the one sentence that justifies it. Outgoing links read "this event feeds into X";
  incoming ones read "X feeds into this event".
*/
export default function Connections({ event }: { event: WorldEvent }) {
  const links = neighbours(event.id);
  if (links.length === 0) {
    return <p className="text-ink-2">No connections recorded yet.</p>;
  }
  return (
    <ol className="divide-y divide-line-2 border-t border-line">
      {links.map((l) => (
        <li key={l.event.id} className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr]">
          <div className="text-sm text-ink-2">
            <p>{l.direction === "out" ? `This ${LINK_WORDS[l.kind]}` : `${LINK_WORDS[l.kind][0].toUpperCase()}${LINK_WORDS[l.kind].slice(1)} this`}</p>
            <p>{TYPE_LABELS[l.event.type]} · {l.event.region}</p>
            <p>{formatDate(l.event.date)}</p>
          </div>
          <div>
            <Link href={`/events/${l.event.id}`} className="font-serif text-xl hover:underline">
              {l.event.title}
            </Link>
            <p className="mt-1 text-[15px] text-ink-2">{l.why}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
