import type { Metadata } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import Link from "next/link";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Geopolitica Atlas", template: "%s | Atlas" },
  description: "A personal map of world events, how they connect, and a layered report on each.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* applies the saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="font-serif text-xl font-medium no-underline">
              Geopolitica <span className="text-ink-2">Atlas</span>
            </Link>
            <div className="flex items-center gap-5 text-[15px]">
              <Link href="/" className="no-underline hover:underline">Map</Link>
              <Link href="/events" className="no-underline hover:underline">Events</Link>
              <Link href="/wire" className="no-underline hover:underline">Wire</Link>
              <Link href="/guide" className="no-underline hover:underline">How to use</Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-2 sm:px-6">
            <p>Personal edition. Every event links to its sources; connections carry the sentence that justifies them.</p>
            <a href="https://geoploitica.onrender.com" className="hover:underline">Enterprise edition</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
