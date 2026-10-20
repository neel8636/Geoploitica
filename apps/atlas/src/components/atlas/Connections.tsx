import { DASHED_KINDS, neighbours, type WorldEvent } from "@/content/events";
import { LineSwatch } from "@/components/atlas/MapLegend";
import LinkRow from "@/components/ripple/LinkRow";

/*
  How one event connects to the rest of the world, split the way the map draws it:
  solid lines (one event acts on the other, and through what channel) and dotted lines
  (related through a shared driver, or competing for the same thing).
*/
export default function Connections({ event }: { event: WorldEvent }) {
  const links = neighbours(event.id);
  if (links.length === 0) {
    return <p className="text-ink-2">No connections recorded yet.</p>;
  }
  const solid = links.filter((l) => !DASHED_KINDS.includes(l.kind));
  const dotted = links.filter((l) => DASHED_KINDS.includes(l.kind));
  const group = (title: string, help: string, dashed: boolean, items: typeof links) =>
    items.length ? (
      <section className="mt-6 first:mt-0">
        <h3 className="flex items-center gap-2 text-lg">
          <LineSwatch dashed={dashed} width={34} /> {title}
        </h3>
        <p className="mt-0.5 text-sm text-ink-2">{help}</p>
        <ol className="mt-3 divide-y divide-line-2 border-t border-line">
          {items.map((l) => (
            <li key={l.event.id} className="py-4">
              <LinkRow n={l} size="lg" />
            </li>
          ))}
        </ol>
      </section>
    ) : null;
  return (
    <div>
      {group("How it ripples", "Solid lines. One event acts on the other; each says through what channel the effect travels.", false, solid)}
      {group("Related through a driver", "Dotted lines. Neither caused the other: the same underlying force pushes both, or they compete for the same thing.", true, dotted)}
    </div>
  );
}
