# SilverConnect — Pages Design Brief

> Hand-off document for visual design (Claude Design / UI designer).
> Generated 2026-05-12; reviewed against the route tree on 2026-05-12. Covers **all 75 page routes** currently shipped in the app.
> Source of truth: `app/[locale]/**/page.tsx` + `docs/zh/provider-automated-compliance-plan.md`.
> 中文版见 [zh/PAGES_DESIGN_BRIEF.md](zh/PAGES_DESIGN_BRIEF.md)。

---

## 1. Product overview

**SilverConnect Global** — a senior home-services booking platform. Customers (older adults or their family) book vetted local helpers for cleaning, cooking, gardening, personal care and home repair; providers manage jobs, availability and payouts; an admin console runs disputes, safety, compliance and finance.

- **Countries:** Australia 🇦🇺 (AU), United States 🇺🇸 (US), Canada 🇨🇦 (CA). Country is held in a cookie (`CountrySwitcher`, default AU). Current tax labels/rates are AU 10% GST, US 8% Sales Tax, CA 13% HST. Service cards present hourly ranges with the localized "tax included" line; booking/payment pages show subtotal + tax + gross total. Some legacy display helpers still auto-scale US demo rates to ≈0.65× of AU rates.
- **Currencies:** AUD / USD / CAD, formatted with `tabular-nums`.
- **Languages (locales):** `en`, `zh-CN`, `zh-TW`, `ja`, `ko`. Routes are locale-prefixed (`/[locale]/...`) and the product standard is `next-intl` for visible UI copy. **No new hard-coded copy** — every new screen or new string needs keys in all 5 message files. A few older/demo pages still contain inline fallback/demo strings; treat those as implementation debt, not a design target.
- **Audience = older adults.** Design constraints throughout: large text (body ≥16px), high contrast (there's a contrast linter), large touch targets (`min-h-touch` / `min-h-touch-btn`), generous spacing, plain language, minimal cognitive load.
- **Theme:** light/dark via `next-themes` (`data-theme` on `<html>`). Design tokens are CSS custom properties: `--brand` / `--brand-soft`, `--bg-base` / `--bg-surface` / surface-2, `--text-primary` / `--text-secondary` / `--text-tertiary`, `--border` / `--border-strong`, `--success` / `--warning` / `--danger` (each with a `-soft` variant), `--chip-*`. Radii: `sm` / `md` / `lg` / `pill`. Components are built on Radix UI + a small shadcn-style kit (`components/ui/*`).
- **Tech:** Next.js (App Router, React Server Components), Drizzle ORM + Postgres, Stripe (donations + provider Connect onboarding/status), GLM (the "Ask AI" assistant). Booking payment/payout settlement remains placeholder-level; donations use hosted Stripe Checkout + webhook. Most pages are server-rendered, so there is rarely an explicit "loading" state — error/feedback states are surfaced via `?error=` / `?saved=` query params shown as inline banners.

### Four "shells" (route groups)

| Group | URL prefix | Shell | Who |
|---|---|---|---|
| `(public)` | `/[locale]/...` | bare; auth pages add a corner theme toggle; marketing/help pages use `Header` | anyone |
| `(customer)` | `/[locale]/...` | `Header` + mobile `BottomTabBar` + `AIFloatButton` (FAB) + `EmergencyOverlay` (SOS) | signed-in customers (most pages also work signed-out) |
| `(provider)` | `/[locale]/provider/...` | `Header` + mobile `ProviderBottomTabBar`; tab bar hidden during register/onboarding | users with `role = provider` |
| `(admin)` | `/[locale]/admin/...` | `AdminShell` (sticky top bar + left sidebar / mobile drawer) | users with `role = admin` |

---

## 2. Global UI patterns & shared components

**Layout chrome**
- **`Header`** (`components/layout/Header.tsx`) — sticky, 64px mobile / 80px desktop, bottom border. Left: a back-chevron button (on sub-pages, via `back` prop) **or** the **"SilverConnect"** wordmark → `/home`, plus `DesktopNav` on desktop. Right cluster: a **Donate** heart pill → `/donate` (label hidden on mobile), `ThemeToggle`, `CountrySwitcher` (AU/US/CA), `LanguageChip`, and either a circular avatar with initials → `/profile` (signed in) or a **"Sign in"** brand button → `/auth/login`.
- **`BottomTabBar`** (customer, mobile only) — fixed bottom, 84px, 5 equal columns: **Home** `/home` · **Services** `/services` · **Bookings** `/bookings` · **Messages** `/chat` · **Profile** `/profile`; active tab in brand color. Hidden on `/chat` and `/dev/*`. Pages reserve `pb-[120px]` on mobile.
- **`ProviderBottomTabBar`** (provider, mobile only) — 84px, 5 columns: **Workbench** `/provider` · **Jobs** `/provider/jobs` · **Calendar** `/provider/calendar` · **Earnings** `/provider/earnings` · **Profile** `/provider/profile`. Hidden on `/provider/register/*` and `/provider/onboarding-status/*`.
- **`AdminShell`** — sticky top bar (mobile hamburger, "SilverConnect **Admin**" wordmark, admin email, theme toggle, sign-out icon); left sidebar `w-64` (slide-over drawer on mobile) with two nav groups; main column max-width 1280px. Detail screens render right-side slide-over `<aside role="dialog">` panels (max-w 480px) over a dark backdrop.
- **`AIFloatButton`** — mobile FAB, bottom-right (~100px up), brand pill "Ask AI" → `/chat`. Hidden on `/chat`, `/pay/*`, `/providers/[id]`, `/bookings/[id]*`, `/bookings/new`, `/dev/*`.
- **`EmergencyOverlay` / SOS** — small red "SOS" circular button, fixed bottom-right (~180px mobile / 88px desktop). Opens a full-screen dark-red modal: pulsing alert icon, title, country-specific subtitle, a large `tel:` call button (000 / 911), a "Notify my emergency contact" button → `/profile/emergency`, close affordance. Also triggered by `#sos` hash or a `sc:sos` window event.
- **Skip link** — visually-hidden "skip to content" link in every locale page; on focus becomes a fixed brand button targeting `#main-content`.

**Reusable components designers will see again and again**
`AuthCard` (centered card, full-bleed on mobile / 480px on ≥sm, on a `bg-surface` field, 26px extrabold h1 + optional subtitle), `AuthRoleTabs` (Consumer / Provider 2-segment tablist), `ProviderCard` + `ProviderAvatar` (circular initials avatar, 4 hues; card shows rating ★, review count, distance, $/h, "Verified" + other badges), `BookingStatusBadge` (color-coded pill), `BookingTimeline` (status stepper), `BookingProgress` (wizard stepper), `EmptyState` (lucide / custom illustration + title + optional hint + optional CTA), modal dialogs (`DeclineJobModal`, `ReplyReviewModal`, `ReportReviewModal`, `RescheduleModal`, `DeleteCardConfirm`), `Skeleton` (shimmer), status `Alert` banners, `Button` (variants primary / secondary / ghost / danger; sizes sm / md / lg; `block`), `Input` / `Label` (with `invalid` state + hint line), `Switch`, `Card` / `CardTitle` / `CardBody`. There is a live component gallery at `/dev/components` (dev builds only).

**Recurring interaction idioms**
- **Sticky bottom CTA bar** above the mobile tab bar (`bottom-[84px]` mobile / `bottom-0` desktop) — used on booking detail, the booking wizard, payment, provider detail, job detail, the register wizard.
- **Full-screen success page** — centered green check circle (or an illustration) + headline + hint + a single brand CTA. Used after: email verify, password reset, dispute submitted, feedback submitted, payment success, safety report submitted.
- **Inline banners** — green `success-soft` `role="status"` ("Saved ✓ / Sent / Applied · {id}") after a mutating action via `?saved=1` / `?added=1` / `?uploaded=1` / `?applied={id}`; red `danger-soft` `role="alert"` for validation errors via `?error=...`; amber `warning-soft` for soft warnings (e.g. "account in review", "free cancel until …", "documents expiring").
- **Empty states** — bordered card with an illustration, title, optional hint, optional CTA. (A few admin pages currently use a bare "—" instead — flagged below.)
- **Disabled / "coming soon" controls** are widespread (see callouts below) — design them in their intended final state but know they're inert today.
- **Numbers, money, dates, codes** always use `tabular-nums`; IDs are shown as short 8-char hashes, often prefixed: bookings `#xxxxxxxx` / `B-xxxxxxxx`, disputes `D-xxxxxxxx`, incident reports `I-xxxxxxxx`, refunds `R-…`.

---

## 3. Authentication flow  *(design reference: airtasker.com)*

> **Design direction:** model the sign-in/sign-up experience on **Airtasker** — a clean, friendly, trust-forward funnel. The current login page has a prominent **Consumer ⇄ Provider** role switch; the register page is email-first and always creates a customer account, even when reached from the provider tab. Providers become providers after email verification by completing `/provider/register`. Auth pages are deliberately **chrome-less** — no Header, no nav, no tab bar — just the centered `AuthCard` on a `bg-surface` field, with only a fixed top-right theme toggle. This is the user's first impression: make it warm and reassuring (it's older adults handing over trust). Social buttons are visual placeholders today.

