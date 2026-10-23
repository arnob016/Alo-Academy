# Alo Academy — Coaching Center Demo Site

A bilingual (Bangla/English) Next.js site for a fictional coaching center in Mirpur, Dhaka. It's a
portfolio demo: visitors can submit an admission form with a bKash TrxID and watch the row land in
a Google Sheet. The full spec is in [plan.md](plan.md).

- **Stack:** Next.js 16 (App Router, Cache Components), Tailwind CSS 4, next-intl 4, Zod 4,
  Google Sheets API via `google-auth-library`, Cloudflare Turnstile, optional Resend email.
- **Routes:** `/bn` (default) and `/en`, each with Home, Courses, Teachers, Admission (+ success)
  and Contact. Every page is statically prerendered.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev                  # http://localhost:3000 → redirects to /bn
```

Without Google credentials, submissions in `npm run dev` are printed to the terminal instead of
appended to the Sheet, so the whole flow can be tried with no setup. A production build without
credentials will show an error on submit.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | yes | Service account's email |
| `GOOGLE_PRIVATE_KEY` | yes | From the JSON key; keep the `\n` sequences, wrap in quotes |
| `GOOGLE_SHEET_ID` | yes | ID of the **private** spreadsheet (the part of the URL between `/d/` and `/edit`) |
| `TURNSTILE_SECRET_KEY` | recommended | Without it, Turnstile verification is skipped (a warning is logged) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | recommended | Without it, no widget is shown |
| `RESEND_API_KEY`, `ADMIN_EMAIL` | optional | Both set → admin gets an email per submission |
| `EMAIL_FROM` | optional | Sender for admin emails; defaults to Resend's test sender |
| `NEXT_PUBLIC_SITE_URL` | yes in prod | Used for canonical URLs, hreflang, sitemap, Open Graph |
| `NEXT_PUBLIC_BKASH_NUMBER` | no | Defaults to the fake `01XXXXXXXXX`. **Never put a real wallet on the demo.** |
| `NEXT_PUBLIC_DEMO_MODE` | no | `true` by default. `false` removes the hire bar, demo banner, guide, sample-fill button and success-page pitch |
| `NEXT_PUBLIC_HIRE_URL` | demo | Your WhatsApp link (`https://wa.me/8801…`) or contact page. Without it the "Let's talk" buttons are hidden |
| `NEXT_PUBLIC_PUBLIC_SHEET_URL` | demo | View link to the **public, masked** spreadsheet (below) |

`NEXT_PUBLIC_*` values are baked in at build time — redeploy after changing them.

For local testing, Cloudflare's always-pass Turnstile test keys are
`1x00000000000000000000AA` (site) and `1x0000000000000000000000000000000AA` (secret).

## Google Sheets setup

### 1. Private spreadsheet (receives submissions)

1. In Google Cloud: create a project → enable **Google Sheets API** → create a **service account**
   → add a **JSON key**. Copy `client_email` and `private_key` into the env vars.
2. Create a spreadsheet with two tabs, named exactly **`Admissions`** and **`Contact`**.
3. Add header rows:
   - `Admissions`: `Timestamp | Ref No | Student Name | Class | Course | Batch | Student Phone | Guardian Phone | Method | Sender Number | Amount | TrxID | Status | Notes`
   - `Contact`: `Timestamp | Name | Phone | Message | Language`
4. **Share** the spreadsheet with the service account email as **Editor**. Share it with no one else.

New admissions arrive with `Status = Pending`. The center checks each TrxID against its bKash
statement and changes the status to `Approved` / `Rejected` by hand.

### 2. Public, masked spreadsheet (for the demo link)

Google Sheets can't share a single tab — anyone with a link to a spreadsheet can open every tab.
So the public view must be a **separate spreadsheet** that pulls masked data from the private one:

