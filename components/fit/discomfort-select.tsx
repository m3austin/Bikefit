"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/*
 * Optional multi-select for where the rider feels discomfort. Captured with
 * the analysis input for future guidance; nothing consumes it yet (the rules
 * engine arrives in a later stage), so this is data collection only. "None"
 * is mutually exclusive with every other choice.
 */

export type DiscomfortArea =
  | "knee"
  | "hip"
  | "lower-back"
  | "hands-wrists"
  | "neck-shoulders"
  | "none";

const OPTIONS: ReadonlyArray<{ value: DiscomfortArea; label: string }> = [
  { value: "knee", label: "Knee" },
  { value: "hip", label: "Hip" },
  { value: "lower-back", label: "Lower back" },
  { value: "hands-wrists", label: "Hands or wrists" },
  { value: "neck-shoulders", label: "Neck or shoulders" },
  { value: "none", label: "None" },
];

const VALID: ReadonlySet<string> = new Set(OPTIONS.map((o) => o.value));

export function DiscomfortSelect({
  value,
  onChange,
}: {
  value: DiscomfortArea[];
  onChange: (next: DiscomfortArea[]) => void;
}) {
  return (
    <ToggleGroup
      type="multiple"
      value={value}
      onValueChange={(next: string[]) => {
        const areas = next.filter((v): v is DiscomfortArea => VALID.has(v));
        const addedNone = areas.includes("none") && !value.includes("none");
        onChange(
          addedNone ? ["none"] : areas.filter((area) => area !== "none"),
        );
      }}
      aria-label="Where you feel discomfort when riding"
      className="flex-wrap"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
