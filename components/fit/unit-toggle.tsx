"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUnit } from "@/components/unit-provider";
import { isUnit } from "@/lib/units";

/*
 * UnitToggle: global cm/in pill toggle (UX-UI-Design §3). Reads and writes the
 * app-wide unit preference, so every measurement re-renders in place with no
 * layout shift (values are stored in mm; only the display unit changes).
 */
export function UnitToggle() {
  const { unit, setUnit } = useUnit();

  return (
    <ToggleGroup
      type="single"
      value={unit}
      onValueChange={(next) => {
        // Radix emits "" when the active item is re-pressed; ignore that so a
        // unit is always selected.
        if (isUnit(next)) setUnit(next);
      }}
      aria-label="Measurement units"
    >
      <ToggleGroupItem value="cm" aria-label="Centimetres">
        cm
      </ToggleGroupItem>
      <ToggleGroupItem value="in" aria-label="Inches">
        in
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
