import { describe, expect, it } from "vitest";

import {
  SUPPORT_RESHOW_MS,
  isPlaySource,
  shouldShowSupportNote,
} from "@/lib/support";

/*
 * The softness rules are the product here, so they are pinned by tests:
 * no URL means no feature, no earned value means no note, "No thanks" is
 * forever, and a recent showing suppresses the note for the whole window.
 */

const NOW = 1_800_000_000_000;
const URL = "https://donate.stripe.com/test_abc";

describe("shouldShowSupportNote", () => {
  it("never shows without a configured payment link", () => {
    expect(
      shouldShowSupportNote({
        url: undefined,
        savedFitCount: 5,
        state: {},
        nowMs: NOW,
      }),
    ).toBe(false);
    expect(
      shouldShowSupportNote({
        url: "",
        savedFitCount: 5,
        state: {},
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it("never shows before the rider has saved a fit (earned value first)", () => {
    expect(
      shouldShowSupportNote({
        url: URL,
        savedFitCount: 0,
        state: {},
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it("shows once value exists and nothing suppresses it", () => {
    expect(
      shouldShowSupportNote({
        url: URL,
        savedFitCount: 1,
        state: {},
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it("honors No thanks forever", () => {
    expect(
      shouldShowSupportNote({
        url: URL,
        savedFitCount: 10,
        state: { dismissed: true, lastShownMs: NOW - 10 * SUPPORT_RESHOW_MS },
        nowMs: NOW,
      }),
    ).toBe(false);
  });

  it("stays quiet for the full window after a showing, then may return", () => {
    const justShown = { lastShownMs: NOW - 1000 };
    expect(
      shouldShowSupportNote({
        url: URL,
        savedFitCount: 3,
        state: justShown,
        nowMs: NOW,
      }),
    ).toBe(false);

    const longAgo = { lastShownMs: NOW - SUPPORT_RESHOW_MS - 1 };
    expect(
      shouldShowSupportNote({
        url: URL,
        savedFitCount: 3,
        state: longAgo,
        nowMs: NOW,
      }),
    ).toBe(true);
  });
});

describe("isPlaySource", () => {
  it("recognizes the Play-wrapped start URL and nothing else", () => {
    expect(isPlaySource("?src=play")).toBe(true);
    expect(isPlaySource("?utm=x&src=play")).toBe(true);
    expect(isPlaySource("")).toBe(false);
    expect(isPlaySource("?src=web")).toBe(false);
    expect(isPlaySource("?source=play")).toBe(false);
  });
});
