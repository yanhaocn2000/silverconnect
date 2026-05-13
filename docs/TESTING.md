# Testing Strategy

## Test pyramid

```
         /\
        /E2E\         e2e/*.spec.ts        (Playwright, critical flows)
       /----\
      / Integ\        __tests__/...        (Jest + Supabase test schema)
     /--------\
    /   Unit   \      __tests__/services/  (Jest, pure logic)
   /------------\
```

Targets:

| Layer | Tool | Threshold |
|---|---|---|
| Unit + integration | Jest | 70% global (branches / functions / lines / statements) — `jest.config.js` `coverageThreshold` |
| API integration | Jest (+ test DB) | Goal: every API route has at least one happy + one auth-fail test (not yet enforced in config) |
| E2E | Playwright (chromium / firefox / webkit / Mobile Chrome / Mobile Safari) | Critical flows tagged `@critical` must pass |
| Lighthouse | `lighthouserc.json` URLs `/`, `/services`, `/bookings`, 3 runs each | Performance ≥ 0.9, Accessibility ≥ 0.9, Best Practices ≥ 0.85, SEO ≥ 0.9 |
| Load | k6 (`k6/`) | Goal: booking endpoint 100 RPS, p95 < 500 ms |

## Running

```bash
npm test                     # all unit/integration
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:critical    # only @critical
npm run test:e2e:ui          # interactive
npm run test:performance     # Lighthouse on running dev server
```

Configs: `jest.config.js`, `playwright.config.ts`, `lighthouserc.json`.

> **Playwright dev server**: `playwright.config.ts` has a `webServer` block (`command: 'npm run dev'`, `reuseExistingServer: !CI`), so `npm run test:e2e` auto-starts a dev server on `http://localhost:3000` if one isn't already running. Set `PLAYWRIGHT_TEST_BASE_URL` to run against a deployed instance instead.

## Existing E2E specs

| File | Coverage | State |
|---|---|---|
| `e2e/full-flow-ui.spec.ts` | Full-flow UI walkthrough (with screenshot snapshots in `e2e/full-flow-ui.spec.ts-snapshots/`); imports `_helpers/db.ts`, seeds + form-logs-in real users | mostly green; 1 stale (`provider signup + email verify (UI)` — snapshot/selector drift) |
| `e2e/functional.spec.ts` | ~50 smoke tests: public/locale routing, auth pages, profile/provider/admin page-loads, auth guards, switchers | green; **13 tests `test.fixme(...)`** — they reference 2026-04 mock data (`J-1042`/`D-2031`/`C-301`/`AI-501`), the pre-iron-session cookie, `demo@silverconnect.com`, removed GET-logout handlers, or changed wizard fields — need rewriting against `_helpers/db.ts` fixtures |
| `e2e/sprint1-smoke.spec.ts` | Locale routing, header chips, country-cookie pricing, booking wizard, help, emergency overlay, payment states | partly stale: ~13 of the "signed-in" / behaviour-diff tests fail (fixture credentials + page behaviour drifted) — **档 B cleanup** |
| `e2e/a11y.spec.ts` | axe accessibility scan across ~28 pages | 23 green; **5 fail = real "serious" violations** on `/services/{cat}`, `/admin/disputes`, admin dispute drawer, `/admin/customers`, `/admin/analytics` — **real bugs, file separately** |
| `e2e/smtp-e2e.spec.ts` | Real verification-email send via SMTP | needs SMTP config; skipped/passes otherwise |
| `e2e/donate.spec.ts` | Donate page render + amount toggle + checkout payload + amount=0 rejected (up to the Stripe redirect) — see [zh/e2e-new-features-2026-05.md §2](zh/e2e-new-features-2026-05.md) | **4/4 green** |
| `e2e/provider-compliance.spec.ts` | Provider automated-compliance: ABN validation, background-check consent, onboarding gating (needs `scripts/seed-e2e-provider.ts` + `PW_PROVIDER_EMAIL/PASSWORD`) — see [zh/e2e-new-features-2026-05.md §1](zh/e2e-new-features-2026-05.md) | **6/6 green** |