> **Target account model (Airtasker-style — the design intent; the code only approximates it today):** **one registration = one account that can act as both consumer and provider.** A new user signs up once (email + password + verify) and can immediately book services. The **provider side** — publishing a service listing, bidding on / accepting jobs — is the part that is **gated behind submitting compliant materials** (identity / ABN, background check, certificates, insurance, Stripe payout setup). Once those are submitted and approved, **the platform stores them and the user never re-submits** — only on expiry or rejection. *Today this is approximated by: a single `role` field promoted `customer → provider` via the `/provider/register` wizard; the 4-condition "approved" gate (see §5); and the `/provider/compliance` document store, which keeps approved docs on file until they expire. The register page still creates a customer account first. Designers can treat the unified single-account experience as the target and the customer/provider role split as an implementation detail to hide in the UI.*

Customer auth pages redirect signed-in users to `/home`; the separate admin login redirects an already-admin-cookie user to `/admin`. Server actions do the work; errors come back via `?error=`.

### 3.1 `/[locale]/auth/login` — Sign in
- `AuthRoleTabs` (Consumer / Provider — switching changes `?role`, the title/subtitle copy, and the "Sign up" link target).
- Red error banner on `?error=credentials` ("invalid credentials") or generic.
- Form: **Email** (`type=email`), **Password** (`minLength=8`, current-password autocomplete) with a small grey hint line ("≥8 chars"). Primary block button **"Sign in"**. On success: routes by role → `/provider`, `/admin`, or `/home`; unverified email → `/auth/verify`.
- **"Forgot password?"** link (brand, 48px tall) → `/auth/forgot`.
- "or" divider (two hairlines + centered "or").
- Social buttons: **"Continue with Google"** (G glyph), **"Continue with Apple"** (icon slot currently blank in code) — large bordered buttons; **currently inert placeholders**.
- Footer: "No account? **Sign up**" (carries `?role=provider` from the provider tab, but registration still creates a customer account first) + tiny terms line.

