"use client";

import { useSyncExternalStore } from "react";

/*
  Light / Dark / Auto. The choice is stored in localStorage and applied as data-theme on <html>;
  layout.tsx runs a tiny inline script before paint so there is no flash on load.
  "Auto" removes the attribute and lets the system preference decide.
*/
type Theme = "light" | "dark" | "auto";
const KEY = "theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  try {
    if (t === "auto") localStorage.removeItem(KEY);
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

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "auto" as Theme);
  const options: { value: Theme; label: string; title: string }[] = [
    { value: "light", label: "Light", title: "Light theme" },
    { value: "dark", label: "Dark", title: "Dark theme" },
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
