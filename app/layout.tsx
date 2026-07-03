import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: {
    default: "BikeFit",
    template: "%s | BikeFit",
  },
  description:
    "A free, local-first starting bike fit from your body measurements. No account, no ads, nothing to install.",
  applicationName: "BikeFit",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No server-side cookie read here on purpose: the app must stay
  // static-export-friendly (CLAUDE.md), and static export has no request to
  // read cookies from. ThemeScript resolves the theme before first paint, so
  // there is no flash. The provider still mirrors the choice to a cookie for
  // any future SSR/middleware deployment (UX-UI-Design §2).
  return (
    <html
      lang="en"
      className={cn(GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
