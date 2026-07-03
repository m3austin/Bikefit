"use client";

import * as React from "react";
import { RadioGroup } from "radix-ui";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type Option<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

/*
 * OptionCards: an accessible single-select card group for the wizard's choice
 * steps (bike type, priority, flexibility). Built on Radix RadioGroup, so it is
 * keyboard-complete (arrow keys move, space selects) with a visible focus ring
 * and 44px+ targets (UX-UI-Design §3, §6). Tokens only.
 */
export function OptionCards<T extends string>({
  name,
  value,
  onValueChange,
  options,
  autoFocus,
}: {
  name: string;
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<Option<T>>;
  autoFocus?: boolean;
}) {
  return (
    <RadioGroup.Root
      aria-label={name}
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className="flex flex-col gap-3"
    >
      {options.map((option, index) => {
        const selected = value === option.value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            autoFocus={autoFocus && (value ? selected : index === 0)}
            className={cn(
              "group flex items-start gap-3 rounded-md border bg-surface p-4 text-left transition-colors",
              "hover:bg-surface-2",
              selected ? "border-accent" : "border-line",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                selected ? "border-accent bg-accent text-accent-ink" : "border-line",
              )}
            >
              <RadioGroup.Indicator>
                <Check className="size-3" strokeWidth={3} />
              </RadioGroup.Indicator>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-ink">{option.label}</span>
              {option.description ? (
                <span className="text-sm text-ink-muted">
                  {option.description}
                </span>
              ) : null}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
