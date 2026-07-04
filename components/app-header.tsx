import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/cycling", label: "BikeFit" },
  { href: "/fits", label: "Saved fits" },
  { href: "/cycling/drills", label: "Drills" },
  { href: "/method", label: "Rabbit hole" },
  { href: "/settings", label: "Settings" },
] as const;

/*
 * Server-rendered app shell header. The wordmark and nav are static; only the
 * ThemeToggle is a client island. A polished nav/landing arrives in Phase 5,
 * this exists so every route is reachable and themed during Phase 0.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="measurement text-lg font-semibold tracking-tight text-ink"
        >
          Sport<span className="text-accent">Fits</span>
        </Link>
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center gap-1 sm:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