> **Deleted 2026-05-12** (2026-04 dead specs, replaced by the above): `uat-signin-flow.spec.ts` (assumed a sign-in *modal* that no longer exists post auth-unify; hardcoded `localhost:3000`), `booking-flow.spec.ts` (UI-redesign-stale selectors; booking happy-path covered by `full-flow-ui.spec.ts` + `scripts/smoke-full-flow.ts`), `critical-flows.spec.ts` (referenced `/dashboard/bookings`, Stripe Elements iframe, "Get Started" CTA — none exist; flaky 3s/2s perf thresholds).

> **New features (2026-05)**: ABN/background-check compliance, public donation flow, light/dark theme, 5-locale i18n + AU/US/CA regions, unified auth tabs/short-links. Full test plan: [zh/e2e-new-features-2026-05.md](zh/e2e-new-features-2026-05.md). `donate.spec.ts` / `provider-compliance.spec.ts` cover part of it; the rest (Stripe hosted-page flows, webhook idempotency, job gating, theme visual regression, locale smoke, role tabs) is still manual or unimplemented — see that doc's §7.

### Known test debt (as of 2026-05-12)

The non-new-feature specs are partly behind the app. Remediation, in order:
1. **`a11y.spec.ts` × 5 — real accessibility bugs** on `/services/{cat}` + 4 admin pages (axe "serious"). Fix the page markup; not a test problem.
2. **`sprint1-smoke.spec.ts` × ~13** — "signed-in" auth-guard / payment-state / booking-wizard tests use stale fixture credentials and behaviour assumptions. Re-base on `_helpers/db.ts` (cf. `full-flow-ui.spec.ts`).
3. **`functional.spec.ts` × 13 `test.fixme`** — rewrite against seeded fixtures (real customer/provider login via the form, real seeded dispute/conversation/booking IDs).
4. **`full-flow-ui.spec.ts` × 1** — `provider signup + email verify (UI)`: update the register-flow selectors (it's `/auth/register` customer-only → `/provider/register` promotion now) and `--update-snapshots` once the UI is confirmed.
5. **`@critical` tags**: `npm run test:e2e:critical` runs `playwright test --grep @critical`, but **no test carries the `@critical` tag** (verified 2026-05-12) — that script matches zero tests. Tag the must-pass-on-every-PR specs (start with `donate.spec.ts` + `provider-compliance.spec.ts` + the green core of `full-flow-ui.spec.ts`) before relying on this gate in CI.

## Writing tests

### Unit (lib/)
```ts
import { calculatePrice } from '@/lib/pricing'
test('AU price includes 10% GST', () => {
  expect(calculatePrice({ base: 100, countryCode: 'AU' }).total).toBeCloseTo(110)
})
```

### Integration (API routes)
- Use a dedicated Supabase project for test, or a transactional rollback wrapper.
- Seed catalog data via `npm run db:seed`; add `npm run db:seed:providers` when tests need demo providers, then invoke route handlers directly.

### E2E
- Use Playwright fixtures in `e2e/`. Prefer `data-testid` selectors over text where copy churns.
- Reset state per test (delete-then-seed) to avoid order-dependence.

## CI gates

PRs must pass:
1. `npm run lint`
2. `npm test`
3. `npm run test:e2e:critical` *(once `@critical` tags are added to specs — currently a no-op)*
4. `npm run build`

See [CI_CD.md](CI_CD.md).

## Manual / UAT

- Role-by-role walkthrough on the deployed site (customer / provider / admin): [E2E_SERVER_GUIDE.md](E2E_SERVER_GUIDE.md) — includes §3A for the 2026-05 new features.
- Full executable E2E design (23-step main flow + branches A–E): [E2E_FULL_FLOW.md](E2E_FULL_FLOW.md).
- New-features test plan (compliance / donate / theme / i18n / auth): [zh/e2e-new-features-2026-05.md](zh/e2e-new-features-2026-05.md).
- Older end-user manual: [archive/legacy-2026-04/MANUAL_TESTING_GUIDE.md](archive/legacy-2026-04/MANUAL_TESTING_GUIDE.md) (2026-04, archived — superseded by `E2E_SERVER_GUIDE.md`). UAT logs land in `uat-test-results.log`.
- `TESTING_AND_DEPLOYMENT_GUIDE.md` lives in `docs/archive/deploy-2026-05-pre-vps/` and is historical (describes Vercel-as-primary) — don't follow it.

## Test data hygiene

- Never use real PII in fixtures.
- Stripe: only test keys (`pk_test_`, `sk_test_`).
- Supabase: separate project for `test` and `dev`; never test against `prod`.
