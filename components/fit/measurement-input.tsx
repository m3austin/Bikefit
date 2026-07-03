"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMeasurementText, formatValue, unitLabel, unitWord } from "@/lib/format";
import { parseMeasurement, type Unit } from "@/lib/units";

export type MeasurementStatus =
  | "empty"
  | "editing"
  | "ok"
  | "challenge"
  | "confirmed"
  | "unparseable";

export type MeasurementResult = {
  /** Stored value in mm, or null when empty/unparseable. */
  mm: number | null;
  status: MeasurementStatus;
  /** True once the rider confirms an out-of-range value (carries a caution flag). */
  caution: boolean;
};

export type MeasurementInputProps = {
  id: string;
  label: string;
  unit: Unit;
  /** Plausible range in mm (PRD §5). Outside it triggers the challenge. */
  minMm: number;
  maxMm: number;
  /** Initial stored value in mm. */
  valueMm?: number | null;
  /** Initial raw text (e.g. restoring a draft); overrides the derived text. */
  defaultText?: string;
  /** Start already confirmed-unusual (for an out-of-range initial value). */
  defaultConfirmed?: boolean;
  /** Helper shown in the challenge state to re-check the value. */
  recheckHint?: string;
  /** A typical value in mm, used for the "for example" hint when unparseable. */
  exampleMm?: number;
  /** Stepper increment in mm. */
  stepMm?: number;
  onChange?: (result: MeasurementResult) => void;
};

type State = { text: string; status: MeasurementStatus; mm: number | null };

type Action =
  | { type: "type"; text: string }
  | { type: "commit" }
  | { type: "step"; delta: number }
  | { type: "confirm" }
  | { type: "reformat" };

function classify(mm: number, minMm: number, maxMm: number): MeasurementStatus {
  return mm >= minMm && mm <= maxMm ? "ok" : "challenge";
}

function validate(
  text: string,
  unit: Unit,
  minMm: number,
  maxMm: number,
): State {
  if (text.trim() === "") return { text, status: "empty", mm: null };
  const mm = parseMeasurement(text, unit);
  if (mm === null) return { text, status: "unparseable", mm: null };
  return { text, status: classify(mm, minMm, maxMm), mm };
}

function makeReducer(unit: Unit, minMm: number, maxMm: number, stepMm: number) {
  return function reducer(state: State, action: Action): State {
    switch (action.type) {
      case "type":
        // Never validate on keystroke (Flow 2). Clear any message while editing.
        return { ...state, text: action.text, status: "editing" };
      case "commit":
        return validate(state.text, unit, minMm, maxMm);
      case "step": {
        const base = state.mm ?? Math.round((minMm + maxMm) / 2);
        const next = Math.max(0, base + action.delta * stepMm);
        return {
          text: formatValue(next, unit),
          status: classify(next, minMm, maxMm),
          mm: next,
        };
      }
      case "confirm":
        return state.status === "challenge"
          ? { ...state, status: "confirmed" }
          : state;
      case "reformat":
        // A unit change re-renders a committed value in place (no re-validation).
        return state.mm !== null &&
          (state.status === "ok" ||
            state.status === "challenge" ||
            state.status === "confirmed")
          ? { ...state, text: formatValue(state.mm, unit) }
          : state;
      default:
        return state;
    }
  };
}

function initState(props: MeasurementInputProps): State {
  const { unit, minMm, maxMm, valueMm, defaultText, defaultConfirmed } = props;
  if (defaultText !== undefined) {
    return validate(defaultText, unit, minMm, maxMm);
  }
  if (valueMm !== null && valueMm !== undefined) {
    const base = validate(formatValue(valueMm, unit), unit, minMm, maxMm);
    if (defaultConfirmed && base.status === "challenge") {
      return { ...base, status: "confirmed" };
    }
    return base;
  }
  return { text: "", status: "empty", mm: null };
}

const HELP_ID_SUFFIX = "-help";