1. Create a new spreadsheet, e.g. "Alo Academy — live demo submissions".
2. Put headers in row 1: `Time | Ref No | Student | Class | Course | Batch | Phone | Method | Amount | Status`
3. In cell `A2`, paste (replace the URL with your private spreadsheet's URL):

   ```
   =LET(d, IMPORTRANGE("https://docs.google.com/spreadsheets/d/PRIVATE_ID/edit", "Admissions!A2:M"),
        f, FILTER(d, INDEX(d,,1)<>""),
        HSTACK(CHOOSECOLS(f,1,2,3,4,5,6),
               ARRAYFORMULA(REGEXREPLACE(TO_TEXT(CHOOSECOLS(f,7)), "^(\d{3})\d{4}(\d{4})$", "$1****$2")),
               CHOOSECOLS(f,9,11,13)))
   ```

   Click **Allow access** when prompted. Phones show as `017****0001`; guardian phone, sender number
   and TrxID are left out entirely.
4. Share → **Anyone with the link → Viewer**, and put that link in `NEXT_PUBLIC_PUBLIC_SHEET_URL`.

## Rebranding for a client

| What | Where |
| --- | --- |
| Name, contact details, address, map, colors, bKash number/account type, enabled payment methods, home-page stats | [config/site.ts](config/site.ts) |
| Courses, fees, batches, seats | [content/courses.ts](content/courses.ts) |
| Teachers (add `photo: "/images/teachers/x.jpg"` for real photos) | [content/teachers.ts](content/teachers.ts) |
| Testimonials, FAQ | [content/testimonials.ts](content/testimonials.ts), [content/faq.ts](content/faq.ts) |
| All other copy | [messages/bn.json](messages/bn.json), [messages/en.json](messages/en.json) |
| Logo mark | [components/logo.tsx](components/logo.tsx) |
| Social preview image | [app/[locale]/opengraph-image.tsx](app/[locale]/opengraph-image.tsx) |

Then set `NEXT_PUBLIC_DEMO_MODE=false` and the client's real bKash number.

## Theme switcher (demo mode)

With `NEXT_PUBLIC_DEMO_MODE=true`, a "Themes" button lets visitors re-skin the whole site:

| Theme | Folder | Highlights |
| --- | --- | --- |
| Classic | `app/`, `components/` | Server-rendered default — the fast, SEO version |
| Pixel Quest | [themes/pixel](themes/pixel) | Overworld nav, typed dialogue, stepped motion, 8-bit Web Audio, Konami code |
| Cinematic | [themes/cinema](themes/cinema) | Countdown leader, film grain, letterbox scenes, posters, end credits |
| Command Deck | [themes/hud](themes/hud) | Boot sequence, canvas starfield + wireframe planet, self-drawing panels, decrypt text, radar |
| Sketchbook | [themes/sketch](themes/sketch) | Rough.js ink drawings, Rough Notation highlights, doodle mode, paper-airplane send |
| Editorial | [themes/editorial](themes/editorial) | Variable-font headlines that follow the cursor, Lenis scroll, grid overlay (G), spreads |

How it fits together:

- [themes/registry.ts](themes/registry.ts) lists the themes; a tiny boot script applies the saved choice
  before first paint. Classic markup stays in the DOM (hidden) for search engines and no-JS.
- Each theme is its own chunk ([themes/loaders.ts](themes/loaders.ts)) — code, CSS, fonts and libraries
  load only when selected. Classic pages pay ~4 KB for the switcher.
- All themes render the same data from `/content`, `/config` and `/messages`, and use the same form
  hooks ([components/forms/use-admission-form.ts](components/forms/use-admission-form.ts)), so
  validation and submission behave identically everywhere.
- Switching uses the View Transitions API with a different entrance per theme (see `globals.css`).
- `prefers-reduced-motion` turns off intros, grain, typing, wipes and smooth scrolling.
- Display fonts in these themes have no Bengali glyphs, so Bangla pages lead with Hind Siliguri,
  Noto Serif Bengali or Atma instead.

## Deploy (Vercel)

1. Import the project, set the env vars for Production.
2. Paste `GOOGLE_PRIVATE_KEY` exactly as it appears in the JSON key (with `\n`).
3. After deploy, run [PageSpeed Insights](https://pagespeed.web.dev/) on `/bn` and `/bn/admission`,
   and test `/sitemap.xml`, `/robots.txt` and the Rich Results Test.

## Notes

- **Locale handling.** The locale is read with `next/root-params` in
  [i18n/request.ts](i18n/request.ts) so pages stay static. Server Actions can't read root params,
  so they must pass a locale explicitly if they ever need translations.
- **Keeping client JS small.** There is no `NextIntlClientProvider` at the root. Layout-level
  client components (nav, language switcher, hire bar) receive text and hrefs as props, and server
  components use the locale-aware `Link` in [components/locale-link.tsx](components/locale-link.tsx).
  Only the Admission and Contact pages wrap their forms in a provider. Adding `useTranslations` to
  a new client component means wrapping it in a provider too.
- **Performance.** CSS is inlined (`experimental.inlineCss`). Turnstile and Google Maps load only on
  interaction. In local Lighthouse runs on Windows, web-font processing delays first paint by about
  1 s; if PageSpeed Insights also shows Performance below 95, dropping Hind Siliguri in
  [app/[locale]/layout.tsx](app/[locale]/layout.tsx) in favour of system Bangla fonts is the
  largest single gain.
