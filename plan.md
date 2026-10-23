# Plan: Alo Academy — Coaching Center Landing Site

A bilingual (Bangla/English) landing site for a fictional coaching center, built as a
portfolio demo for the **Next.js Basic tier (৳18,000, 5-day delivery)**.

**Audience:** prospective buyers (coaching center owners and other small businesses) deciding
whether to hire me. Every decision should make the demo easy to try and the offer easy to buy.

## 1. Goals

- Convert visitors into leads: a clear "Want a site like this?" path on every page.
- Let a visitor experience the full admission flow in under 60 seconds, with no real money.
- Show a fast, SEO-ready static site that a real coaching center could launch tomorrow.
- Demonstrate manual MFS payment collection (bKash number + TrxID) sent to Google Sheets.
- Hit **95+ on all four Lighthouse categories** (Performance, Accessibility, Best Practices, SEO) on mobile.
- Keep scope within the Basic tier: up to 5 pages, 1 form, no database, no CMS.

## 2. Brand (demo content)

- **Name:** Alo Academy / আলো একাডেমি
- **Location:** Mirpur, Dhaka (fictional address)
- **Offer:** SSC, HSC, and admission test coaching
- **Tone:** Trustworthy, parent-friendly, clear fees, no hype

## 3. Tech Stack

| Concern        | Choice                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js (App Router, latest stable), TypeScript    |
| Styling        | Tailwind CSS                                       |
| i18n           | next-intl with `/bn` (default) and `/en` routes    |
| Fonts          | `next/font` — Hind Siliguri (Bangla), Inter (English) |
| Form handling  | Server Action + Zod validation                     |
| Data sink      | Google Sheets API (service account) via `google-auth-library` (lighter than `googleapis`) |
| Spam protection| Honeypot field + Cloudflare Turnstile              |
| Notifications  | Optional email to admin via Resend                 |
| Hosting        | Vercel                                             |
| Content        | Typed TS/JSON files in `/content` (no CMS)         |

## 4. Pages (5)

1. **Home** — Hero with admission CTA, highlights (results, batch sizes, years running),
   featured courses, teacher preview, testimonials, FAQ.
2. **Courses** — Course cards: class level, subjects, schedule, duration, monthly fee,
   admission fee, seats left.
3. **Teachers** — Profiles with photo, subject, qualification, experience.
4. **Admission** — Course selection, student info, payment instructions, bKash form.
5. **Contact** — Address, phone, embedded map (lazy-loaded), office hours, simple contact form
   (same Sheets pipeline, separate tab).

All pages exist in both `/bn/...` and `/en/...` with a language switcher in the header.

## 5. Admission Form

### Fields

| Field            | Validation                                         |
| ---------------- | -------------------------------------------------- |
| Student name     | Required, 2–60 chars                               |
| Class / level    | Required, select                                   |
| Course & batch   | Required, select (from `/content/courses`)         |
| Student phone    | Required, BD mobile: `^01[3-9]\d{8}$`              |
| Guardian phone   | Required, same pattern                             |
| Payment method   | bKash (Nagad/Rocket can be enabled via config)     |
| Sender number    | Required, BD mobile pattern                        |
| Amount paid (৳)  | Required, must match the selected course's admission fee (admission fee only, not first month) |
| TrxID            | Required, 10 uppercase alphanumeric chars (typical bKash format) |
| Honeypot         | Hidden, must be empty                              |

Accept Bangla digits (০-৯) in number fields and normalize them to English digits before validating.

Validation only needs to visibly reject bad input for the demo; exact matching against
real bKash receipts is a client-project concern.

### Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`)

- Clear banner on the Admission page: "Demo — do not send real money" (both languages).
- Displayed bKash number is fake (e.g. `01XXXXXXXXX` placeholder style, never a real wallet).
- "Fill sample data" button pre-fills test values, including a sample TrxID, so the flow
  takes ~30 seconds.
- Placeholder text nudges visitors to use test phone numbers, not their own.
- Turning demo mode off restores normal client behavior (no banner, no sample button).

### Payment instructions shown on the page