/*
 * MeasurementInput (UX-UI-Design §3): the measurement control. A mono text
 * field (not a native number input) with a unit suffix and steppers. Parses
 * decimals, comma decimals, and fractional inches via lib/units; stores mm.
 * Validation runs on blur (Flow 2), never on keystroke: an out-of-range value
 * is challenged, never hard-blocked, and can be confirmed as unusual.
 */
export function MeasurementInput(props: MeasurementInputProps) {
  const {
    id,
    label,
    unit,
    minMm,
    maxMm,
    recheckHint,
    exampleMm,
    stepMm = 5,
    onChange,
  } = props;

  const reducer = React.useMemo(
    () => makeReducer(unit, minMm, maxMm, stepMm),
    [unit, minMm, maxMm, stepMm],
  );
  const [state, dispatch] = React.useReducer(reducer, props, initState);

  // Re-render a committed value in place when the unit changes.
  const firstUnit = React.useRef(true);
  React.useEffect(() => {
    if (firstUnit.current) {
      firstUnit.current = false;
      return;
    }
    dispatch({ type: "reformat" });
  }, [unit]);

  // Report changes upward. Kept in a ref so a new onChange identity per render
  // does not re-fire the effect.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  React.useEffect(() => {
    onChangeRef.current?.({
      mm: state.mm,
      status: state.status,
      caution: state.status === "confirmed",
    });
  }, [state.mm, state.status]);

  const helpId = `${id}${HELP_ID_SUFFIX}`;
  const isChallenge = state.status === "challenge";
  const isConfirmed = state.status === "confirmed";
  const isUnparseable = state.status === "unparseable";
  const invalid = isChallenge || isUnparseable;
  const tooHigh = state.mm !== null && state.mm > maxMm;

  const example = formatMeasurementText(exampleMm ?? 725, unit);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        <span className="sr-only"> in {unitWord(unit)}</span>
      </label>

      <div
        className={cn(
          "flex h-12 items-center gap-1 rounded-sm border bg-surface pl-1 pr-2",
          isUnparseable && "border-danger",
          (isChallenge || isConfirmed) && "border-warn",
          state.status === "ok" && "border-accent",
          (state.status === "empty" || state.status === "editing") &&
            "border-line",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Decrease ${label}`}
          className="size-10 text-ink-muted"
          onClick={() => dispatch({ type: "step", delta: -1 })}
        >
          <Minus />
        </Button>

        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={state.text}
          aria-invalid={invalid || undefined}
          aria-describedby={
            isChallenge || isConfirmed || isUnparseable ? helpId : undefined
          }
          className="measurement w-full min-w-0 flex-1 bg-transparent text-center text-lg text-ink outline-none placeholder:text-ink-muted"
          placeholder="0.0"
          onChange={(e) => dispatch({ type: "type", text: e.target.value })}
          onBlur={() => dispatch({ type: "commit" })}
          onKeyDown={(e) => {
            if (e.key === "Enter") dispatch({ type: "commit" });
          }}
        />

        <span className="measurement select-none text-sm text-ink-muted">
          {unitLabel(unit)}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Increase ${label}`}
          className="size-10 text-ink-muted"
          onClick={() => dispatch({ type: "step", delta: 1 })}
        >
          <Plus />
        </Button>
      </div>

      <div id={helpId} aria-live="polite" className="min-h-5 text-sm">
        {isUnparseable ? (
          <p role="alert" className="text-danger">
            We could not read that. For example, {example}.
          </p>
        ) : null}

        {isChallenge ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-warn">
              That is unusually {tooHigh ? "large" : "small"}.
              {recheckHint ? ` ${recheckHint}` : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-warn text-warn hover:bg-warn/10"
              onClick={() => dispatch({ type: "confirm" })}
            >
              Yes, that&apos;s right
            </Button>
          </div>
        ) : null}

        {isConfirmed ? (
          <p className="text-warn">
            Confirmed. This value is flagged as unusual on your fit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
