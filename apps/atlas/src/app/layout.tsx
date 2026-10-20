import type { Metadata } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import Link from "next/link";
import ThemeToggle, { THEME_SCRIPT } from "@/components/ThemeToggle";
import AuthProvider from "@/components/auth/AuthProvider";
import AccountMenu from "@/components/auth/AccountMenu";
import { SITE_NAME, SITE_ORIGIN, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "Geopolitica Atlas: how world events connect", template: "%s | Geopolitica Atlas" },
  description: TAGLINE,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: { type: "website", siteName: SITE_NAME, title: "Geopolitica Atlas: how world events connect", description: TAGLINE, url: `${SITE_URL}/`, images: [{ url: `${SITE_URL}/share/atlas.png`, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Geopolitica Atlas: how world events connect", description: TAGLINE, images: [`${SITE_URL}/share/atlas.png`] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* applies the saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="font-serif text-xl font-medium no-underline">
              Geopolitica <span className="text-ink-2">Atlas</span>
            </Link>
            <div className="order-3 flex w-full items-center gap-4 overflow-x-auto whitespace-nowrap text-[15px] sm:order-2 sm:ml-auto sm:w-auto sm:gap-5">
              <Link href="/" className="no-underline hover:underline">Map</Link>
              <Link href="/events" className="no-underline hover:underline">Events</Link>
              <Link href="/wire" className="no-underline hover:underline">Wire</Link>
              <Link href="/guide" className="no-underline hover:underline">How to use</Link>
              <span className="ml-auto sm:ml-0"><ThemeToggle /></span>
            </div>
            <div className="order-2 whitespace-nowrap sm:order-3">
              <AccountMenu />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-2 sm:px-6">
            <p>Free for anyone learning geopolitics. Every event links to its sources; connections carry the sentence that justifies them.</p>
            <span className="flex gap-4">
              <Link href="/guide#method" className="hover:underline">How reports are made</Link>
              <a href="https://geopolitica-1rja.onrender.com" className="hover:underline">Enterprise edition</a>
            </span>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
