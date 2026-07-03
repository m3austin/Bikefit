"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { THEMES, type Theme } from "@/lib/theme";
import { useTheme } from "@/components/theme-provider";

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Theme, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

/*
 * Compact segmented theme control. The full settings surface arrives in
 * Phase 5; this lives in the header so both themes are reachable now.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface p-1"
    >
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        const active = theme === option;
        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={LABELS[option]}
            aria-pressed={active}
            onClick={() => setTheme(option)}
            className={cn(
              "h-9 w-9",
              active
                ? "bg-accent text-accent-ink hover:bg-accent hover:opacity-100"
                : "text-ink-muted",
            )}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}
