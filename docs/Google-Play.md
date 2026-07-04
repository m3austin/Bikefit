# Getting SportFits into the Google Play Store, in plain language

Written 2026-07-04, updated for the SportFits rebrand (the app is now
**SportFits**; BikeFit is its cycling module). List it under the SportFits
name and icon, not BikeFit. SportFits is a web app, and Google Play accepts web apps
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
2. **Privacy policy page: DONE.** The site serves it at `/privacy`
   (truthful and plain: data stays on-device, optional sync stores fits
   and an email with Supabase, videos never leave the device). Use
   `https://<your-domain>/privacy` wherever Play asks for the URL.
3. **Tip jar hiding: DONE.** Google requires its own billing system for
   digital purchases inside Play-distributed apps, and a Stripe tip link
   can be read as one. The app hides every support surface when launched
   at `/?src=play` (the flag persists on-device). Your only job: when
   PWABuilder asks for the app's **Start URL, enter `/?src=play`**.

### Part 2: build the Android app (an afternoon, free)

4. **Icons: WIRING DONE, ART STALE.** The manifest serves PNG icons
   including the 512 px maskable one Android requires (`/icon-192.png`,
   `/icon-512.png`, `/icon-512-maskable.png`), so PWABuilder will pass its
   icon check. BUT the art is still the old BikeFit bicycle on green: it
   must be replaced with a SportFits icon before listing (a multi-sport app
   should not ship a bicycle mark). Regenerate all three PNGs from the new
   icon, keep the same filenames, and deploy. Then go to **pwabuilder.com**,
   enter the production URL, and let it score the site (manifest, service
   worker, and icons all pass).
5. Click **Package for stores -> Android**. PWABuilder generates a signed
   `.aab` (Android App Bundle) plus a **signing key file and passwords.
   Save these somewhere safe**; losing them means losing the ability to
   update the app.
6. **assetlinks.json: scaffolded.** The repo already serves
   `public/.well-known/assetlinks.json` with two REPLACE placeholders.
   Swap in the package id and the SHA-256 signing fingerprint PWABuilder
   shows you, and deploy. This is the handshake proving you own the site;
   without it the app shows a browser address bar instead of running
   full-screen.

### Part 3: the Play Console listing (an evening)

7. **Listing assets: STALE, NEED SPORTFITS REFRESH.** `store-assets/` holds
   a feature graphic and six screenshots, but they are all BikeFit-era: the
   feature graphic reads "BikeFit / Fit your bike to your body" with the
   bicycle icon, and the screenshots are the old cycling wizard/adjust/method
   flow, captured before the multi-sport hub and the scored dashboard
   existed. Before listing, replace them with SportFits assets: a rebranded
   1024x500 feature graphic, and 1080x1920 screenshots of the current app
   (the hub sport-picker, a scored results dashboard, the rabbit hole, a
   drill guide with its "what good looks like" figure). Then in the Play
   Console: **Create app**, fill in the store listing (name, short and full
   descriptions) and upload those files.
8. Complete the questionnaires: **content rating** (SportFits rates
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
  in Play. Everyone always has the latest version.
- You only touch the Play Console again if the manifest identity changes
  (name, icons, colors) or Google raises its target API level (roughly a
  yearly re-package with PWABuilder, upload, done).
- No recurring fees, ever.

## Next steps checklist (in order)

- [ ] Create the Play developer account (25 USD) and start ID verification
- [x] Add `/privacy` page to the site (done, served at /privacy)
- [x] Hide the tip jar for Play-wrapped visits (done; set Start URL to /?src=play)
- [x] PNG icons incl. maskable in the manifest (done)
- [x] Six phone screenshots + feature graphic (done, in `store-assets/`)
- [ ] PWABuilder: generate the `.aab` with Start URL `/?src=play`, save the signing key safely
      (a ready Bubblewrap config also sits at `twa/twa-manifest.json` with REPLACE placeholders)
- [ ] Fill the two REPLACE placeholders in `public/.well-known/assetlinks.json` and deploy
      (use the PLAY APP SIGNING fingerprint from Play Console -> App integrity once the app
      exists there; the local upload key's fingerprint only helps pre-Play sideload tests)
- [ ] Store listing, questionnaires, screenshots, feature graphic
- [ ] Closed testing with 12+ testers for 14 days
- [ ] Apply for production, submit for review
