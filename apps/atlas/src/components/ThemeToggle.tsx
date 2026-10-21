"use client";

import { useSyncExternalStore } from "react";

/*
  Night / Ivory / Auto. Night (navy and gold, like the logo) is the default; Ivory is the
  lighter version; Auto follows the system. The choice is stored in localStorage and applied as
  data-theme on <html> ("light" for Ivory); layout.tsx runs a tiny inline script before paint
  so there is no flash on load.
*/
type Theme = "light" | "dark" | "auto";
const KEY = "theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "auto" ? t : "dark";
  } catch {
    return "dark";
  }
}

function apply(t: Theme) {
  const root = document.documentElement;
  const light = t === "light" || (t === "auto" && window.matchMedia("(prefers-color-scheme: light)").matches);
  if (light) root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try {
    if (t === "dark") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||(t==="auto"&&matchMedia("(prefers-color-scheme: light)").matches)){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})();`;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const options: { value: Theme; label: string; title: string }[] = [
    { value: "dark", label: "Night", title: "Night: navy and gold" },
    { value: "light", label: "Ivory", title: "Ivory: the lighter version" },
    { value: "auto", label: "Auto", title: "Follow the system setting" },
  ];
  return (
    <div role="group" aria-label="Colour theme" className="flex rounded-full border border-line p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={theme === o.value}
          onClick={() => apply(o.value)}
          className={`rounded-full px-2.5 py-1 ${theme === o.value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
