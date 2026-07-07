import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete your account and data",
  description:
    "How to delete your SportFits account and any data synced to it, and how to erase everything stored on your device.",
};

/*
 * Account + data deletion page, required by Google Play for any app that lets
 * users create an account (docs/Google-Play.md). Google needs a public URL
 * that names the app/developer, gives the steps to request deletion, and says
 * what is deleted and what (if anything) is kept. Keep every claim TRUE as the
 * sync feature changes (same rule as the privacy page).
 */

const CONTACT = "marshmallowlabs.app@gmail.com";

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

export default function DeleteAccountPage() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          SportFits by Marshmallow Labs
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Delete your account and data
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          SportFits keeps your data on your device by default, and you only have
          an account if you turned on optional sync. Here is how to remove
          either one.
        </p>
      </header>

      <Section title="Data on your device (the default)">
        <p>
          Your measurements, saved fits, and settings live in this
          device&apos;s local storage, not on any server. To erase all of it,
          open SportFits, go to <span className="text-ink">Settings</span>, and
          choose <span className="text-ink">Erase everything</span>. It is
          instant and needs no account. Your videos are never uploaded, so
          there is nothing about them to delete anywhere else.
        </p>
      </Section>

      <Section title="Your synced account (only if you signed in)">
        <p>
          If you turned on sync, we store your email address and your saved fit
          results (the numbers only, never any video) with our database provider
          so they can follow you across devices.
        </p>
        <p>
          To permanently delete your account and everything synced to it, email{" "}
          <a
            href={`mailto:${CONTACT}?subject=Delete%20my%20SportFits%20account`}
            className="text-accent underline underline-offset-2"
          >
            {CONTACT}
          </a>{" "}
          from the email address you signed in with, with the subject{" "}
          <span className="text-ink">Delete my account</span>. Using your
          sign-in address is how we confirm the request is yours.
        </p>
      </Section>

      <Section title="What is deleted, and what is kept">
        <p>
          We delete your account, your email address, and all of your synced fit
          records within <span className="text-ink">30 days</span> of the
          request, usually much sooner. Nothing tied to you is kept afterward.
          Ordinary server logs that carry no fit data or personal content may
          persist briefly under our provider&apos;s standard retention, then
          roll off on their own.
        </p>
        <p>
          Anything still stored only on your device is unaffected by an account
          deletion; erase that separately with{" "}
          <span className="text-ink">Settings &rarr; Erase everything</span>.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about deletion, or anything else, go to{" "}
          <a
            href={`mailto:${CONTACT}`}
            className="text-accent underline underline-offset-2"
          >
            {CONTACT}
          </a>
          .
        </p>
        <p className="measurement text-xs text-ink-muted">
          Last updated 2026-07-05.
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
