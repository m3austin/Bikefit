# BikeFit - User Flows

Version 1.0 | 2026-07-03 | Canonical source of truth for flows. Build every branch and every empty/loading/error/offline state shown here. When a flow's behaviour changes, update its diagram in the same PR. A flow that doesn't match the build is a defect.

---

## Flow 0: App map

```mermaid
flowchart TD
    L["/ Landing"] -->|Start your fit| W["/fit/new Wizard"]
    L -->|How it works| M["/method Methodology"]
    L -->|Welcome-back card| R["/fit/:id Results"]
    W -->|Calculate| R
    R -->|Save fit| G["/fits Saved fits"]
    G -->|Open| R
    G -->|New fit| W
    L --> S["/settings"]
    S -.->|v1.1| A["Account and sync"]
```

---

## Flow 1: First-time visitor to completed fit (the golden path)

```mermaid
flowchart TD
    A["Visitor lands on /"] --> B{"Saved fits in this browser?"}
    B -->|No| C["Hero: promise + Start your fit CTA"]
    B -->|Yes| D["Welcome back: fit cards + New fit CTA"]
    C --> E["Tap Start your fit"]
    D -->|New fit| E
    E --> F["Wizard opens at step 1: bike type"]
    F --> G["Steps: priority, height, inseam, torso, arm, shoulder, flexibility"]
    G --> H{"Foot length step"}
    H -->|Enter it| I["Review screen"]
    H -->|Skip| I
    I -->|Tap a value| J["Jump back to that step, edit, return to review"]
    J --> I
    I -->|Calculate my fit| K["Staged reveal ~500ms, numbers count up"]
    K --> L["Results: fit cards + sticky action bar"]
    L --> M{"Next action"}
    M -->|Save fit| N["Name dialog, save to IndexedDB"]
    M -->|Print| O["Print stylesheet, browser print dialog"]
    M -->|Start over| P["Confirm discard, back to step 1"]
    N --> Q["Toast: Saved. Link to /fits"]
```

State requirements: wizard draft persists to IndexedDB on every step (refresh-safe); Back never loses data; reveal animation replaced by instant render under `prefers-reduced-motion`.

---

## Flow 2: Measurement step (repeats per measurement)

```mermaid
flowchart TD
    A["Step renders: illustration + how-to + input"] --> B["User enters value"]
    B --> C{"Parseable? Accepts 72.5, 72,5, 28 1/2 in"}
    C -->|No| D["Inline: We couldn't read that. Example shown. Stay on step"]
    D --> B
    C -->|Yes| E{"Within plausible range?"}
    E -->|Yes| F["Store as mm, Continue enabled"]
    E -->|No| G["Amber challenge: That is unusually X. Re-check hint shown"]
    G --> H{"User choice"}
    H -->|Edits value| B
    H -->|Yes, that's right| I["Store as mm + caution flag on this input"]
    F --> J["Continue to next step"]
    I --> J
    J --> K["Draft saved to IndexedDB"]
```

