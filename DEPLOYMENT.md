# Deployment

> **For AI agents and new contributors**: this is the only authoritative deploy doc. All older deploy guides are in [docs/archive/deploy-2026-05-pre-vps/](docs/archive/deploy-2026-05-pre-vps/) and should not be followed.
>
> **Git remote**: the canonical repo is **`https://github.com/yanhaocn2000/silverconnect.git`** (account `yanhaocn2000@163.com`) — this is `origin`. The old `lesliezhili/silverconnect-global` (account `yanhaoau@gmail.com`) is deprecated; it's kept only as the `lesliezhili-archive` remote. `git push` must target `origin` — never push to `lesliezhili-archive`. Older docs (incl. `docs/UNFINISHED.md`, `docs/zh/vercel-to-vps-handoff-report.md`) that still say `origin = lesliezhili/...` are stale. Deploy itself does not go through GitHub — `scripts/deploy.ps1` SCPs straight to the VPS.

## TL;DR

Production runs on a single VPS. **Deploy from your Windows machine**:

```powershell
.\scripts\deploy.ps1
```

That's it. Build runs locally, artifact is shipped via SCP, PM2 reloads, health-checked, auto-rollbacks on failure.

## Architecture (2026-05-10)

```
http://47.236.169.73   ←  primary site (VPS, PM2 + nginx + Node 20)
https://*.vercel.app   ←  reserved for future Stripe webhook + payment pages
                          (workflow scaffolded but not wired yet)
```

Earlier docs talk about Vercel as primary — that's outdated. See [docs/zh/migrate-vercel-to-vps.md](docs/zh/migrate-vercel-to-vps.md) for the architecture rationale and [docs/zh/vercel-to-vps-handoff-report.md](docs/zh/vercel-to-vps-handoff-report.md) for the deploy-channel decision (§10).

## The deploy command

```powershell
.\scripts\deploy.ps1                  # full pipeline (~3-5 min with build, ~90s without)
.\scripts\deploy.ps1 -SkipBuild       # re-push existing .next without rebuild
.\scripts\deploy.ps1 -DryRun          # build + tar locally, do not push to VPS
.\scripts\deploy.ps1 -Force           # skip the dirty-working-tree warning
```

What the script does, in order:
1. Preflight: SSH key, VPS reachable, optionally warn on dirty git tree
2. SCP `.env.local` from VPS to local (VPS is source of truth for runtime env)
3. `npm ci` + `npm run build` (skipped with `-SkipBuild`)
4. Tar `.next` + `public` + sources + lockfile
5. SCP tar to VPS, then SSH to extract → `npm ci --omit=dev` → `pm2 reload --update-env`
6. Health check `/zh/home`. **Auto-rollback to `.next.prev` on failure.**
7. Cleanup: deletes local tar and pulled `.env.local` (your local `.env.local` is restored from backup)

Logic is mirrored in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) (kept as `workflow_dispatch`-only fallback).

## Prerequisites (one-time)

| Item | Value |
|---|---|
| SSH key path | `~\.ssh\silverconnect-deploy` (or set `$env:SC_DEPLOY_KEY`) |
| Public key on VPS | `root@47.236.169.73:~/.ssh/authorized_keys` |
| Node version (local) | 20.x recommended; 22.x works with `EBADENGINE` warnings |
| Tools | OpenSSH client, `tar` (Windows 10+ ships these), `npm`, `git` |

VPS already has [/opt/silverconnect/.env.local](http://47.236.169.73) configured with all server-side secrets (Supabase / iron-session / GLM / Email / `CRON_SECRET` / `SESSION_COOKIE_SECURE=false`). The deploy script pulls this down at build time so `NEXT_PUBLIC_*` get inlined into the client bundle, then deletes it from the runner.

## When to use the GitHub Actions workflow

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) is **manual-trigger only**:

