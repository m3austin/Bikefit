"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SportFitsMark } from "@/components/brand/sportfits-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLiveSport } from "@/lib/sports/registry";
import { cn } from "@/lib/utils";

/*
 * App shell header, two tiers so the chrome matches the multi-sport shape:
 *
 *  - A sport-agnostic GLOBAL bar (wordmark, Home, Saved fits, Rabbit hole,
 *    Settings) that is the same everywhere.
 *  - A contextual SPORT sub-bar that appears only while you are inside a
 *    sport (/golf, /cycling, ...), showing that sport's brand and its own
 *    tools in the sport's accent. Pick a sport on the hub, and its menus
 *    show up; leave it, and they go away.
 *
 * Client so it can read the current route; the ThemeToggle island stays.
 */

const GLOBAL_NAV = [
  { href: "/", label: "Home" },
  { href: "/fits", label: "Saved fits" },
  { href: "/method", label: "Rabbit hole" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const firstSegment = pathname.split("/")[1] ?? "";
  const sport = getLiveSport(firstSegment);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink"
        >
          <SportFitsMark size={22} />
          <span>
            Sport<span className="text-accent">Fits</span>
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center gap-1 sm:flex"
        >
          {GLOBAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-sm px-3 py-2 text-sm transition-colors hover:bg-surface-2 hover:text-ink",
                isActive(item.href)
                  ? "font-medium text-ink"
                  : "text-ink-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle />
        </div>
      </div>

      {sport ? (
        <div className={cn("border-t border-line bg-surface/60", sport.accentClass)}>
          <nav
            aria-label={`${sport.brand} tools`}
            className="mx-auto flex w-full max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6"
          >
            <Link
              href={`/${sport.slug}`}
              aria-current={isActive(`/${sport.slug}`) && !sport.tools?.some((t) => isActive(t.href)) ? "page" : undefined}
              className="measurement mr-1 shrink-0 rounded-sm px-2 py-1 text-sm font-semibold text-accent"
            >
              {sport.brand}
            </Link>
            {sport.tools?.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                aria-current={isActive(tool.href) ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-sm px-3 py-1 text-sm transition-colors hover:bg-surface-2 hover:text-ink",
                  isActive(tool.href)
                    ? "bg-surface-2 font-medium text-ink"
                    : "text-ink-muted",
                )}
              >
                {tool.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