1. Open bKash app → Send Money (or Payment, per client's account type)
2. Send the admission fee to the displayed merchant/personal number
3. Copy the TrxID from the confirmation SMS
4. Fill in the form and submit

### Flow

```
User submits form
  → Server Action validates with Zod
  → Turnstile token verified
  → Row appended to Google Sheet ("Admissions" tab)
  → Optional email to admin
  → User sees confirmation page with reference number
```

### Google Sheet columns

`Timestamp | Ref No | Student Name | Class | Course | Batch | Student Phone | Guardian Phone | Method | Sender Number | Amount | TrxID | Status | Notes`

- `Status` defaults to **Pending**; the center verifies against their bKash statement
  and updates it manually to Approved/Rejected.
- Ref No format: `ALO-YYMMDD-XXXX`.
- The public view is a **separate spreadsheet** (Sheets can't share a single tab) that pulls
  Admissions via `IMPORTRANGE` with phones masked (e.g. `017****1234`); only that spreadsheet is
  shared publicly. Formula in README.

## 5a. Demo & Sales Layer

Visually distinct from the Alo Academy brand (different color/typeface) so it never reads as
part of the client's site.

- **Hire CTA:** thin dismissible top bar or floating button on every page —
  "Want a site like this? Let's talk" → WhatsApp / my contact page. No prices, tiers, or
  package names anywhere on the site; pricing is discussed directly.
- **Guided demo:** optional "Try the demo" step list: switch language → pick a course →
  submit (sample data) → open the public Sheet and see your row.
- **Success page:** after submit, show the reference number plus a "See your row in the
  Sheet" link and the hire CTA (peak-interest moment).
- **Template proof:** brand name, colors, logo, contact info, and bKash number live in one
  `/config/site.ts`; courses/teachers/fees in `/content`. Case study states
  "your center, your branding, 5 days."
- All sales-layer components hidden when `NEXT_PUBLIC_DEMO_MODE=false`.

## 6. SEO

- Metadata API per page and per locale (title, description, canonical).
- `hreflang` alternates between `bn` and `en`.
- `sitemap.ts` and `robots.ts`.
- JSON-LD: `EducationalOrganization` on Home, `Course` on each course, `FAQPage` on the FAQ.
- Open Graph and Twitter image per locale (static, pre-generated; English text only, since the
  image renderer has no Bengali font).
- Semantic HTML, one `h1` per page, descriptive alt text in both languages.
- `lang="bn"` / `lang="en"` set correctly on `<html>`.

## 7. Performance Budget (target 95+)

- All pages statically generated; only the form and language switcher are client components.
  With next-intl this uses `generateStaticParams` for both locales and reads the locale via
  `next/root-params` (`setRequestLocale` is deprecated in next-intl 4) — build output shows
  every page as static. No root `NextIntlClientProvider`; only form pages ship translations.
- Turnstile script loads only on first form interaction (not on page load) to protect the
  Admission page score.
- Bangla font: one or two weights only, `display: swap`, subset to Bengali + Latin.
- Images: `next/image`, AVIF/WebP, explicit sizes, hero image priority-loaded, others lazy.
- Google Map loads only on click or when scrolled into view (facade pattern).
- No carousel or animation libraries; use CSS transitions.
- Budgets: LCP < 2.0s, CLS < 0.05, total JS < 100 KB gzipped on landing. (The Next 16
  framework baseline alone is ~175 KB gzipped, so the JS budget isn't reachable without
  leaving Next.js; the site adds very little on top.)
- Test with Lighthouse mobile preset and PageSpeed Insights after deploy.

## 8. Accessibility

- Color contrast AA minimum.
- Every input has a visible label in the active language.
- Errors announced with `aria-live` and shown next to the field.
- Full keyboard navigation, visible focus states.

## 9. Folder Structure

```
/app
  /[locale]
    layout.tsx
    page.tsx              # Home
    courses/page.tsx
    teachers/page.tsx
    admission/page.tsx
    admission/success/page.tsx
    contact/page.tsx
  sitemap.ts
  robots.ts
/components
  /demo                   # Hire CTA bar, demo banner, guided steps, success-page pitch
  /forms                  # Admission + contact forms, Turnstile, field helpers
/config
  site.ts                 # Brand, colors, contact, bKash number, demo flags
/content
  courses.ts
  teachers.ts
  testimonials.ts
  faq.ts
/lib
  sheets.ts               # Google Sheets append helper
  validation.ts           # Zod schemas, BD phone + digit normalization
  turnstile.ts
  actions.ts              # Server Actions for both forms
  email.ts, ref.ts, seo.ts
/messages
  bn.json
  en.json
/public/images
```

## 10. Environment Variables

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
RESEND_API_KEY=            # optional
ADMIN_EMAIL=               # optional
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_BKASH_NUMBER=
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_HIRE_URL=          # WhatsApp link or my contact page
NEXT_PUBLIC_PUBLIC_SHEET_URL=  # view-only link to the masked "Public View" tab
```

## 11. Timeline (5 days, matching the tier)

| Day | Work                                                                 |
| --- | -------------------------------------------------------------------- |
| 1   | Project setup, Tailwind, fonts, i18n routing, layout, header/footer, `/config/site.ts`; create Google service account + Sheet (Admissions, Contact, Public View tabs) and confirm a test append works |
| 2   | Home, Courses, Teachers pages with content files                     |
| 3   | Full Bangla/English translations, Contact page, responsive polish    |
| 4   | Admission form, validation, Turnstile (lazy), Sheets integration, demo mode (banner, sample fill) |
| 5   | Sales layer (hire CTA, guided demo, success page), SEO, performance tuning, deploy, QA |

## 12. Acceptance Checklist

- [ ] All 5 pages render in both languages with a working switcher
- [ ] Form rejects invalid phones, wrong amounts, and malformed TrxIDs
- [ ] Bangla digits are accepted and normalized
- [ ] Valid submissions appear in the Sheet within seconds with Status = Pending
- [ ] Lighthouse mobile: 95+ in all four categories on Home and Admission
- [ ] Sitemap, robots, hreflang, and JSON-LD validate (Rich Results Test)
- [ ] Tested on a low-end Android device over 3G throttling
- [ ] Deployed on Vercel with a custom or clean subdomain
- [ ] Demo banner visible; no real bKash number anywhere on the site
- [ ] "Fill sample data" completes a submission in under 60 seconds
- [ ] Public Sheet link shows only the masked "Public View" tab
- [ ] Hire CTA visible on every page and on the success page; link works
- [ ] Setting `NEXT_PUBLIC_DEMO_MODE=false` removes all demo/sales UI

## 13. Portfolio Presentation

Lead with what an owner cares about; technical proof comes second.

- Live demo link plus a **view-only link to the masked "Public View" tab** so visitors can
  submit the form and watch their row appear.
- **Owner's view:** screenshots of the Sheet going Pending → Approved, and the admin email.
- 60-second screen recording: switch language → pick course → submit payment → row in Sheet.
- Short case study: problem, solution, "your center, your branding, 5 days", results.
- **"What else I can build"** block: capabilities from Section 14 described as features
  (admin panel, CMS, student login, automatic bKash/SSLCommerz, SMS confirmations) —
  no prices, tiers, or "gig" wording.
- Lighthouse score screenshot and stack details as secondary proof.
  