- Use case: deploying from a non-Windows machine, or when local PowerShell is unavailable
- Requires `VPS_SSH_KEY` repo secret (private key matching VPS `authorized_keys`)
- Trigger: `gh workflow run "Deploy to VPS" --ref main` or via the Actions tab
- It does NOT auto-run on push. To re-enable push-to-deploy, add `push: branches: [main]` back to the `on:` block

## Active docs

| Doc | Purpose |
|---|---|
| **[scripts/deploy.ps1](scripts/deploy.ps1)** | The deploy script itself. Read it once. |
| [docs/zh/migrate-vercel-to-vps.md](docs/zh/migrate-vercel-to-vps.md) | Full migration plan, architecture, rollback paths |
| [docs/zh/vercel-to-vps-handoff-report.md](docs/zh/vercel-to-vps-handoff-report.md) | Decision log + remaining handoff items (cron setup, Vercel rename, etc.) |
| [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md) | First-time VPS bootstrap (PM2 / nginx / ufw setup). Reference only — VPS is already provisioned. |

## Archived (do not follow)

[docs/archive/deploy-2026-05-pre-vps/](docs/archive/deploy-2026-05-pre-vps/) contains pre-2026-05-10 deploy docs that assume Vercel-as-primary. Kept for history. See the directory's README for an index.

## Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `next: not found` in PM2 logs | `npm ci` on VPS failed silently | SSH in, `cd /opt/silverconnect && npm ci --omit=dev`, then `pm2 restart silverconnect` |
| Build fails on `validator.ts:692` | Stale `.next/dev/types/` from a previous `next dev` run | `rm -rf .next` locally, retry |
| `bash: line 1: ﻿set: command not found` | UTF-8 BOM in piped stdin to remote bash | Already fixed in script (writes to temp file with `[System.Text.UTF8Encoding]::new($false)`). If you see it again, check your edits didn't regress |
| `usage: scp [-346...]` | Local path with drive colon (`f:\...`) parsed as remote host | Already fixed — script `cd`s into repo root and passes relative paths |
| Site returns 200 but stale chunks | New build same content as previous | Compare `.next/BUILD_ID` on VPS before/after; if equal, no actual change shipped |
| pm2 errored, restart count climbing | Process keeps crashing | `ssh ... 'pm2 logs silverconnect --err --nostream --lines 50'` |
| Local `.env.local` lost after deploy | Script restores pre-deploy backup automatically; if it didn't, check `.env.local.bak.*` in repo root | Pull again: `scp -i ~/.ssh/silverconnect-deploy root@47.236.169.73:/opt/silverconnect/.env.local .` |

## Out of scope (not yet deployed)

- Stripe webhook handlers (will land on Vercel pay subset workflow when implemented). Note: provider compliance now also has `app/api/stripe/connect-webhook/route.ts` (Stripe Connect `account.updated`) and `app/api/compliance/background-check/webhook/route.ts` (background-check vendor / mock) — both need webhook endpoints + secrets (`STRIPE_CONNECT_WEBHOOK_SECRET`, `BG_CHECK_WEBHOOK_SECRET`) configured.
- VPS cron jobs for `app/api/cron/*` (commands in handoff report §5; not yet installed). Includes the new daily `GET /api/cron/check-compliance-expiry` (30-day expiry warnings + auto-downgrade on expiry) — e.g. `0 6 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://silverconnect.xinxinsoft.org/api/cron/check-compliance-expiry`.
- ~~HTTPS for VPS~~ — done 2026-05-10. Site is `https://silverconnect.xinxinsoft.org`. AWS-1 (Sydney, `15.134.38.42`) terminates SSL with Let's Encrypt and proxies HTTP to VPS-5 (`47.236.169.73`); VPS-5 nginx still listens 80 and forwards `X-Forwarded-Proto` upstream. `SESSION_COOKIE_SECURE` in VPS `.env.local` is commented out — `lib/auth/session.ts` defaults to Secure under `NODE_ENV=production`. Cert renewal is certbot timer on AWS-1, valid through 2026-08-08.
