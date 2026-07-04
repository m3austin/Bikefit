# BikeFit - Launch checklist (Phase 8)

Version 1.0 | Deploy target: Vercel Hobby (free) + optional Supabase Free sync.

The app is local-first and static-export-friendly, so hosting is disposable: it
runs with no backend, and sync is an optional mirror.

---

## 0. Pre-deploy verification (done in this repo)

- [x] `npm run lint`, `npx tsc --noEmit`, `npx vitest run` (96), `npm run build`, `npx playwright test` (31) all green.
- [x] Engine golden suite locked; 100% engine branch coverage.
- [x] **Env safety:** the only client env are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), and `NEXT_PUBLIC_SITE_URL`. No service-role key anywhere; no secrets committed; `.env.local` is gitignored.
- [x] Mobile (375px) walkthrough of every flow: no console errors, no layout failures.
- [x] Supabase RLS verified live (cross-user reads blocked); migration in `supabase/migrations/`.

---

## 1. GitHub (you do this)

1. Create a **public** repo (keeps GitHub Actions free; the code has no secrets).
2. Push the current `main` branch.
3. Confirm the CI workflow (`.github/workflows/ci.yml`) runs green on the push.

---

## 2. Vercel setup (you click through)

1. In Vercel, **Add New Project** and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build command and output
   directory at defaults. Root directory: the repo root.
3. Add **Environment Variables** (Production + Preview). For a no-sync launch you
   can skip the Supabase ones; the app runs fully local-first without them.
   - `NEXT_PUBLIC_SITE_URL` = your production URL (e.g. `https://bikefit.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://phtrxxkbzfffiysadwdr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_UGPDKzFtLjtaON2IGKYhLw_Rru-6dXa`
     (publishable key, safe to expose; RLS protects the data)
   - `NEXT_PUBLIC_SUPPORT_URL` (optional) = your Stripe Payment Link for the
     tip jar. To create it: Stripe dashboard -> Payment Links -> New -> choose
     "Customers choose what to pay", name it (e.g. "Support BikeFit"), set a
     sensible minimum, create, and copy the `https://donate.stripe.com/...`
     or `https://buy.stripe.com/...` URL. Leave the variable unset and every
     trace of the tip jar stays hidden. It is a public URL, safe to expose;
     no Stripe secret key goes anywhere near this app.
4. **Deploy.** Every future PR gets a preview URL; merges to `main` deploy production.
5. (Optional) Buy a domain and point it in Vercel's domain settings, then update
   `NEXT_PUBLIC_SITE_URL` to match and redeploy.

---

## 3. Supabase production config (only if enabling sync)

1. In the Supabase dashboard for the **BikeFit** project (`phtrxxkbzfffiysadwdr`):
   - **Authentication -> URL Configuration:** set **Site URL** to your production
     URL and add `https://<your-domain>/settings` (and any preview URLs) to the
     **Redirect URLs** allow-list. Magic-link sign-in redirects there.
   - **Authentication -> Email:** the built-in email works for low volume with
     rate limits. For real traffic, configure your own SMTP provider.
2. The schema and RLS are already applied via the migration. If you reset the DB,
   re-apply `supabase/migrations/20260703000001_init_sync_schema.sql`.
3. Do not add the service-role key anywhere in the client or Vercel `NEXT_PUBLIC_*`.

---

## 4. Post-launch smoke checklist (5 minutes, on a phone)

Run these against the live URL, ideally on a real phone.

- [ ] **Landing** loads; "Start your fit" and "How it works" work; no console errors.
- [ ] **Wizard (Flow 1-2):** complete a fit; try an out-of-range value (challenge -> confirm), skip foot length, use Back (data preserved).
- [ ] **Results (Flow 3):** numbers reveal; open "How to apply" / "Show the method"; a caution banner appears if you confirmed an unusual value.
- [ ] **Save + Print:** save with a name (toast appears); Print / Save as PDF produces a clean one-page light sheet with matching numbers and the disclaimer.
- [ ] **Saved fits (Flow 4):** rename inline, duplicate-and-edit (opens the review step), delete then **Undo** (fit restored).
- [ ] **Settings (Flow 5-6):** toggle cm/in (values re-render, no layout shift) and theme; **export** a backup; **import** it back; **erase everything** (type "erase") lands on a fresh home.
- [ ] **Method** page renders; disclaimer present.
- [ ] **Offline (Flow 8):** load once, enable airplane mode, complete a wizard to results (offline chip shows "Offline, everything still works").
- [ ] **Sync (Flow 7, if enabled):** sign in via magic link on two devices/browsers; confirm a saved fit appears on the second; sign out and confirm local fits remain.

If anything fails, capture the flow and the console, and it can be reproduced in
a preview deploy before fixing.

---

## 5. Ongoing (maintenance mode)

- Monthly: update dependencies, run all tests + the Playwright smoke, fix any
  breakage (golden tests make this safe).
- Cost watch: Vercel and Supabase email before free-tier limits; a hard cutoff of
  Supabase only disables sync, the app stays fully functional.
- Backups: the app's JSON export is the user-side backup; Supabase Free includes
  daily backups (7 days).
