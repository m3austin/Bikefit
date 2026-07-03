import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import { UnitProvider } from "@/components/unit-provider";
import { ToastProvider } from "@/components/toast-provider";
import { SyncProvider } from "@/components/sync-provider";
import { AppHeader } from "@/components/app-header";
import { AppStatus } from "@/components/app-status";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bikefit.vercel.app";
const DESCRIPTION =
  "A free, local-first starting bike fit from your body measurements. No account, no ads, nothing to install.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BikeFit, a free starting bike fit from your measurements",
    template: "%s | BikeFit",
  },
  description: DESCRIPTION,
  applicationName: "BikeFit",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "BikeFit",
    title: "BikeFit, a free starting bike fit from your measurements",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "BikeFit",
    description: DESCRIPTION,
  },
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
          <UnitProvider>
            <ToastProvider>
              <SyncProvider>
              <div className="flex min-h-dvh flex-col">
                <AppHeader />
                <AppStatus />
                <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
                  {children}
                </main>
              </div>
              </SyncProvider>
            </ToastProvider>
          </UnitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
