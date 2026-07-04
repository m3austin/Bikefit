import { ExternalLink } from "lucide-react";

import {
  REFERENCES,
  REFERENCE_KIND_LABEL,
  type ReferenceId,
  type ReferenceKind,
} from "@/lib/references";

/*
 * The full references list for the rabbit hole (#references). Groups sources
 * by kind, shows the verifiable citation, and links out where a stable link
 * exists. This is the page that has to hold up when someone assumes a free
 * tool is not accurate: here is exactly what every method stands on.
 */

const KIND_ORDER: ReferenceKind[] = ["peer-reviewed", "book", "convention"];

export function ReferenceList() {
  const byKind = KIND_ORDER.map((kind) => ({
    kind,
    ids: (Object.keys(REFERENCES) as ReferenceId[]).filter(
      (id) => REFERENCES[id].kind === kind,
    ),
  })).filter((g) => g.ids.length > 0);

  return (
    <section
      id="references"
      aria-labelledby="references-title"
      className="flex scroll-mt-20 flex-col gap-5 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id="references-title" className="text-xl font-semibold text-ink">
          References
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Every method above names its source here. Where a target is still our
          own starting estimate rather than a sourced value, the section says so
          plainly; we would rather admit that than cite something we cannot
          stand behind.
        </p>
      </div>

      {byKind.map((group) => (
        <div key={group.kind} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-accent">
            {REFERENCE_KIND_LABEL[group.kind]}
          </h3>
          <ul className="flex flex-col gap-3">
            {group.ids.map((id) => {
              const ref = REFERENCES[id];
              return (
                <li
                  key={id}
                  className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4"
                >
                  <p className="text-sm text-ink">{ref.citation}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {ref.note}
                  </p>
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start text-sm text-accent underline-offset-2 hover:underline"
                    >
                      Find this source
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
