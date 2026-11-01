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
| `NEXT_PUBLIC_DEMO_MODE` | no | `true` by default. `false` removes the demo banner, guide, sample-fill buttons, sample applications and trials, the demo accounts and the theme switcher, and shows staff full (unmasked) phone numbers and TrxIDs in the admissions office |
| `NEXT_PUBLIC_PUBLIC_SHEET_URL` | demo | View link to the **public, masked** spreadsheet (below) |
| `AUTH_SECRET` | yes in prod | Signs session cookies. 32+ random characters, e.g. `openssl rand -base64 32`. Changing it signs everyone out. Dev falls back to a fixed insecure value |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | optional | Google sign-in ([setup below](#accounts--sign-in)). Without them the button is hidden (shown disabled in demo mode) |
| `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | optional | Facebook sign-in, same behaviour |
| `STAFF_EMAILS` | optional | Comma-separated emails that become staff when they sign in with Google/Facebook (bootstrap the first admin this way) |

`NEXT_PUBLIC_*` values are baked in at build time — redeploy after changing them.

For local testing, Cloudflare's always-pass Turnstile test keys are
`1x00000000000000000000AA` (site) and `1x0000000000000000000000000000000AA` (secret).

## Google Sheets setup

### 1. Private spreadsheet (receives submissions)

1. In Google Cloud: create a project → enable **Google Sheets API** → create a **service account**
   → add a **JSON key**. Copy `client_email` and `private_key` into the env vars.
2. Create a spreadsheet with nine tabs, named exactly **`Admissions`**, **`Contact`**, **`Trials`**, **`Users`**,
   **`Students`**, **`Fees`**, **`Attendance`**, **`Notices`** and **`Results`**.
3. Add header rows:
   - `Admissions`: `Timestamp | Ref No | Student Name | Class | Course | Batch | Student Phone | Guardian Phone | Method | Sender Number | Amount | TrxID | Status | Notes`
   - `Contact`: `Timestamp | Name | Phone | Message | Language | Status`
   - `Trials`: `Timestamp | Ref No | Student Name | Guardian Phone | Course | Batch | Class Date | Class Time | Language`

   - `Users`: `Created | User ID | Name | Email | Phone | Password Hash | Role | Google ID | Facebook ID | Linked Refs | Last Login | Email Verified`
   - `Students`: `Student ID | Roll | Name | Course | Batch | Student Phone | Guardian Phone | Joined | Status | Notes | Updated`
   - `Fees`: `Timestamp | Receipt No | Student ID | Student Name | Course | Batch | Months | Amount | Method | Note | Recorded By | Status`
   - `Attendance`: `Date | Course | Batch | Present | Absent | Late | Taken By | Updated`
   - `Notices`: `ID | Date | Tag | Pinned | Title (Bangla) | Title (English) | Body (Bangla) | Body (English) | Updated | Deleted`
   - `Results`: `ID | Date | Course | Title (Bangla) | Title (English) | Full Marks | Pass Marks | Scores | Updated | Deleted`

   An existing deployment must add the `Trials` and `Users` tabs before trial bookings and accounts can be saved,
   the five office tabs (`Students` … `Results`) before the office pages can load, and a `Status` header in column `F`
   of `Contact`. Dates are written as text (`2026-10-30`, months as `2026-10`), so type them the same way if you edit
   the Sheet by hand.
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

## Student & office tools

| Page | What it does |
| --- | --- |
| `/routine` | Weekly class routine built from each batch's `slot` in [content/courses.ts](content/courses.ts): today's classes, a live "in class now / next class" banner, a course filter, a week grid and per-batch `.ics` calendar downloads |
| `/results` | Exam results entered in the office (`Results` tab, cached for an hour and refreshed on every office change): summary stats, a marks-distribution chart with the pass mark, a top-10 merit list (ties share a rank) and a roll-number lookup with grade, rank and distance from the batch average. If the roll sat a different exam, it offers to switch |
| `/trial` | Free trial class booking: course → batch → one of that batch's real class dates in the next 14 days (re-checked on the server), then a confirmation with a `TRL-` reference and a calendar invite. Saved to the `Trials` tab |
| `/track` | Parents enter the reference number and the student's or guardian's phone to see a status timeline (received → payment verified → seat confirmed → first class date), plus a printable money receipt once the seat is confirmed. Wrong ref and wrong phone get the same answer, so references can't be probed |
| `/dashboard` | Admissions office: live inbox (polls every 10 s), KPIs, search and status filters, a fee check against the course's admission fee, Approve / Reject / Undo (writes column `M` of the Sheet), a ready-to-send confirmation or rejection SMS (copied in the page's language, with the first class date), upcoming trial classes, and CSV export |
| `/courses` | Fee calculator: admission fee plus monthly fees paid in advance, with the advance and sibling discounts from `discounts` in [config/site.ts](config/site.ts) |
| Home | Notice board: the latest six notices posted in the office (`Notices` tab, pinned first; cached like results) |

Data lives in [lib/admissions.ts](lib/admissions.ts) and [lib/trials.ts](lib/trials.ts): the private Sheet when credentials are set, otherwise
an in-memory store in `npm run dev`, so the whole submit → approve → track loop works with no setup.
In demo mode, eight sample applications and three sample trial bookings (tagged "Sample", never written to the Sheet) keep the
dashboard from looking empty. On serverless hosts, sample status changes are per instance and can reset; real rows persist.

### The office (staff only)

`/dashboard` and the tabs next to it need a **staff** account (see below). In demo mode the staff
login is public, so the office shows masked phones, emails and TrxIDs there, and phones can't be edited.

| Page | What it does |
| --- | --- |
| `/dashboard/students` | The roster, batch by batch. Every **approved** admission is a student automatically (its ID is the `ALO-` reference; "Undo" on the admissions page takes them off again); walk-in students are added here (`STU-` IDs). Roll numbers (unique per course among active students, with a "next free roll" button), batch moves, Active / Left, notes, seats taken per course, CSV export. Writes the `Students` tab |
| `/dashboard/fees` | Monthly fees for any month: who has paid, who owes and how much, cash received that month and the total outstanding. Fees are due from the joining month until the course's `durationMonths` end; "Left" students drop out. Record a payment for one or more months (arrears or up to 6 months ahead; the amount defaults to the standard fee and can be changed for discounts), then print the receipt (`RCT-` number). Wrong receipts are voided, never deleted. Writes the `Fees` tab |
| `/dashboard/attendance` | Pick a batch and a class date (defaults to its latest class; make-up days allowed, future dates not). Mark present / absent / late, "mark the rest present", copy the absentees' guardian numbers. Below: the last 10 classes as a grid, each student's attendance rate and a flag after 3 absences in a row. One `Attendance` row per class |
| `/dashboard/results` | Enter an exam (course, date, full and pass marks, title in Bangla and/or English) and its marks: fill the table from the course roster or paste from Excel; blank marks count as absent. Edit or delete later. Publishes to `/results` at once |
| `/dashboard/notices` | Post, edit, pin and delete notices (Bangla, English or both; a blank language falls back to the other). Publishes to the home page at once |
| `/dashboard/messages` | Contact-form messages, newest first, with "mark handled" (writes `Status` in the `Contact` tab) |
| `/dashboard/users` | Every account with its sign-in methods and activity. Make someone staff or remove staff access. You can't change your own role, the demo accounts, or (downwards) anyone whose verified email is in `STAFF_EMAILS`, since they'd be re-promoted at their next Google/Facebook sign-in. Someone newly made staff signs out and in once to open the office |

The office's data code is in [lib/students.ts](lib/students.ts), [lib/fees.ts](lib/fees.ts),
[lib/attendance.ts](lib/attendance.ts), [lib/notices.ts](lib/notices.ts), [lib/exams.ts](lib/exams.ts) and
[lib/contact-messages.ts](lib/contact-messages.ts), with the same storage rules as admissions. Every office Server
Action ([lib/office-actions.ts](lib/office-actions.ts), [lib/publish-actions.ts](lib/publish-actions.ts),
[lib/admin-actions.ts](lib/admin-actions.ts)) re-checks the signed-in user's current role. In demo mode:

- [content/notices.ts](content/notices.ts) and [content/results.ts](content/results.ts) are shown as read-only samples,
  alongside 15 sample students with generated fee and attendance history and three sample messages. None of it is
  written to the Sheet, and changes to samples are per server instance.
- Notices and results posted with the **public demo staff account** stay in memory and never reach the Sheet, and
  that account can't edit Sheet-backed notices or results, or change anyone's role. A real staff account can.

With demo mode off, the home page and `/results` show only what the office has published.

Under any theme, these pages are dressed in that theme (header, footer, background, fonts, colours) around their
classic markup — see "Theme switcher" below and `appPaths` in [themes/registry.ts](themes/registry.ts).

## Accounts & sign-in

`/login` offers phone-or-email + password, Google and Facebook. Two roles:

- **Parent / student** (everyone who signs up): `/account` lists their applications (with the
  status timeline and printable receipt), trial classes and profile. Anything submitted while signed in
  is linked automatically; earlier ones are added with their reference + phone number, the same proof
  the tracker asks for.
- **Staff**: also gets the office. Promote someone from `/dashboard/users`, by typing `staff` in their row's
  `Role` cell in the `Users` tab, or list their email in `STAFF_EMAILS` and have them sign in with
  Google/Facebook. A typed-in email never grants staff, since nobody has verified it.

How it fits together:

| Piece | Where |
| --- | --- |
| Accounts (Sheet `Users` tab; memory in dev; two demo accounts in demo mode) | [lib/users.ts](lib/users.ts) |
| Password hashing (Node's scrypt, salted) | [lib/passwords.ts](lib/passwords.ts) |
| Sessions: a signed, httpOnly JWT cookie (30 days) + a display-only cookie for the header | [lib/session-token.ts](lib/session-token.ts), [lib/session.ts](lib/session.ts) |
| Sign in / register / account / link actions | [lib/auth-actions.ts](lib/auth-actions.ts) |
| Google & Facebook (via [Arctic](https://arcticjs.dev), with state + PKCE) | [lib/oauth.ts](lib/oauth.ts), [app/api/auth](app/api/auth) |
| Redirects signed-out visitors away from `/account` and `/dashboard` | [proxy.ts](proxy.ts) |

- **Access is checked on the server.** The proxy redirect is only for convenience; every office and
  account action re-reads the user from the store, so demoting or deleting someone in the Sheet takes
  effect immediately (within the 10-second user cache).
- **No silent account merging.** Google/Facebook only attach to an existing account by email when both
  sides have a verified email. Otherwise the person is told to sign in with their password and connect
  the provider from `/account`. This blocks someone who pre-registers a victim's email.
- **Sign-in attempts are rate-limited**: 8 failures per login ID and 60 per IP per 15 minutes, kept in
  memory per server instance. The IP limit is loose because Bangladeshi carriers and office Wi-Fi put
  many people behind one address.
- Pages stay static: the account page loads its data from the browser, and the header reads the
  display-only cookie.

### Google sign-in

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**
   (type *Web application*). Configure the consent screen first if asked (scopes: `openid`, `email`, `profile`).
2. Authorised redirect URI: `https://YOUR-DOMAIN/api/auth/google/callback` (and
   `http://localhost:3000/api/auth/google/callback` for local testing). It is built from
   `NEXT_PUBLIC_SITE_URL`, so the two must match exactly.
3. Put the client ID and secret in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and redeploy.

### Facebook sign-in

1. [developers.facebook.com](https://developers.facebook.com) → **Create app** → add **Facebook Login**.
2. Valid OAuth redirect URI: `https://YOUR-DOMAIN/api/auth/facebook/callback`.
3. Put the App ID and App Secret in `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET`, and switch the app to
   **Live** mode so people other than its developers can sign in.

Which buttons show is decided when the site is built, so redeploy after adding keys.

### Demo accounts

In demo mode the login page lists a parent (`01700000002` / `parent1234`, which already has sample
applications and a trial) and an office staff account (`office@aloacademy.example` / `office1234`).
They live in memory only and disappear with `NEXT_PUBLIC_DEMO_MODE=false`.

## Rebranding for a client

| What | Where |
| --- | --- |
| Name, contact details, address, map, colors, bKash number/account type, enabled payment methods, home-page stats | [config/site.ts](config/site.ts) |
| Notices, exam results | [content/notices.ts](content/notices.ts), [content/results.ts](content/results.ts) |
| Fee discounts | `discounts` in [config/site.ts](config/site.ts) |
| Courses, fees, batches (display `schedule` text plus machine-readable `slot` for the routine), seats, illustration (`art`) | [content/courses.ts](content/courses.ts); drawings in [components/course-art](components/course-art), pixel sprites in [themes/pixel/sprites.tsx](themes/pixel/sprites.tsx) |
| Home hero illustration | [components/hero-scene.tsx](components/hero-scene.tsx) |
| Teachers (add `photo: "/images/teachers/x.jpg"` for real photos) | [content/teachers.ts](content/teachers.ts) |
| Testimonials, FAQ | [content/testimonials.ts](content/testimonials.ts), [content/faq.ts](content/faq.ts) |
| Cartoon portraits (each person's `look`: skin, hair or hijab, glasses, beard, outfit) | `look` in the files above; drawing in [components/portrait](components/portrait) |
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
- Every theme applies to every page. Home, courses, teachers, admission, contact and 404 are fully
  redesigned per theme. The tool pages (`/routine`, `/results`, `/trial`, `/track`, `/login`, `/account`
  and the whole office) keep their classic markup, which carries their behaviour, and each theme's
  `Frame` dresses it ([themes/shared/frame.tsx](themes/shared/frame.tsx)): the page container takes the
  theme's root class, the theme's own header, footer and background effects fill slots the root layout
  leaves for them, and [themes/shared/app-skin.css](themes/shared/app-skin.css) plus the "Tool pages"
  section of each theme's stylesheet restyle the content (colours, fonts, panels, fields, corners).
  The page stays hidden until the frame is on, so the classic look never flashes first.
- Every theme's header has the sign-in / account link and its footer links to the tool pages, so the
  whole site is reachable without leaving the theme.

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
  client components (nav, language switcher) receive text and hrefs as props, and server
  components use the locale-aware `Link` in [components/locale-link.tsx](components/locale-link.tsx).
  Only the Admission and Contact pages wrap their forms in a provider. Adding `useTranslations` to
  a new client component means wrapping it in a provider too.
- **Performance.** CSS is inlined (`experimental.inlineCss`). Turnstile and Google Maps load only on
  interaction. In local Lighthouse runs on Windows, web-font processing delays first paint by about
  1 s; if PageSpeed Insights also shows Performance below 95, dropping Hind Siliguri in
  [app/[locale]/layout.tsx](app/[locale]/layout.tsx) in favour of system Bangla fonts is the
  largest single gain.
