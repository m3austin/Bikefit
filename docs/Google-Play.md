# Getting BikeFit into the Google Play Store, in plain language

Written 2026-07-04. BikeFit is a web app, and Google Play accepts web apps
through a thin Android wrapper called a **Trusted Web Activity (TWA)**: a
real, installable Android app that simply displays your live website
full-screen, no browser bar. The website stays the single thing you
maintain; the Play app updates itself every time the site deploys.

## The costs, up front

| Item | Cost | Recurring? |
|---|---|---|
| Google Play developer account | 25 USD | One-time, forever |
| Building the app (PWABuilder) | Free | n/a |
| Hosting, updates | Already covered by Vercel | n/a |

That is the entire cost: **25 dollars, once**. (For contrast, Apple's App
Store is 99 USD every year, which is why iOS users are better served by
the PWA "Add to Home Screen" path for now.)

## The one hurdle to know about before starting

Personal developer accounts created since late 2023 must pass a **closed
testing requirement** before they can publish publicly: your app must run
a closed test with **at least 12 testers continuously opted in for 14
days**, and then you apply for production access. Friends, family, and a
cycling club chat solve this, but plan for it: realistically the whole
journey is **3 to 4 weeks**, most of it waiting.

## Step by step

### Part 1: one-time accounts and prerequisites (about an hour, plus waiting)

1. Go to `play.google.com/console/signup`, sign in with a Google account,
   choose a **personal** account, pay the 25 USD, and complete identity
   verification (a photo of ID; approval usually takes a day or two).
2. Add a **privacy policy page** to the site (a simple `/privacy` route;
   Play requires a URL even though BikeFit collects nearly nothing). Say
   plainly what is true: data stays on-device, optional sync stores fits
   and an email with Supabase, videos never leave the device.
3. Decide about the **tip jar**: Google requires its own billing system
   for digital purchases inside Play-distributed apps, and a Stripe tip
   link can be read as one. The safe, standard move is to hide the tip jar
   when the site runs inside the Android app (start the TWA at
   `/?src=play` and hide support UI for that visit). Do this before
   submitting, not after a rejection.

### Part 2: build the Android app (an afternoon, free)

4. Go to **pwabuilder.com**, enter the production URL, and let it score
   the site (manifest and service worker already exist, so this should
   pass). Fix anything it flags, e.g. adding a 512 px **maskable** icon to
   the manifest if asked.
5. Click **Package for stores -> Android**. PWABuilder generates a signed
   `.aab` (Android App Bundle) plus a **signing key file and passwords.
   Save these somewhere safe**; losing them means losing the ability to
   update the app.
6. PWABuilder also gives you an `assetlinks.json` file. Put it in the repo
   at `public/.well-known/assetlinks.json` and deploy. This is the
   handshake proving you own the site; without it the app shows a browser
   address bar instead of running full-screen.

### Part 3: the Play Console listing (an evening)

7. In the Play Console: **Create app**, fill in the store listing: app
   name, short and full descriptions, at least 2 phone screenshots, the
   512 px icon, and a 1024x500 "feature graphic" banner.
8. Complete the questionnaires: **content rating** (BikeFit rates
   Everyone), **target audience**, **data safety** (declare: no data
   collected by default; optional account sync stores email and fit data;
   nothing shared with third parties), and paste the privacy policy URL.
9. Upload the `.aab` to a **closed testing** track and add your 12+
   testers by email (or a Google Group).

### Part 4: the waiting game

10. Testers install from the opt-in link and keep the app installed. After
    **14 continuous days**, the console unlocks **Apply for production**.
    Answer its short questions about your testing.
11. Submit for review. First reviews typically take a few days. Approved
    means live on Google Play.

## Ongoing maintenance: almost none

- The app displays the live site, so **normal site deploys need nothing**
  in Play. Riders always have the latest version.
- You only touch the Play Console again if the manifest identity changes
  (name, icons, colors) or Google raises its target API level (roughly a
  yearly re-package with PWABuilder, upload, done).
- No recurring fees, ever.

## Next steps checklist (in order)

- [ ] Create the Play developer account (25 USD) and start ID verification
- [ ] Add `/privacy` page to the site
- [ ] Hide the tip jar for Play-wrapped visits
- [ ] PWABuilder: generate the `.aab`, save the signing key safely
- [ ] Add `public/.well-known/assetlinks.json` and deploy
- [ ] Store listing, questionnaires, screenshots, feature graphic
- [ ] Closed testing with 12+ testers for 14 days
- [ ] Apply for production, submit for review
