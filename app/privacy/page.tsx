import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "The SportFits privacy policy, in plain language: your data stays on your device unless you opt into sync.",
};

/*
 * The privacy policy, in the same plain language as the rest of the app.
 * Every claim here must stay TRUE as features change (Help-tracks-features
 * spirit): if a data practice changes, this page changes in the same PR.
 * Required by Google Play for the packaged app (docs/Google-Play.md).
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="flex max-w-prose flex-col gap-2 text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Privacy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Your data stays yours
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          The short version: SportFits keeps your data on your device, sends
          nothing anywhere unless you explicitly opt in, and runs no
          analytics or ads of any kind. The details, in plain language:
        </p>
      </header>

      <Section title="What stays on your device">
        <p>
          Your body measurements, saved fits, wizard drafts, and settings live
          in your browser&apos;s local storage on this device. They are not sent to
          us or anyone else. You can export them as a file, or erase
          everything, from Settings at any time.
        </p>
      </Section>

      <Section title="Videos never leave your device">
        <p>
          Video Fit Analysis runs entirely in your browser. Your video is
          never uploaded anywhere; the pose tracking happens on your device.
          The first time you use it, your browser downloads the open-source
          tracking model from a content delivery network, which, like any web
          download, sees a standard web request and nothing about you or your
          video.
        </p>
      </Section>

      <Section title="No tracking, no ads, one functional cookie">
        <p>
          There are no analytics, no ad networks, and no tracking scripts.
          SportFits sets a single functional cookie that remembers your light or
          dark theme choice so the page paints correctly. That is the whole
          list.
        </p>
      </Section>

      <Section title="Optional account sync">
        <p>
          Sync is off unless you sign in. If you do, your email address and
          your saved fits and profile are stored with our database provider
          (Supabase) so they can follow you across devices. Deleting a fit
          while signed in removes its synced copy too. Signing out keeps your
          local data and stops syncing. To delete your account and everything
          synced to it, see{" "}
          <Link
            href="/delete-account"
            className="text-accent underline underline-offset-2"
          >
            deleting your account and data
          </Link>
          .
        </p>
      </Section>

      <Section title="The tip jar">
        <p>
          If a support option is shown and you choose to chip in, the payment
          happens on Stripe&apos;s own site under Stripe&apos;s privacy
          policy. SportFits
          never sees your card details and does not record who gave.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          SportFits&apos;s code is public, so these claims are checkable.
          Questions or concerns are welcome on the project&apos;s GitHub
          page:{" "}
          <a
            href="https://github.com/m3austin/Bikefit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            github.com/m3austin/Bikefit
          </a>
          .
        </p>
        <p className="measurement text-xs text-ink-muted">
          Last updated 2026-07-04. If a data practice ever changes, this page
          changes with it.
        </p>
      </Section>

      <footer className="border-t border-line pt-6 text-sm text-ink-muted">
        <Link href="/" className="underline underline-offset-2 hover:text-ink">
          Back to SportFits
        </Link>
      </footer>
    </article>
  );
}
