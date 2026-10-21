import type { ReactNode } from "react";
import type { Family } from "../../content/fueling";

/*
  Money, goods, people: the colour and the icon together, drawn inline so it works on any
  page (the map, event pages, reports). SHARED FILE (npm run sync:shared in apps/atlas).
*/
const PATH: Record<Family, ReactNode> = {
  money: <path d="M12 3v18M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4.3 1.3-4.3 3.1 0 4.3 9 2.3 9 6.8 0 1.9-1.9 3.1-4.7 3.1-2.3 0-4-.8-4.8-2.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  goods: <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z M3.5 7.5 12 12l8.5-4.5 M12 12v9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />,
  people: (
    <>
      <circle cx="12" cy="7.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M4.5 20.5c.4-4.2 3.3-6.6 7.5-6.6s7.1 2.4 7.5 6.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};

export default function FamIcon({ f, size = 24 }: { f: Family; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-white" style={{ background: `var(--${f})`, width: size, height: size }} aria-hidden>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24">{PATH[f]}</svg>
    </span>
  );
}
