/*
 * The tip jar: a Wikipedia-style, zero-pressure way to support BikeFit.
 *
 * Principles (these are product rules, not suggestions):
 * - Payments happen on Stripe's own site via a Payment Link. No server code,
 *   no secrets, no card data anywhere near this app.
 * - Nothing is ever gated on giving, and the copy says so plainly.
 * - The gentle note appears only after the rider has gotten real value (a
 *   saved fit), never on a first visit, at most once every RESHOW window per
 *   device, inline in the page flow (never a modal, toast, or overlay).
 * - "No thanks" is permanent. Nothing about showing, dismissing, or giving
 *   is tracked or logged.
 *
 * The link comes from NEXT_PUBLIC_SUPPORT_URL (a public URL, safe to inline).
 * When it is unset, every trace of the feature disappears.
 */

/** The Stripe Payment Link, or undefined when the feature is off. */
export function supportUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL;
  return url && url.length > 0 ? url : undefined;
}

/** How long after the note is shown before it may appear again: 90 days. */
export const SUPPORT_RESHOW_MS = 90 * 24 * 60 * 60 * 1000;

export type SupportPromptState = {
  /** The rider said "No thanks". Honored forever. */
  dismissed?: boolean;
  /** When the note was last rendered on this device. */
  lastShownMs?: number;
};

/**
 * Whether the gentle note may appear right now. Pure, so the softness rules
 * are testable: configured, earned value, not dismissed, not shown recently.
 */
export function shouldShowSupportNote(params: {
  url: string | undefined;
  savedFitCount: number;
  state: SupportPromptState;
  nowMs: number;
}): boolean {
  if (!params.url) return false;
  if (params.savedFitCount < 1) return false;
  if (params.state.dismissed) return false;
  const last = params.state.lastShownMs;
  if (last !== undefined && params.nowMs - last < SUPPORT_RESHOW_MS) {
    return false;
  }
  return true;
}
