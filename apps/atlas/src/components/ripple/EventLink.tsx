"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRipple } from "@/components/ripple/RippleProvider";

// A link to an event that opens its ripple postcard on a plain click. Ctrl/Cmd/middle click, or
// a reader without JavaScript, still goes straight to the event page.
export default function EventLink({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ripple = useRipple();
  return (
    <Link
      href={`/events/${id}`}
      className={className}
      onClick={(e) => {
        if (!ripple || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        ripple.open(id);
      }}
    >
      {children}
    </Link>
  );
}
