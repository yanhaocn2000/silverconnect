# Archived — legacy testing / CI-CD docs (2026-04)

These were in the repo root until 2026-05-12. Archived because they're either one-time snapshots or superseded by the current docs. Kept for history; **do not follow them**.

| File | Was | Superseded by |
|---|---|---|
| `TEST_REPORT.md` | One-time E2E test report dated 2026-04-18 (a bash script wrapping a heredoc) | [docs/TESTING.md](../../TESTING.md), [docs/E2E_FULL_FLOW.md](../../E2E_FULL_FLOW.md) |
| `TESTING_GUIDE.md` | "Test Data Setup Guide" (Kew East VIC accounts, old `SUPABASE_URL` env) | [docs/E2E_FULL_FLOW.md §0–§1](../../E2E_FULL_FLOW.md), [docs/TESTING.md](../../TESTING.md) "Writing tests" |
| `MANUAL_TESTING_GUIDE.md` | End-user manual walkthrough (URL `localhost:3000`) | [docs/E2E_SERVER_GUIDE.md](../../E2E_SERVER_GUIDE.md) (real deployed-site role flows + 2026-05 new features) |
| `CI_CD_SETUP.md` | CI/CD & testing setup (mentioned Vercel-as-primary, which contradicts [AGENTS.md](../../../AGENTS.md)) | [docs/CI_CD.md](../../CI_CD.md) |

Current testing docs: [docs/TESTING.md](../../TESTING.md) (strategy) · [docs/E2E_FULL_FLOW.md](../../E2E_FULL_FLOW.md) (executable E2E design) · [docs/zh/e2e-new-features-2026-05.md](../../zh/e2e-new-features-2026-05.md) (2026-05 new features) · [docs/E2E_SERVER_GUIDE.md](../../E2E_SERVER_GUIDE.md) (manual / deployed-site walkthrough) · [docs/CI_CD.md](../../CI_CD.md) (CI/CD).