### 3.2 `/[locale]/auth/register` — Create account
- Red error banner: `?error=taken` ("email already in use"), `smtp` ("email service not configured"), `send` ("failed to send"), generic.
- Form: **Email**, **Password** (`minLength=8`, new-password) + hint. Primary block **"Sign up"**. On submit: creates (or updates the unverified user's) `customer` account, issues a 6-digit `email_verify` code, sends the verification email asynchronously, → `/auth/verify?email=…&sent=1`. `?role=provider` is not consumed by this action; it is only part of the login/register navigation context.
- "or" divider + the same **Google / Apple** buttons (inert).
- Footer: "Already have an account? **Sign in**" → `/auth/login` + tiny terms line.
- *(Note: a multi-step Airtasker-style profile build-out — name, location, etc. — is not yet here; today registration is just email + password → verify. Designers may propose the richer stepper.)*

### 3.3 `/[locale]/auth/verify` — Verify email (6-digit code)
Requires `?email=`. State machine: `pending` / `resent` / `success` / `expired`.
- **success:** card title + hint, large green `CheckCircle2` (48px), big brand button **"Continue to home →"** → `/home`.
- **expired:** title + hint, single resend form → **"Resend code"** block button.
- **pending / resent (default):** title ("verifyResent" vs "verifyTitle"), subtitle interpolating the email. Optional error banner (wrong/missing code, throttled, bad format, send failed). Hero: large brand-soft circle with `Mail` icon (42px) + the email in bold `tabular-nums`. **Code form:** single big centered input — `inputMode=numeric`, `pattern=\d{6}`, `maxLength=6`, one-time-code autocomplete, styled `tracking-[8px] text-[24px] tabular-nums`, with a hint line ("check spam"). Primary block **"Confirm"** (on valid code → marks email verified, signs in, → `?state=success`). Below: **"Open mail app"** bordered button (`mailto:`) and a text-link **"Resend code"** (own form → `?resent=1`).

### 3.4 `/[locale]/auth/forgot` — Forgot password (request code)
- Error banner on `?error=invalid`.
- Form: single **Email** field. Primary block **"Send reset code"**. **No email-existence oracle** — behaves identically whether or not the account exists; if it exists, issues a 6-digit `password_reset` code and emails it. → `/auth/reset?email=…&sent=1`.
- **"Back to login"** link (brand, 48px, full width).

### 3.5 `/[locale]/auth/reset` — Reset password (code + new password)
State: `default` / `success` / `expired`.
- **success (`?sent=1`):** title + hint, green `CheckCircle2`, big brand **"Back to login"**.
- **expired (`?state=expired`):** title + hint, big brand button → `/auth/forgot`.
- **default:** optional green status banner ("we sent you a code"); optional red error banner (password mismatch, bad/missing/wrong/expired/throttled code). Form: **Email** (prefilled), **Verification code** (`inputMode=numeric`, `pattern=\d{6}`, `maxLength=6`, centered `tracking-[6px] text-[20px]`), **New password** (`minLength=8`) + hint, **Confirm password**. Primary block **"Reset password"** → consumes the code, updates the hash, → `?sent=1`. **"Back"** link (brand, 48px, full width).

### 3.6 `/[locale]/admin/login` — Admin sign in *(separate, no AdminShell)*
Centered card (max-w 420px) on `bg-surface-2`, corner theme toggle. Header: brand `ShieldCheck` icon + "SilverConnect Admin" eyebrow + title/subtitle. Form: **Email**, **Password** (≥8), **TOTP** 6-digit code (`\d{6}`, with hint) → primary block **"Sign in"** → sets admin cookie → `/admin`. Error banner on `?error=invalid`. Footer note: IP-allowlist + account-lock hints. *(Password/TOTP check is currently a stub.)*

---

## 4. Customer app — pages

> Shell: `Header` (per-page, with `back` where appropriate) + mobile `BottomTabBar` + `AIFloatButton` + `EmergencyOverlay/SOS`. Common container: `max-w-content`, `pb-[120px]` mobile / `pb-12` desktop. Pages with a primary action use a **sticky bottom CTA bar**.

### Home & discovery

**`/[locale]/home` — Customer home** (`(customer)/home/page.tsx`)
Landing dashboard. Top→bottom: **Greeting** — big "Hi, {name}" (falls back to email prefix / "guest"), subtitle prompt, decorative `S1TeaTime` illustration. **Search bar** (GET → `/search?q=`). **Categories grid** (2-col) — tiles with colored emoji (🧹 cleaning · 🍳 cooking · 🌿 garden · 🤝 personal care · 🔧 repair), category name, "from $X/h" (country min), → `/services/[cat]`. **Recently booked** (signed-in + has history) — horizontal scroll of up to 4 past providers (avatar, name, category, "Book again" outline → `/providers/[id]`); signed-out shows a brand "welcome" line instead. **Recommended provider** — one featured `ProviderCard` (top provider by avg rating: rating, reviews, $/h, verified badge); signed-in with none → `EmptyState`.

**`/[locale]/search` — Search** (`search/page.tsx`)
Title + search form (text input + "Search", GET, preserves `q`). Prompt state when no `q`. With `q`: header "Results for {q}" + up to three sections (only if non-empty): **Providers** (avatar, name, categories joined by ·, ★rating(count) → `/providers/[id]`), **Services** (pill chips → `/services/[cat]`), **Help articles** (cards → `/help/[slug]`). No-results → dashed card "No results".

**`/[locale]/services` — Service categories** (`services/page.tsx`)
Title "Services" + tax-inclusive info banner ("prices incl. GST"). Vertical list of category cards (~200px tall): large character illustration (C3 HelperMei / C4 CookZhang / C5 GardenerTom / C6 NurseAnna / C7 FixerBob), name, description, "$lo–$hi/h" range, provider count ("N providers" / "No providers yet"), chevron → `/services/[cat]`.

**`/[locale]/services/[cat]` — Providers by category** (`services/[cat]/page.tsx`)
`cat` ∈ cleaning|cooking|garden|personalCare|repair (404 otherwise). Title "{Category} (AU)" + hourly-range subtitle (incl. tax). **Filter pill row** (horizontal scroll): rating · distance · language · weekend · female · firstAid + "Sort: Recommended ▾" — **all disabled placeholders**. List of `ProviderCard`s (approved providers in this category, ordered by rating then review count): avatar, name, rating, reviews, distance ("—"), $/h, verified badge. Empty → `EmptyState` "No matches".

**`/[locale]/providers/[id]` — Provider detail** (`providers/[id]/page.tsx`)
`id` = provider profile id (404 if missing). If the provider isn't approved → amber "currently offline" banner. **Header:** 100px avatar, name, ★avg (reviews count), badge row ("Verified" if approved + other badges + category chips). **Bio** card (if any). **Services offered:** list of service-variant rows (category · duration · code · price) or a "no variants" note. **Reviews:** none → bordered "No reviews yet"; else big avg-rating number + 5→1 star **histogram bars** + optional "report sent" success banner + up to 5 recent reviews (star row; signed-in users get a `ReportReviewModal` trigger — reasons spam/abusive/false/off_topic/other + details textarea, optional comment; "— {customer} · date"). **Sticky bottom CTA:** disabled "message provider" icon button + either a disabled "currently offline" button or a brand **"Continue · from $X incl. GST"** → `/bookings/new?step=1`.

### Booking flow

**`/[locale]/bookings/new` — New booking wizard** (`bookings/new/page.tsx`)
4-step wizard via `?step=1..4`; draft persisted in session. Each step: `BookingProgress` stepper under the header + sticky footer (Back link + Next/Confirm). Inline `Alert` for validation.
- **Step 1 — Pick a service:** radio list of enabled service variants (category · duration, service code, base price) for the user's country.
- **Step 2 — Pick provider + datetime:** radio list of approved providers offering that category (name, service-radius km) + a `datetime-local` "When" (≥1h from now, server-enforced). No providers → a notice.
- **Step 3 — Pick address:** radio list of saved addresses (label, full line; default pre-selected). None → card prompting "Add address" → `/profile/addresses/new`.
- **Step 4 — Confirm & finalize:** summary card (Service / Provider / When / Address), price breakdown (Service + tax % + bold Total), "free cancel until 24h before" info note, optional **Notes** textarea, **"Confirm & pay $X"** submit → creates booking (`pending`), notifies provider, → `/pay/[id]`.

**`/[locale]/bookings` — Bookings list** (`bookings/page.tsx`)
Tab bar **Upcoming / Past / Recurring** (`?tab=`). Upcoming/Past: booking cards — provider avatar (hue from id), provider name, formatted date/time, `BookingStatusBadge`, bold price → `/bookings/[id]`; empty → `EmptyState` ("No upcoming" + "Book a clean" CTA → `/services`; "No past" + hint). Recurring: rows (service code, frequency · weekday · hour, "Since {date}" / "ended {date}"); empty → `EmptyState` "No recurring".

**`/[locale]/bookings/recurring` — Recurring series** (`bookings/recurring/page.tsx`) — *mock data.*
Title + sub, active/paused count line, list of series cards (provider avatar, "{category} · {provider}", cadence weekly/fortnightly/monthly, "Next run {date}", Active/Paused chip, per-card **Pause/Resume** + red **End** — both inert). Dashed "Add recurring" → `/services`. Empty → `EmptyState` (`Repeat` illustration + "Add" CTA).

**`/[locale]/bookings/[id]` — Booking detail** (`bookings/[id]/page.tsx`)
`id` = booking id (404 if not the user's). Status badge + `#xxxxxxxx`. Conditional info bar ("free cancel until 47h" / amber "can't cancel — in progress"). **Provider/booking card:** avatar, provider name, service code · duration; rows: calendar (date/time), map pin (address, if any), credit card (total + currency). **`BookingTimeline`** status stepper. If confirmed/in-progress/completed: red "I have a problem → Report" link → `/bookings/[id]/dispute`. **Sticky bottom action bar:** if pending/confirmed — a square red "✕" cancel button (server action) + a `RescheduleModal` trigger ("Reschedule" — date/time inputs, 4h–30d window); primary CTA — pending → "Pay now" → `/pay/[id]`; completed → `/bookings/[id]/feedback`; otherwise a disabled brand button with the status label.

**`/[locale]/pay/[bookingId]` — Payment** (`pay/[bookingId]/page.tsx`)
404 if not the user's. State `?state=default|loading|threeDS|failed|success`. **success:** full-screen — green check circle, "Payment successful", amount, "redirecting…". **default:** title "Pay" + "🔒 secured" line; payment buttons — **Apple Pay** (black), **Google Pay**, "or pay by card" divider, then a brand-bordered **card fieldset**: card number / exp / CVV / cardholder name — **all pre-filled with test values (4242…, 12/28, 123, MARGARET WANG)**. **failed:** red "declined" alert. **threeDS:** blue "3-D Secure" status block. **Order summary** card: subtotal / tax % / bold Total. **Sticky bottom:** spinner "processing" / "waiting for bank" disabled button when loading/threeDS; otherwise brand **"🔒 Pay $X"** → `/bookings/[bookingId]/success`.

**`/[locale]/bookings/[id]/success` — Payment success** (`bookings/[id]/success/page.tsx`)
404 if not the user's. Centered: `S5PaymentSuccess` illustration; headline "Booking confirmed" (or "Processing…" if still pending); subline "{provider} accepted" (or processing hint). **Booking summary** card: provider avatar + name + service·duration; rows: date/time, address, "Paid $X". Buttons: **"Add to calendar"** (brand, calendar icon), **"Download .ics"** (outline) — *both inert placeholders* — and **"View booking →"** → `/bookings/[id]`.

**`/[locale]/bookings/[id]/feedback` — Leave feedback** (`bookings/[id]/feedback/page.tsx`)
404 if not found; only when booking is `completed`/`released`. Already-submitted (or just submitted) → success screen (green check, "Thanks!", "{provider}", "{rating}★ submitted", "View booking" link). Else: title + "rate {provider}" sub, optional error alert (rating / not_completed / duplicate / server), provider summary card. **Form:** 5 large star-button radio group (5 pre-selected); a row of selectable **tag pills** (Punctual / Professional / Clean / Friendly / Fair — visual only); a **comment** textarea; a **disabled** photo upload; **"Submit & release payment"** (also releases held funds → `released`).

**`/[locale]/bookings/[id]/dispute` — Raise a dispute** (`bookings/[id]/dispute/page.tsx`)
404 if not the user's. Existing/just-submitted dispute → success screen (green check, "Dispute submitted", "case D-xxxxxxxx", current status, "Back to booking"). Else: title + sub; amber **warning notice** ("be honest…"); error alerts (description too short / file too large / bad file type). **Form (multipart):** radio **type** (Provider didn't show / Service incomplete / Damage or breakage / Other); required **describe** textarea (≥20 chars); **file upload** for evidence (JPG/PNG/WebP/HEIC/PDF, ≤10 MB each, camera-icon hint); radio **outcome** (Redo / Partial refund / Full refund); **"Submit"** → booking status → `disputed`.

### Chat / AI

**`/[locale]/chat` — AI assistant** (`chat/page.tsx`)
Full-screen chat (Header hidden on mobile, shown on desktop; tab bar & FAB hidden here). `?from=` sets the back-link target (default `/home`). `?emergency=1` → dedicated emergency view (dark screen, pulsing alert icon, "Emergency", country subtext, huge red `tel:` button 000/911, "close" → `/chat`). **Normal view:** chat header (back chevron, `C9 AICompanion` avatar, "{title}" + green "online" dot, country flag chip); **message feed** — signed-out → AI-companion illustration + "Please sign in to start a chat" + "Sign in" button; signed-in, empty → companion illustration + empty title/hint; else a stream of `ChatBubble`s (me right / ai left), with `role:"system"` rows as centered amber alert pills (GLM errors). **Composer bar:** disabled "+" attach button, text input ("composer" placeholder, 1–2000 chars, disabled if signed-out), disabled mic/voice button, brand circular **Send** button. Submitting persists the user message immediately, scans for emergency keywords (→ `?emergency=1`), defers the GLM reply.

### Notifications

**`/[locale]/notifications` — Notifications** (`notifications/page.tsx`)
Top bar: tabs **All / Bookings / AI / System** (`?tab=`) + a **"Mark all read"** submit. The "AI" tab is always an `EmptyState` (`S4 EmptyChat` illustration). List rows: kind-colored square icon (calendar = booking/payment/dispute, message-circle = review/safety, gear = system/marketing), bold title, optional body, relative time ("3 min ago" / "Yesterday" / localized), red unread dot; unread rows get a faint brand-soft bg; rows with a `link` are clickable. Empty → `EmptyState` "no notifications".

### Profile

**`/[locale]/profile` — Profile menu** (`profile/page.tsx`)
Avatar header: 96px initials avatar, name, "Member since {Mar 2024}". Menu list (icon + label + description + chevron): **Edit profile** → `/profile/edit` · **Security** → `/profile/security` · **Addresses** → `/profile/addresses` · **Payment methods** → `/profile/payment` · **Emergency contacts** → `/profile/emergency` · **Favourites** → `/profile/favourites` · **Notification settings** → `/profile/notifications` · **Help** → `/help`. Separate red **"Sign out"** button (POST → `/auth/logout`).

**`/[locale]/profile/edit` — Edit profile** (`profile/edit/page.tsx`) — *demo (GET round-trip, not persisted).*
Title, optional "Saved" banner, centered 96px avatar, form: **Name**, **Email** (prefilled `margaret@example.com`), **Phone** (prefilled), **Language** select (5 locales), **Save**.

**`/[locale]/profile/security` — Security** (`profile/security/page.tsx`) — *demo (faked).*
Title, Saved/error banners (mismatch / wrong current). **Change password** form: Current / New (≥8) / Confirm + Save. **Two-factor** card: shield icon, hint, "Enable" button — *inert*. **Sessions** list: one entry ("This device", "last active now") + red **"Sign out everywhere"** (POST → `/auth/logout`).

**`/[locale]/profile/addresses` — Saved addresses** (`profile/addresses/page.tsx`)
Title. Empty → `EmptyState` (MapPin) + "Add new" CTA. List of address cards: map-pin icon, label (+ "default" badge if default), full address line; per-card **Edit** (disabled placeholder), **"Set default"** submit (if not default), red **trash** delete. Dashed "Add new" → `/profile/addresses/new`.

**`/[locale]/profile/addresses/new` — Add address** (`profile/addresses/new/page.tsx`)
Back → `/profile/addresses`. Title "Add new". Form card: optional "required" error banner, **Label** (defaults "Home"), **Address line** (required), **Suburb/City** (required) + **State** (2-col), **Postcode**, **Save**. First address becomes default.

**`/[locale]/profile/payment` — Payment methods** (`profile/payment/page.tsx`)
Title + "🔒 secure" banner. Empty → `EmptyState` (CreditCard) + "Add card" CTA. List of card rows: brand badge ("VISA"), "•••• {last4}" (+ "default" badge), "Expires MM/YYYY", **"Set default"** submit (if not default) + a `DeleteCardConfirm` modal (confirm before delete). Dashed "Add card" → `/profile/payment/new`.

**`/[locale]/profile/payment/new` — Add card** (`profile/payment/new/page.tsx`) — *placeholder, no real form.*
Back → `/profile/payment`. Title "Add card" + "🔒 secure" banner. A dashed card: credit-card icon, "Not yet available", note that card capture will go through Stripe Elements, "Back" link.

**`/[locale]/profile/emergency` — Emergency contacts** (`profile/emergency/page.tsx`)
Title + sub. Empty → `EmptyState` (ShieldAlert) + "Add contact" CTA. List of contact cards: red phone-call icon, name (+ red "Primary" badge if priority 1), relationship label + phone; per-card **"Set primary"** submit (if not primary) + red **trash** delete. `?add=1` shows an inline brand-bordered form: optional error banner, **Name** (required), **Phone** (required, tel), **Relationship** select (daughter/spouse/sibling/friend/other), **Save**; otherwise a dashed "Add contact" link.

**`/[locale]/profile/favourites` — Favourites** (`profile/favourites/page.tsx`) — *mock data; `?state=empty` forces empty.*
Title. Empty → `EmptyState` (Heart) + "Browse" CTA → `/services`. Else a list of `ProviderCard`s (name, initials, rating, reviews, distance, $/h, verified + firstAid badges).

**`/[locale]/profile/notifications` — Notification preferences** (`profile/notifications/page.tsx`) — *demo (GET round-trip).*
Title, optional "Saved" banner. Two fieldsets of `Switch` rows: **Channels** — Email (on), SMS (on), Push (off); **Topics** — Bookings (on), Reminders (on), Payments (on), Marketing (off) (each with a hint). **Save**.

**`/[locale]/profile/family` — Family members** (`profile/family/page.tsx`)
Title + sub; optional "invite sent" / "invalid" banners. **Members** list: a "self" row (current user avatar, name·"You", email, "Admin" chip), then each member (avatar, name, email, role chip "Payer"/"Viewer", amber "Pending" chip, red trash remove). **Invite form** (dashed card): "Invite a family member", **Name** (required), **Email** (required), "can book for me" checkbox, **"Send invite"**. *(Real invite/accept flow deferred.)*

### Safety

**`/[locale]/safety/report` — Report a safety incident** (`safety/report/page.tsx`)
Optional `?bookingId=` ties it to a booking. Just-submitted (`?sent=1`) → success screen (green check, "Report submitted", reassurance, "Back to home"). Else: title with red shield-alert icon + sub; a **red emergency banner** ("if this is an emergency…" + "Open SOS" → `/chat?emergency=1`); optional "too short" error. **Form:** radio **severity** (Low / Medium / High — each with a hint); required `datetime-local` "when"; required **describe** textarea (≥30 chars); a **disabled** evidence file upload (image/video/audio); a "police contacted" checkbox; **"Submit"**. High severity maps the report category to "harassment".

### Settings

**`/[locale]/settings/account` — Account settings** (`settings/account/page.tsx`) — *demo (no-op redirect).*
Title, optional "Saved" banner. Selects: **Language** (5 locales), **Region** (AU/US/CA), **Timezone** (Australia/Sydney, America/New_York, America/Toronto, UTC), **Currency** (AUD/USD/CAD), **Save**.

**`/[locale]/settings/privacy` — Privacy & data** (`settings/privacy/page.tsx`)
Title + sub; "Saved" / "confirm required" banners. **Privacy toggles** (checkbox cards): Analytics (on), Marketing (off), Share with family (on) — each with optional hint + **Save** (cosmetic — not persisted yet). **Download your data:** heading, hint, a **"Download"** submit that generates a JSON export; once generated (`?export=`) shows a green **"Download JSON archive"** link. **Delete account** (red/danger): heading, hint, a text input requiring you to type literal **"DELETE"**, then a red **"Delete account"** submit — *actually deletes the user row (FK cascades), signs out, → `/home?deleted=1`.*

---

## 5. Provider app — pages

> Shell: `Header` + mobile `ProviderBottomTabBar` (Workbench / Jobs / Calendar / Earnings / Profile; hidden during register & onboarding). Role gating on every page: not signed in → `/auth/login`; signed in but `role ≠ provider` → `/home`; provider with no profile row → `/provider/register`.

### ⚠️ Compliance gating — the rule designers must reflect

A provider is **`approved` (live)** only when **all four** of these are satisfied (country-driven via `lib/compliance/country.ts`):
1. **ABN** valid & ABR-active — **AU only** (the ABN field is hidden for US/CA);
2. **Background check** status = `cleared` (third-party vendor; mock adapter in test);
3. **All required documents** admin-approved & not expired — AU: police check + first aid + insurance; US: police check + first aid (insurance optional); CA: police check + first aid + insurance;
4. **Stripe Connect** account exists with **payouts enabled** (`details_submitted && charges_enabled && payouts_enabled`).

Only an **active** provider sees new `pending` job dispatches or can **accept** them. A not-yet-active provider sees an amber **"account in review"** banner across the workbench/jobs and a link to `/provider/onboarding-status`. (If a previously-approved provider lapses on compliance, they're demoted to `docs_review` and de-listed from customer search/services/booking step 2, but can still **start / complete / decline** their existing `confirmed`/`in_progress` jobs so customers aren't stranded.) Approval/expiry/document review trigger localized notifications + emails.

### Pages

**`/[locale]/provider` — Provider workbench (home)** (`provider/page.tsx`)
`h1` "Hi, {name}" + today's date. Optional amber **"account in review"** banner → `/provider/onboarding-status`. **Earnings summary card** (→ `/provider/earnings`): green $ badge, "This week", big bold total (held + paid), sub-line "Held {amt}" (amber) · "Paid {amt}" (green), chevron. **Today's jobs** section ("See all" → `/provider/jobs`): empty → dashed "No jobs today"; else up to 10 cards → `/provider/jobs/{id}` (customer avatar, start time + customer name, service category, price · localized status, chevron). A not-yet-active provider does **not** see new `pending` dispatches.

**`/[locale]/provider/jobs` — Jobs list** (`provider/jobs/page.tsx`)
`h1` "Jobs"; optional amber banner. **Pill tabs** (`?tab=`): **Today** (active statuses, today) / **This week** (active, next 7d) / **History** (completed/cancelled/released/disputed, newest first). Empty → `EmptyState` (`ListChecks`) with tab-specific title + hint. List (≤50) → `/provider/jobs/{id}`: customer avatar, uppercase date · time, bold customer name, service category, `MapPin` + truncated address, price · status. Not-yet-active provider's list excludes `pending`.

**`/[locale]/provider/jobs/[id]` — Job detail** (`provider/jobs/[id]/page.tsx`)
`notFound()` if not owned; a `pending` job viewed by a not-yet-active provider → redirect to onboarding-status. Top: uppercase date · time; `h1` = service category. Status banners: `completed` → green "Completed"; `cancelled` → amber "cancellation policy" warning (and the bottom bar is suppressed). **Customer card:** avatar, name, phone (tabular); round green phone button (`tel:`) if present. **Address card:** MapPin badge, full address; **"Navigate"** → Google Maps in a new tab (hidden if no address). **Notes card** (customer's booking notes). **Price breakdown:** Base, Tax, divider, **Total** (bold). **Report problem** button (red outline, full width) → `/safety/report?bookingId=…`. **Sticky bottom action bar** (when not completed/cancelled): `pending` → **Decline** (opens `DeclineJobModal`: title, hint, 4-option radio reason list, cancel/submit) + primary **Accept job** (requires active provider); `confirmed` → primary **"I'm on the way"** (→ in_progress); `in_progress` → primary **"Mark complete"** (→ completed). Invalid transitions → `?error=invalid_transition`.

**`/[locale]/provider/availability` — Weekly availability** (`provider/availability/page.tsx`)
`h1` "Availability" + hint. Green "saved" banner after `?saved=1`. **Quick-apply templates card:** "Apply a template" + two pills — "Mon/Wed/Fri mornings", "Weekdays afternoons" (clicking previews via `?tpl=`, with "Template previewed — hit Save to apply"). **Main form:** 7 rows (Mon→Sun), each = day label + 3 toggle-buttons (Morning / Afternoon / Evening) styled as 48px buttons; checked = brand border + brand-soft bg; pre-checked from DB rows / template preview. Full-width primary **Save** → replaces all `providerAvailability` rows.

**`/[locale]/provider/blocked-times` — Time off** (`provider/blocked-times/page.tsx`) *(not in the tab bar)*
`h1` "Time off" + sub. Green "added" banner after `?added=1`; error banner if end ≤ start. Empty → `EmptyState` (`CalendarOff`) + big brand **"Add time off"** (`?add=1`). List: cards "{startDate} → {endDate}" + reason label (Vacation / Training / Other) + red trash delete (per row). When non-empty, a dashed "+ Add time off" button. **Add form** (`?add=1`, brand-bordered card): **From** (date), **To** (date), **Reason** (select: Vacation / Training / Other), primary **Save**.

**`/[locale]/provider/calendar` — Month calendar** (`provider/calendar/page.tsx`) *(read-mostly)*
`h1` "Calendar". Month switcher: prev/next chevrons (`?ym=YYYY-MM`) around "Month YYYY". Grid: Monday-first weekday header, 6×7 day cells — **booked** = brand-soft bg + brand text + small brand dot; **available** = plain bordered; **blocked** = surface-2, muted, strikethrough; **muted** = out-of-month (greyed, `aria-disabled`); each in-month cell links to `/provider/availability`. Legend: Booked (brand) · Available (green) · Blocked (grey).

**`/[locale]/provider/earnings` — Earnings** (`provider/earnings/page.tsx`)
`h1` "Earnings". **Range pills** (`?range=`): This week / This month / All. **Four stat cards** (2×2): **Gross** / **Net** (accent — brand border/bg) / **Held** / **Paid** (Net = Gross − 18% platform fee; Held/Paid from `wallets`). **Platform fee card:** "Platform fee" + amount + "(18%)". *(Note: this page hard-codes 18%, while the admin Payments page uses `PLATFORM_FEE_PERCENT`, default 20% — a pre-existing inconsistency in the codebase; design copy should not bake in a specific number.)* **7-day trend card:** "This week", a 7-bar mini bar chart (height ∝ that day's revenue, peak-scaled, 96px max; zero days = surface-2 stub), day-of-month labels under each bar, each bar `aria-label` "Mon 5 $X". **Transactions list:** range's bookings (service category, "date · customer · STATUS", price right); empty → "No payouts yet". **Export CSV** button — *disabled* with tooltip "CSV export ships when payouts are wired".

**`/[locale]/provider/payouts` — Payouts** (`provider/payouts/page.tsx`) — *mock data; save is a no-op redirect.*
`h1` "Payouts". "Saved" banner after `?saved=1`. **Stripe account card:** green check badge, "Payout account", green "Active", secondary **"Re-verify"** (inert). **Frequency form:** fieldset "Payout frequency" — radio **Daily / Weekly / Manual** (checked = brand border), primary **Save** (`?freq=&saved=1`). **History:** "Payout history" — 3 mock payouts (green arrow badge, amount bold, "date · stripeTransferId").

**`/[locale]/provider/profile` — Provider public-profile editor** (`provider/profile/page.tsx`) — *save is a stub (`?saved=1`, no DB write).*
`h1` "Profile". "Saved" banner. **Identity card:** large initials avatar, provider name, **"Preview"** → `/provider` (view as customer). **Form:** **Bio** (textarea, 4 rows, with hint); **Languages** fieldset — pill-toggle checkboxes for en, zh-CN, zh-TW, ja, ko, es, ar, vi (current locale pre-checked); **Gender** select — Private (default) / F / M; primary **Save**.

**`/[locale]/provider/services` — Services & rates** (`provider/services/page.tsx`) — *mock data; save is a stub.*
`h1` "Services". "Saved" banner. **Form:** one card per offered service (mock: Cleaning @55/2h, Personal care @70/1h) — category name + red trash "remove"; two inputs **Rate ({currency symbol})** (number) and **Min hours** (number 1–8); helper "Recommended {min}–{max} {sym}" (US prices auto-scaled ×0.65). Then a dashed **"+ Add service"** button, then primary **Save**.

**`/[locale]/provider/register` — Provider onboarding wizard (5 steps)** (`provider/register/page.tsx`)
Turns a signed-in customer into a provider. Sign-in only at entry (the user may still have `role = customer`); state is persisted to a `providerProfiles` draft between steps. **Tab bar hidden.** Chrome: `h1` "Become a provider"; sub-line "Step {n} · {step title}"; a **5-segment progress bar** (completed = green, current = brand, future = grey); error alert banner for `?error=` codes (required fields, no category, ABN invalid/inactive/lookup-failed, missing consent); footer **Back** link (or → `/home` from step 1) + primary **Next** / **Submit**.
- **Step 1 — Profile basics:** Full name, **ABN** (AU only — validated against the ABR; once valid, the resolved business name shows read-only), Phone, Address, Bio (textarea + hint). name/phone/address required; ABN must be active.
- **Step 2 — Documents:** info list of required docs — Police check, First aid, Insurance (optional in US) — each with an Upload badge + visual "Upload" file input. *(The selected file is not persisted in this wizard step; the step just advances. Real document upload/re-upload happens later at `/provider/compliance`.)*
- **Step 3 — Service area & categories:** card with `MapPin` "Service area" + hint + a placeholder map box + **Radius** (number, 1–50 km, default 15/10); fieldset "Service categories" — pill checkboxes (Cleaning, Cooking, Garden, Personal care, Repair); ≥1 required.
- **Step 4 — Availability:** hint + 7 day rows × 3 slot toggles (Morning/Afternoon/Evening), same idiom as the availability page.
- **Step 5 — Payments & consent:** Stripe Connect card with hint; "Stripe onboarding started" green chip if connected; full-width Stripe-purple (`#635BFF`) **"Connect with Stripe"** / **"Continue Stripe onboarding"** (→ a Stripe Connect onboarding link). Below a divider: a **background-check consent** block — bold title + required checkbox + consent text. Submitting (consent required) sets onboarding status to `docs_review`, stamps `submittedAt` + consent metadata/IP, promotes the user to `role = provider`, re-issues the session, kicks off the background check, → `/provider/onboarding-status`.

**`/[locale]/provider/onboarding-status` — Application status** (`provider/onboarding-status/page.tsx`)
Vertical step-tracker of where the provider stands. **Tab bar hidden.** `h1` "Application status" + sub. **Timeline (`<ol>`):** each step = a circular status icon (with connecting line) + label + state label + optional timestamp + optional inline CTA. States: **done** (green check) / **inProgress** (brand spinner, `animate-spin`) / **waiting** (grey clock) / **action** (amber alert icon).
- **Application submitted** — done (with submitted timestamp) or in-progress.
- **ABN verified** (AU only) — done, or "action" with CTA → `/provider/register?step=1` to fix the ABN.
- **Documents reviewed** — done if all required docs approved & unexpired; "action" if any rejected (CTA → `/provider/compliance`); in-progress if uploaded & pending.
- **Background check** — waiting if none; done if cleared; "action" with **Retry** button (`RotateCcw`) if failed/expired; in-progress otherwise. Shows cleared/requested timestamp.
- **Stripe payouts** — shown as done once the provider is fully approved; if a Stripe account exists but approval is still pending, it shows in-progress; otherwise CTA → `/provider/register?step=5` ("Continue" / "Connect Stripe").
- **Go live** — done if approved, else waiting.

**`/[locale]/provider/compliance` — Compliance documents** (`provider/compliance/page.tsx`)
Upload / re-upload background-check, first-aid, insurance, identity, WWC documents (the exact set is country-driven). `h1` "Compliance" + sub. **Banners:** amber "documents expiring/missing" if any required doc is missing/expiring/expired; green "Document uploaded — pending admin review" after `?uploaded=`; red error banner ("File too large (max 10 MB)", "Only JPG/PNG/WebP/HEIC/PDF accepted", "Pick a file", "Upload failed"). **Document list:** one card per applicable doc type — status badge (`FileText`; green = valid / amber = expiring (<30d) / red = expired / grey = missing), title (+ "(optional)" tag for non-required), "Expires on {date}", "# {documentNumber}", an uppercase state pill, "Awaiting admin review" note if pending, and a **view** link → `/api/compliance/documents/{id}` (private-storage download). Below a divider, an inline **re-upload form:** **Doc number** text input, **Expires** date input, "Choose file" (accepts jpeg/png/webp/heic/pdf), primary **Re-upload**. Footer note about local storage / 10 MB / file types. *(If an already-approved provider re-uploads a required doc, onboarding status reverts to `docs_review`, an audit row is written, admins are notified.)*

**`/[locale]/provider/reviews` — Reviews & ratings** (`provider/reviews/page.tsx`)
`h1` "Reviews". **Stats row (3 cards):** average rating (big, brand star icon) / review count / "{pct}% positive" (≥4★ share). **Per-dimension breakdown card:** 5 rows (Punctual, Professional, Clean, Attitude, Price) — label + horizontal progress bar (currently all = the overall average) + numeric average + a footnote ("per-dimension breakdown ships when category-tagged reviews land"). **Star filter pills** (`?stars=`): All, 5★, 4★, 3★, 2★, 1★. Empty → "—" placeholder card. **Review list (≤100):** cards — customer initials avatar, name + date, 5-star row (filled by rating), comment text. Each review either shows the provider's existing **reply** (in a surface-2 box "You replied") or a **Reply** button opening `ReplyReviewModal` (title, textarea, cancel/submit; reply ≥5 chars; upserts `reviewReplies`).

---

## 6. Admin console — pages

> Shell: `AdminShell` (sticky top bar + left sidebar / mobile drawer). Every page calls `getAdmin()`; not signed in → `/admin/login`. Sidebar groups — **Primary:** Overview, Disputes, Safety, Providers, Refunds, Analytics. **Secondary:** Reports, Customers, Bookings, Payments, AI, Settings. *(KB and Settings-detail bits are reachable directly but a couple of links aren't surfaced in the sidebar.)*
>
> Two detail patterns coexist and should ideally be unified: **(a)** right-side **slide-over drawer** (max-w 480px, opened via `?id=`) on list pages, and **(b)** full dedicated **`/.../[id]` pages** (richer — disputes, safety, providers, customers have *both*). Two filter styles coexist too: **pill tabs** (`role=tablist`, on Bookings & Analytics) vs. a `<select>` + "Apply" GET form (Disputes, Safety, Providers). Tables: uppercase `text-tertiary` headers on `bg-surface-2`, `border` row dividers, the active/drawer-open row highlighted `bg-brand-soft`. "Applied/Saved ✓" green banners + red error banners are driven by query params.

**`/[locale]/admin` — Overview** (`admin/page.tsx`)
`h1` "Overview". **Alerts** (conditional): open safety events > 0 → danger banner; open disputes ≥ 5 → warning banner (each with `AlertTriangle`). **KPI grid (6 cards)**, icon tile + label + big number: New orders today (`ShoppingBag`) · Open disputes (`Scale`, warning border if > 0) · Pending providers (`Users`) · Open safety events (`ShieldAlert`, warning border if > 0) · GMV last 7 days (`TrendingUp`, currency) · AI resolution rate % last 7 days (`Bot`). **Quick links:** 3 large arrow-cards → Review disputes / Review safety / Review providers. Navigation only.

**`/[locale]/admin/analytics` — Analytics** (`admin/analytics/page.tsx`)
`h1` analytics title. **Range tabs** (`role=tablist`, `?range=`): Day / Week / Month / Quarter / Year. A small "{N} bookings · {M} customers in range" line. **Orders chart card:** "Last 7 days, by country" — a 7-day stacked bar chart with country colors (AU = brand, US = success/green, CA = warning/amber; zero = 20% opacity); day-of-week labels under; a legend with colored dots + country names. **KPI grid (5 cards, 2-col mobile / 5-col desktop):** Reorder rate % · Avg rating (or "—") · Dispute rate % (1 dp) · AI resolution rate % · Payment success rate % (1 dp). Read-only.

**`/[locale]/admin/disputes` — Disputes list** (`admin/disputes/page.tsx`)
`h1` "Disputes". Success banner on `?applied={id}`; error banner on `?error=invalidAmount`. **Filter bar (GET form):** Status select — all / open / evidence_needed / decided / closed — + "Apply". "{N} cases" line. **Table:** ID `D-xxxxxxxx` (link) · Customer · Provider (lg+) · Amount (currency) · Status badge (open = danger, evidence_needed = warning, decided = success, closed = neutral) · SLA (created date + clock icon). ≤100 rows, newest first. Empty → "emptyDisputes" inside the card. **Detail drawer (`?id=`):** header `D-xxxxxxxx` + close; definition list (Customer / Provider / Amount / Status); "Dispute timeline" — the reason text in a box; "Conversation" — dispute messages w/ author + timestamp. **Decision form** (only if status ∉ {decided, closed}): radio of 4 actions — **Full refund** / **Partial refund** / **Reject claim** / **Escalate (request more evidence)**; a number input for the partial-refund amount (0…booking total); optional decision **Note** textarea; **"Apply decision"** submit. Already decided → a green "Already decided." note. *(On decision: updates the dispute, appends a `[Decision: …]` message, flips the booking out of `disputed` — `cancelled` for refunds, `completed` for denials — with an audit row, notifies both parties.)*

**`/[locale]/admin/disputes/[id]` — Dispute detail** (`admin/disputes/[id]/page.tsx`) *(richer than the drawer; 404 if not found)*
Back → "Disputes". `h1` `D-xxxxxxxx` + status badge. Success banner `?applied=1`; error banner `?error=invalidAmount`. **4-card grid:** Customer (name+email) · Provider (name+email) · Booking (`B-xxxxxxxx` link → `/admin/bookings?id=…`, booking status) · Amount (booking total + refund amount if set). **"Dispute timeline" card:** reason text. **"Conversation" card** (conditional): dispute messages, admin-only ones tinted warning, with timestamps. **"Evidence" card** (conditional): uploaded evidence rows — kind, timestamp, external file URL, note. **Decision form** (same 4 radios + partial amount + note) when not decided/closed; this full-page action also emails both parties (`buildDisputeUpdateEmail`). Decided/closed → green summary card ("Decided · {resolution}" + decided-at + note).

**`/[locale]/admin/safety` — Safety / incident reports list** (`admin/safety/page.tsx`)
`h1` "Safety". Success banner on `?applied={id}`. **Filter bar (GET form):** Status select — all / open / reviewed — + "Apply". "{N} reports" line. **Table:** ID `I-xxxxxxxx` (link) · Category badge (`ShieldAlert`; harassment/accident = danger, theft/damage = warning, else neutral) · Reporter (name) · Status (reviewed = success / open = warning) · Submitted (datetime, md+). ≤100 rows. Empty → "emptySafety". **Detail drawer (`?id=`):** header `I-xxxxxxxx` + close; definition list (Reporter / Category / Booking id / Submitted / Reviewed [+timestamp+reviewer if reviewed]); the incident body text in a box. **Decision form** (only if not reviewed): radio — **Warn** / **Suspend** / **Ban** / **Escalate to police** / **Close without action**; optional **Note** textarea; **"Apply"** submit. Reviewed → green box with the recorded action. *(On decision: stamps `reviewedAt/reviewedBy/action`, notifies the reporter.)*

**`/[locale]/admin/safety/[id]` — Incident report detail** (`admin/safety/[id]/page.tsx`) *(404 if not found)*
Back → "Safety". `h1` `I-xxxxxxxx` + category badge. Success banner `?applied=1`. **4-card grid:** Reporter (name+email) · Booking (`B-xxxxxxxx` link or "—") · Submitted (datetime) · Status (Reviewed · reviewer / Open). **"Dispute timeline" card:** incident body. **"Photos" card** (conditional): grid of user-uploaded evidence images (square thumbnails). **Decision form** (same 5 radios + note) when not reviewed; else a green summary card (action + reviewed-at + reviewer).

**`/[locale]/admin/providers` — Providers list** (`admin/providers/page.tsx`)
`h1` "Providers". Success banner on `?applied={id}`. **Filter bar (GET form):** Status select — all / pending / docs_review / approved / rejected / suspended — + "Apply". "{N} providers" line. **Table:** Provider (avatar + display name link + short id) · Country (md+) · Applied at (date) · Status badge (pending = neutral, docs_review = warning, approved = success, rejected/suspended = danger). ≤100 rows. Empty → "No providers". **Approve drawer (`?id=`):** header w/ provider name + close; definition list (Email / Country / Applied at / Status / Address / Categories); Bio block (if any); **"Document check"** — list of uploaded documents w/ type + status badge, or "No documents uploaded yet." **Decision form** (only if not decided): radio — **Approve** / **Send back** / **Hold** / **Reject**; optional **Note** textarea; **"Apply"**. Decided → "Decision already recorded." *(This drawer's "Approve" is a straightforward patch; the full detail page's "Approve" runs the gated auto-approval — see below.)*

**`/[locale]/admin/providers/[id]` — Provider detail (compliance workbench)** (`admin/providers/[id]/page.tsx`) *(404 if not found)*
Back → "Providers". Success banner `?applied=1`; error banner with context-specific messages (`noteRequired`, `missingDoc`, `conditionsNotMet` — "Can't approve yet — background check, required documents, ABN (AU) and Stripe payouts must all be in order. Use Force approve to override.", `replayNoRow`, `replayFailed`, generic). **Header card:** avatar (72px) + display name + status badge; email; country · applied date; categories; bio; rejection/suspension reason banner if applicable. **4-stat grid:** Bookings (count + "N done") · Revenue lifetime ($ + "30d: $X") · Rating (avg + "N reviews") · Disputes (count). **"Wallet" card:** Held vs Available balances (currency) or "No wallet yet". **"Compliance documents" card:** per-document rows — type (uppercase), document number, status badge, "open" link → `/api/compliance/documents/{id}`, reviewer note — each with an inline **review form:** a "Reason (required to reject)" text input + **Approve** / **Reject** buttons (writes an `adminActions` audit row; on approve re-runs auto-approval). **"Compliance & verification" card:** definition list — for AU/ABN holders: **ABN** (+ active/inactive badge) and **Registered business**; **Background check** (status, vendor, external ref, cleared/expires dates, last error) with a **"Re-run background check"** button if failed/expired; **Background check consent** (timestamp · version · IP, or "not given"). **"Webhook events needing attention"** sub-section (conditional): dead-letter list of orphaned/failed compliance webhook events (status, vendor, external ref, received date, error) each with a **"Replay"** button. **"Recent bookings" card:** ≤8 — `B-xxxxxxxx`, scheduled date · status, price. **"Recent reviews" card:** ≤5 — star rating, date, comment. **Decision form (bottom):** "Action" radio (options conditional on status) — **Approve** (re-runs gated auto-approval — does NOT rubber-stamp) / **Force approve (override — note required)** / **Send back** / **Hold** / **Reject** / **Suspend** (only if approved) / **Resume** (only if suspended); a **Note** textarea; **"Apply"**. *("Approve" only promotes if all country gates are met, else `conditionsNotMet`; "Force approve" requires a note + writes a `provider.force_approve` audit row with `bypassedChecks: true`; force-approve & reject also email the provider.)*

**`/[locale]/admin/refunds` — Refunds** (`admin/refunds/page.tsx`)
`h1` "Refunds". Success banner on `?applied={id}`. **Table:** ID · Booking (short id) · Customer (name) · Amount (+ currency) · Reason ("Dispute resolution" / "Self-service") · Status badge (queued = warning, processing = brand, done = success, failed = danger) · action cell. ≤200 rows, newest first. **queued** rows show a **"Process"** button (`RotateCcw`) that flips the refund to `processing`; other rows show "—". *(Real Stripe refund execution is out of scope.)* Empty → "refundEmpty".

**`/[locale]/admin/payments` — Payments** (`admin/payments/page.tsx`) *(read-only dashboard)*
`h1` "Payments". Header has two **disabled** buttons: "Export CSV" and "Export PDF" (`Download`). **4-card KPI grid:** Inflow ($ — sum of captured payments) · Outflow ($ — sum of paid payouts) · Platform fee ($ — `PLATFORM_FEE_PERCENT`% of inflow, default 20%) · Chargebacks (count of refund records). **"Platform fee" card:** the rate, "set via `PLATFORM_FEE_PERCENT`", total refunded across N refunds. **"Suspicious activity" card:** "none" placeholder.

**`/[locale]/admin/reports` — Reports (review moderation)** (`admin/reports/page.tsx`)
*(This is "Reports" in the sidebar = user-flagged **reviews** to moderate, not analytics.)* `h1` "Reports" + subtitle. Success banner on `?applied={id}`. List of report cards (unresolved only, newest first): `Flag` icon tile; report id · review id; "Reported review · {customer name} · {rating}★"; the reviewed comment as a blockquote (if any); Reporter name; Reason (Spam / Abusive / False / Off-topic / Other); details text (if any). **Action form (3 buttons):** **Keep** (re-publishes the review) / **Delete** (review status → `removed`) / **Warn user** (primary — leaves the review, out-of-band warning). Empty → "empty" card.

**`/[locale]/admin/customers` — Customers list** (`admin/customers/page.tsx`)
`h1` "Customers". Row-count line. **Table:** Customer (avatar + name link + email) · Country (md+) · Bookings (count) · Spend (lifetime on completed/released). ≤100, newest first. Empty → "No customers yet". **Detail drawer (`?id=`):** header w/ display name + close; definition list (Email / Country / Registered date / Bookings / Spend); a **"View full"** link → `/admin/customers/{id}`; an info note that reset-password / merge / GDPR-delete actions ship in a follow-up wave.

**`/[locale]/admin/customers/[id]` — Customer detail** (`admin/customers/[id]/page.tsx`) *(404 if not a customer)*
Back → "Customers". **Header card:** avatar (72px) + display name + email + "registered at" date · country. **4-stat grid:** Bookings · Spend ($) · Disputes · Family members. **"Bookings" card:** ≤10 recent — service category, scheduled date · status, price; "—" if none. **"Reviews given" card:** ≤5 published — star rating, date, comment; "—" if none. **2-card mini grid:** Addresses count · Emergency contacts count. **Info note:** suspend/resume/ban + payments/devices/login-history ship later. **3 disabled buttons:** "Suspend" / "Resume" / "Ban".

**`/[locale]/admin/bookings` — Bookings** (`admin/bookings/page.tsx`)
`h1` "Bookings" + subtitle. **Filter tabs (`role=tablist`, `?filter=`):** All / Stuck > 24h / In escrow / Released / Cancelled. "{N} rows" line. List of booking rows (flex cards, not a table): stuck bookings get an `AlertTriangle` warning tile; `#xxxxxxxx` id; "customer name → provider name"; price (currency + amount); status badge (pending = warning, confirmed/in_progress = brand, completed/released = success, cancelled = neutral, disputed = danger); "N minutes ago" (sm+). ≤100, newest first. View/monitor only — other admin pages deep-link here via `?id=…` but there's no per-booking drawer yet. No explicit empty-state message.

**`/[locale]/admin/ai/conversations` — AI conversations** (`admin/ai/conversations/page.tsx`)
`h1` "AI conversations" + subtitle. **Table:** ID (short id, link) · Customer (name / email-prefix / "(anonymous)") · Locale (uppercase) · Msgs (count) · Status — badges **EMERGENCY** (danger, `ShieldAlert`) if emergency was triggered, **RESOLVED** (success, `Check`) if closed. ≤100, newest first. Empty → "—". **Transcript drawer (`?id=`):** header `xxxxxxxx` + close; "{user label} · {LOCALE}"; chat-bubble transcript — user right-aligned brand-colored, assistant left-aligned neutral, whitespace preserved. Read-only audit.

**`/[locale]/admin/ai/kb` — AI knowledge base** (`admin/ai/kb/page.tsx`) *(not linked in the sidebar)*
`h1` "Knowledge base" + an **"Add"** button (`Plus`, `?add=1`). Success banners: "saved" (`?saved=1`), "deleted" (`?deleted=1`). List of entry cards (grouped by category then sort order): Question (bold); badges — category (Pricing / Policy / How-to / Safety), locale (uppercase), "OFF" (warning) if disabled; answer text; a **delete** button (`Trash2`, danger-outline icon). Empty → "—" card. **Add form** (`?add=1`, brand card): **Category** select (policy/pricing/how-to/safety), **Language** select (EN / ZH-CN / ZH-TW / JA / KO), **Question** input, **Answer** textarea (5 rows, with a "variables" hint), **"Save"**. *(Save/delete additionally require `role = admin`.)*

**`/[locale]/admin/settings` — Settings** (`admin/settings/page.tsx`)
`h1` "Settings". Success banner on `?saved=1`. **One form** with sections (cards): **1. Fee rates** — read-only: shows `PLATFORM_FEE_PERCENT`% + a note it's an env var. **2. Cancellation window** — editable number input (hours, 0–168, default 24) — *the only persisted setting* (`adminSettings`, key `cancellation.window_hours`; writes an `auditLog` row). **3. Emergency keywords** — a **read-only** textarea pre-filled with the enabled `ai_emergency_keywords` (comma-joined) + count; hint says it's managed via DB for now. **4. Admins** — list of admin users (email + name badge), ≤20; "—" if none. **5. Audit log** — last 5 entries (action · timestamp); "—" if none. **Submit:** "Save" primary block (only the cancellation window persists). *(Save requires `role = admin`.)*

---

## 7. Public / marketing / utility pages

**`/[locale]` — Locale root** (`[locale]/page.tsx`) — no UI; server-redirects to `/[locale]/home`.

**`/[locale]/donate` — Donation campaign landing** (`(public)/donate/page.tsx`) — `force-dynamic`; `notFound()` if no active campaign; own SEO meta.
`Header` + a long marketing page:
- **Hero** (radial-gradient bg): a pill badge with a green dot, big extrabold 36–44px headline with a brand highlight span, 18px subtitle, two CTAs — primary **"Donate now →"** (anchor `#donate`) + outline **"See where it goes"** (anchor `#allocation`) — and a row of three trust statements separated by `·`. **`ProgressCard`** (right column on desktop): "Raised" big brand amount vs "Goal" (right-aligned), a `ProgressBar`, "{X}% complete" + "{N} days left" (default 23), a 3-up stat grid: donor count · average gift · communities (default 12). Live numbers from `getCampaignProgress`.
- **`ImpactStats`**: eyebrow + h2, then a 2×2 (mobile) / 4-up (desktop) grid of tiles — colored emoji chip (👵 / 🏠 / 📍 / 🤝), big 28px number ("8,640+", "52,300", "12", "1,150"), label (seniors served / visits / cities / volunteers). *Hard-coded demo values.*
- **`Stories`**: h3 + 3-up card grid — colored circular avatar with a Chinese surname initial (陈/王/林), name + meta, an italic testimonial quote, two colored tag chips. *Hard-coded demo content.*
- **`AllocationDonut`** (`#allocation`, surfaced bg with top/bottom borders): left = eyebrow + h2 + three icon blocks (💙 program delivery / ⏳ … / 🌱 …) with title + body; right = a white card with an SVG donut chart (Stripe-style segments, "95%" + center label), a legend (colored dot + label + bold % per segment), a footnote. Allocation items from i18n.
- **Donate form section** (`#donate`, max-w-3xl): centered heading block (eyebrow + h2 + subtitle), then **`DonateForm`** (client) — **Once / Monthly** segmented toggle; **preset amount** buttons $25 / $50 / $100 / $250 (2-up mobile / 4-up desktop, big bold, active = brand border + brand-soft fill + `aria-pressed`); a dynamic **hint line** under presets (e.g. "$50 buys…"; turns red + "over limit" if > $50,000); **custom amount** input (labeled, leading `$` adornment, `type=number`, min 1); **donor fields** — Name (required), Email (required, with hint), Phone (optional, `type=tel`) — Name/Email side-by-side on desktop; a **Message** textarea (3 rows, optional); a **"Donate anonymously"** checkbox; **submit** (brand, full-width, dynamic label "Donate $X" / "Donate $X / month" / "Processing…", disabled when invalid, `aria-busy` while submitting → POSTs to `/api/donate/checkout`, then `window.location.assign`s to the Stripe Checkout URL). **States:** "pick an amount" validation hint; red `role="alert"` error line with ⚠ on API failure; disabled+dimmed button while submitting. **Payment footer:** "Payments processed by…" caption, a row of provider chips (Stripe / PayPal / WeChat Pay / Alipay, dimmed), a small note.

**`/[locale]/donate/success` — Donation thank-you** (`(public)/donate/success/page.tsx`) — `force-dynamic`; `noindex, nofollow`.
`Header` + centered main (min 60vh): a 💙 emoji (5xl), extrabold "Thank you" h1, a body paragraph chosen by mode (`bodyOnce` vs `bodyMonthly`) that substitutes the formatted amount (`$NN.NN` from `findDonationBySessionId`, falls back to "—") and the donor email. Single brand CTA → `/` (home).

**`/[locale]/donate/cancel` — Donation cancelled** (`(public)/donate/cancel/page.tsx`) — `noindex, nofollow`.
`Header` + centered main (min 60vh): extrabold h1, a secondary body paragraph, a single brand CTA → `/donate` (try again). Static.

**`/[locale]/help` — Help center hub** (`(public)/help/page.tsx`)
`Header` (with country + signed-in initials) + main: h1 + subtitle; a **search bar** (`role="search"` GET form → `/help?q=…`; one big h-14 rounded input with placeholder + aria-label, prefilled from `?q`; *backend search is future — it just round-trips the query*); **Categories** h2 + a 2-up (mobile) / 3-up (sm+) grid of category cards (~100px tall, brand-soft icon chip — `Sparkles` / `Calendar` / `CreditCard` / `Shield` / `UserCircle` — + bold label → `/help#{categoryId}`: Getting started / Bookings / Payments / Safety / Account); **Popular articles** h2 + a single bordered list (rows separated by hairlines, each ~72px: title bold 16px + summary 13px secondary + trailing `ChevronRight` → `/help/{slug}`; driven by the static `HELP_ARTICLES` array, each row carrying its `category` as an `id` anchor); **Contact card** — brand-bordered, brand-soft, a brand circular `Phone` icon, bold title + subtitle, a brand **CTA** → `/chat`.

**`/[locale]/help/[slug]` — Help article** (`(public)/help/[slug]/page.tsx`) — `generateStaticParams` over all `HELP_ARTICLES`; `notFound()` if the slug is unknown.
`Header` with `back` + main: category eyebrow (uppercase, brand, tracked); h1 (localized per article); "Last updated {date}" (tertiary); body (a stack of 17px leading-relaxed paragraphs — no images/lists yet); a **"← Back to help"** link (brand, 48px) → `/help`.

**`/[locale]/oops` — Generic error landing** (`[locale]/oops/page.tsx`)
`Header` + centered main: a large warning-soft circle with `AlertTriangle` (56px), h1, a ≤340px-wide secondary body, two buttons — brand **"Home"** → `/home` + bordered **"Contact"** → `/help`.

**`/[locale]/error.tsx` — Route error boundary** (client) — catches runtime errors in the locale subtree, reports to Sentry. Centered main: large warning-soft circle with `AlertTriangle` (56px), h1, ≤340px secondary body, an optional tertiary `ref: {error.digest}` line; two actions — brand **"Retry"** (calls `reset()`) + bordered **"Home"** → `/home`.

**`/[locale]/not-found.tsx` — Localized 404** — standalone full-screen centered main (min-h-dvh, no Header): the `S3 EmptyBookings` illustration (220×150), h1, a ≤320px secondary hint, a brand **"Home →"** → `/home`, and a brand text-link → `/help` ("Ask AI").

**`/[locale]/[...rest]` — Catch-all** (`[locale]/[...rest]/page.tsx`) — no UI; calls `notFound()` so any unmatched path under a locale renders the localized 404 with a proper 404 status.

**`/[locale]/dev/components` — Component gallery** (`[locale]/dev/components/page.tsx`) — *dev builds only (`notFound()` in production).*
`Header` + main + the global AI float button. A storybook-style showcase: **Buttons** (Primary / Secondary / Ghost / Danger / Disabled; Small / Medium / Large), **Inputs** (default + `invalid`), **Status badges** (pending / confirmed / in-progress / completed / cancelled / refunded), **Card** (`Card` + `CardTitle` + `CardBody`), **Skeleton** (shimmer blocks), **Illustrations** placeholders (`C1 GrandmaWang`, `C3 HelperMei`, `C9 AICompanion`, `S1 TeaTime`, `S5 PaymentSuccess`, `S7 NetworkError`), and a footer line with the current `locale` in a `<code>` tag.

---

## 8. Appendix — full route inventory (75 pages)

Legend: 🟢 fully wired · 🟡 mock data / demo no-op / placeholder controls · 🔁 has a dynamic `[param]` segment

### Public / utility (14)
| Route | Notes |
|---|---|
| `/[locale]` | redirect → `/home` |
| `/[locale]/auth/login` | sign in; Consumer/Provider tabs; Google/Apple 🟡 inert |
| `/[locale]/auth/register` | create account; Google/Apple 🟡 inert |
| `/[locale]/auth/verify` | 6-digit email code; states pending/resent/success/expired |
| `/[locale]/auth/forgot` | request password-reset code |
| `/[locale]/auth/reset` | enter code + new password; states default/success/expired |
| `/[locale]/donate` | donation campaign landing; impact stats/stories 🟡 demo data |
| `/[locale]/donate/success` | thank-you (noindex) |
| `/[locale]/donate/cancel` | cancelled (noindex) |
| `/[locale]/help` | help hub; search 🟡 round-trip only |
| `/[locale]/help/[slug]` 🔁 | help article (static-generated) |
| `/[locale]/oops` | generic error landing |
| `/[locale]/dev/components` | 🟡 dev-only component gallery |
| `/[locale]/[...rest]` 🔁 | catch-all → localized 404 |
| *(also: `error.tsx`, `not-found.tsx` — route boundaries, not in the count above)* | |

### Customer (29)
| Route | Notes |
|---|---|
| `/[locale]/home` | dashboard |
| `/[locale]/search` | unified search (providers / services / help) |
| `/[locale]/services` | category list |
| `/[locale]/services/[cat]` 🔁 | providers by category; filter pills 🟡 inert |
| `/[locale]/providers/[id]` 🔁 | provider detail + reviews |
| `/[locale]/bookings/new` | 4-step booking wizard |
| `/[locale]/bookings` | bookings list (Upcoming/Past/Recurring) |
| `/[locale]/bookings/recurring` | 🟡 recurring series (mock data) |
| `/[locale]/bookings/[id]` 🔁 | booking detail |
| `/[locale]/bookings/[id]/success` 🔁 | payment success; calendar/.ics 🟡 inert |
| `/[locale]/bookings/[id]/feedback` 🔁 | leave feedback (releases payment); photo upload 🟡 disabled |
| `/[locale]/bookings/[id]/dispute` 🔁 | raise a dispute (multipart) |
| `/[locale]/pay/[bookingId]` 🔁 | payment; card form 🟡 test-prefilled |
| `/[locale]/chat` | AI assistant + emergency view |
| `/[locale]/notifications` | notifications (All/Bookings/AI/System) |
| `/[locale]/profile` | profile menu |
| `/[locale]/profile/edit` | 🟡 edit profile (demo) |
| `/[locale]/profile/security` | 🟡 security (demo); 2FA inert |
| `/[locale]/profile/addresses` | saved addresses |
| `/[locale]/profile/addresses/new` | add address |
| `/[locale]/profile/payment` | payment methods |
| `/[locale]/profile/payment/new` | 🟡 add card (placeholder, no form) |
| `/[locale]/profile/emergency` | emergency contacts |
| `/[locale]/profile/favourites` | 🟡 favourites (mock data) |
| `/[locale]/profile/notifications` | 🟡 notification prefs (demo) |
| `/[locale]/profile/family` | family members; invite flow 🟡 deferred |
| `/[locale]/safety/report` | report a safety incident; evidence upload 🟡 disabled |
| `/[locale]/settings/account` | 🟡 account settings (demo) |
| `/[locale]/settings/privacy` | privacy toggles 🟡 cosmetic; data export 🟢; delete account 🟢 |

### Provider (14)
| Route | Notes |
|---|---|
| `/[locale]/provider` | workbench / home |
| `/[locale]/provider/register` | 5-step onboarding wizard (ABN / docs / area / availability / Stripe + consent) |
| `/[locale]/provider/onboarding-status` | application status timeline |
| `/[locale]/provider/compliance` | upload / re-upload compliance documents |
| `/[locale]/provider/profile` | 🟡 public-profile editor (save stub) |
| `/[locale]/provider/services` | 🟡 services & rates (mock data, save stub) |
| `/[locale]/provider/availability` | weekly availability grid + templates |
| `/[locale]/provider/blocked-times` | one-off time off |
| `/[locale]/provider/calendar` | month calendar (read-mostly) |
| `/[locale]/provider/jobs` | jobs list (Today/This week/History) |
| `/[locale]/provider/jobs/[id]` 🔁 | job detail + lifecycle actions (accept/decline/start/complete) |
| `/[locale]/provider/earnings` | earnings + 7-day trend; CSV export 🟡 disabled |
| `/[locale]/provider/payouts` | 🟡 payout settings & history (mock data) |
| `/[locale]/provider/reviews` | reviews & ratings + reply |

### Admin (18)
| Route | Notes |
|---|---|
| `/[locale]/admin/login` | admin sign-in (email + password + TOTP); 🟡 check is a stub |
| `/[locale]/admin` | overview / ops dashboard |
| `/[locale]/admin/analytics` | analytics (range tabs, country chart, 5 KPIs) |
| `/[locale]/admin/disputes` | disputes list + decision drawer |
| `/[locale]/admin/disputes/[id]` 🔁 | dispute detail (evidence, emails) |
| `/[locale]/admin/safety` | incident reports list + decision drawer |
| `/[locale]/admin/safety/[id]` 🔁 | incident detail (photos) |
| `/[locale]/admin/providers` | providers list + approve drawer |
| `/[locale]/admin/providers/[id]` 🔁 | provider detail / compliance workbench (gated approve, force-approve, doc review, bg-check re-run, webhook dead-letter) |
| `/[locale]/admin/refunds` | refunds list (Process queued) |
| `/[locale]/admin/payments` | 🟡 finance dashboard (exports disabled) |
| `/[locale]/admin/reports` | review-moderation queue (Keep / Delete / Warn) |
| `/[locale]/admin/customers` | customers list + drawer |
| `/[locale]/admin/customers/[id]` 🔁 | customer detail; suspend/resume/ban 🟡 disabled |
| `/[locale]/admin/bookings` | bookings monitor (filter tabs) |
| `/[locale]/admin/ai/conversations` | AI chat audit + transcript drawer |
| `/[locale]/admin/ai/kb` | AI knowledge-base editor *(not in sidebar)* |
| `/[locale]/admin/settings` | platform settings (only cancellation window persists) |

**Total: 75 `page.tsx` routes** (14 public + 29 customer + 14 provider + 18 admin), plus the `error.tsx` / `not-found.tsx` route boundaries.
