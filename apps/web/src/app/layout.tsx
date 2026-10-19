import type { Metadata } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Geoploitica", template: "%s | Geoploitica" },
  description:
    "The ripple effects of world events, explained in layers: what happened, who wins and loses, what it costs you, and what to do before it lands.",
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
              Geoploitica
            </Link>
            <div className="flex items-center gap-5 text-[15px]">
              <Link href="/dossiers" className="no-underline hover:underline">
                Dossiers
              </Link>
              <Link href="/changes" className="no-underline hover:underline">
                Change radar
              </Link>
              <Link
                href="/enterprise"
                className="rounded-sm bg-teal px-3 py-1.5 text-paper no-underline hover:opacity-90"
              >
                For your company
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-2 sm:px-6">
            <p>
              Every number links to its source. Forecasts are judgements and are graded as
              they resolve. Nothing here is investment or legal advice.
            </p>
            <Link href="/method" className="hover:underline">
              How we work
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
