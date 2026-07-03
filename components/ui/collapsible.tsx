"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";

/*
 * Collapsible primitive (Radix). Used by FitCard for the "How to apply",
 * troubleshooting, and "Show the method" sections. Styling lives at the
 * call site so cards control their own rhythm.
 */
function Collapsible(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Root>,
) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>,
) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Content>,
) {
  return (
    <CollapsiblePrimitive.Content data-slot="collapsible-content" {...props} />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
