import type { Metadata } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Geoploitica Atlas", template: "%s | Atlas" },
  description: "A personal map of world events, how they connect, and a layered report on each.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="font-serif text-xl font-medium no-underline">
              Geoploitica <span className="text-ink-2">Atlas</span>
            </Link>
            <div className="flex items-center gap-5 text-[15px]">
              <Link href="/" className="no-underline hover:underline">Map</Link>
              <Link href="/events" className="no-underline hover:underline">Events</Link>
              <Link href="/wire" className="no-underline hover:underline">Wire</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-ink-2 sm:px-6">
            Personal edition. Events and connections are hand-curated in src/content/events.ts; headlines come from the wire script; reports are drafted with the draft script and reviewed before they are committed.
          </div>
        </footer>
      </body>
    </html>
  );
}