Rules: validate on blur, never on keystroke. Challenge, never hard-block (0 counts and edge values are the user's call). Caution flags carry through to the fit sheet as a CautionBanner.

---

## Flow 3: Results interaction

```mermaid
flowchart TD
    A["Results page for fit"] --> B{"Load source"}
    B -->|Fresh from wizard| C["Staged reveal"]
    B -->|Opened from /fits| D["Instant render, no animation"]
    B -->|Direct URL, id not found| E["Not-found state: This fit isn't on this device. Explain local storage + CTA New fit"]
    C --> F["Fit cards rendered"]
    D --> F
    F --> G{"Per-card actions"}
    G -->|How to apply| H["Collapsible opens: numbered steps"]
    G -->|If it doesn't feel right| I["Troubleshooting collapsible"]
    G -->|Show the method| J["Formula + inputs + modifiers for this card"]
    F --> K{"Sticky bar"}
    K -->|Save fit| L{"Already saved?"}
    L -->|No| M["Name dialog, default name from bike type + date"]
    L -->|Yes| N["Saves changes / rename option"]
    K -->|Print or PDF| O["Print view"]
    K -->|Start over| P["Confirm dialog: discard this unsaved fit?"]
```

---

## Flow 4: Saved fits (garage)

```mermaid
flowchart TD
    A["/fits"] --> B{"Any saved fits?"}
    B -->|No| C["Empty state: illustration + Start your first fit"]
    B -->|Yes| D["Card grid, newest first"]
    D --> E{"Card action"}
    E -->|Open| F["/fit/:id results"]
    E -->|Rename| G["Inline rename, Enter saves, Esc cancels"]
    E -->|Duplicate and edit| H["New draft pre-filled, opens wizard at review step"]
    E -->|Delete| I["Confirm dialog: names the fit, destructive verb button, Cancel focused"]
    I -->|Cancel| D
    I -->|Delete fit| J["Removed + Undo toast ~10s"]
    J -->|Undo| K["Fit fully restored in place"]
    J -->|Timeout| L["Gone from IndexedDB (tombstone if sync enabled)"]
```

Delete rule is universal: every destructive action in the app follows this exact confirm + undo pattern via the one shared `useConfirmDelete` utility.

---

## Flow 5: Units and theme

```mermaid
flowchart TD
    A["User toggles cm/in anywhere"] --> B["Setting persists to IndexedDB + localStorage"]
    B --> C["All displayed values re-render in place, no layout shift"]
    C --> D["Internal storage stays mm always"]
    E["User changes theme in /settings"] --> F["dark / light / system"]
    F --> G["Class applied to html element, persisted, mirrored to cookie for SSR"]
    G --> H["Print output always light regardless of theme"]
```

---

## Flow 6: Export, import, erase (data controls)

```mermaid
flowchart TD
    A["/settings data section"] --> B{"Action"}
    B -->|Export| C["Download bikefit-backup.json: profile + fits + settings + schema version"]
    B -->|Import| D["File picker, validate schema version"]
    D -->|Valid| E{"Existing data present?"}
    E -->|No| F["Import all, success toast with counts"]
    E -->|Yes| G["Choose: merge or replace. Replace requires confirm"]
    D -->|Invalid| H["Error state: what's wrong, nothing changed"]
    B -->|Erase everything| I["Typed confirmation: type erase"]
    I -->|Confirmed| J["Wipe IndexedDB + localStorage, land on fresh /"]
    I -->|Cancelled| A
```

---

## Flow 7: Optional account sync (v1.1)

```mermaid
flowchart TD
    A["/settings account section"] -->|Sign in| B["Magic link email or OAuth via Supabase"]
    B --> C{"Auth success?"}
    C -->|No| D["Error state, local app untouched"]
    C -->|Yes| E{"First sign-in on this device?"}
    E -->|Yes| F["Upload local profile + fits not present remotely"]
    E -->|No| G["Two-way sync"]
    F --> G
    G --> H{"Conflicts? Same record changed both sides"}
    H -->|Yes| I["Last-write-wins by updatedAt, note in sync log"]
    H -->|No| J["Synced. Status chip: Synced just now"]
    I --> J
    K["Sign out"] --> L["Local data stays, copy says so explicitly"]
    M["Offline while signed in"] --> N["Queue changes, chip: Will sync when online"]
    N -->|Back online| G
```

Never blocks: every feature works signed-out. Sync failures degrade to local-only with a status chip, never a modal.

---

## Flow 8: Offline and error handling (cross-cutting)

```mermaid
flowchart TD
    A["App loaded once before"] --> B["Service worker serves shell + assets"]
    B --> C["Wizard, engine, saved fits, settings: all fully functional offline"]
    C --> D["Chip: Offline, everything still works"]
    E["Unexpected render error"] --> F["Route error boundary: friendly message + reload + data is safe reassurance"]
    G["IndexedDB unavailable (private mode edge case)"] --> H["In-memory fallback + banner: results won't persist on this device"]
```
