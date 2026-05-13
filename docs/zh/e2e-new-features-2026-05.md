# 2026-05 新功能 E2E 测试方案

> **范围**：2026-05-09 ~ 05-12 这一批新功能的端到端测试方案。
> **目的**：作为这批改动的可执行测试基线 —— 上线前 / 回归时按本文逐条跑。
> **关系**：主链路（一个消费者 + 一个服务者走完一笔订单）见 [E2E_FULL_FLOW.md](../E2E_FULL_FLOW.md)；本文只覆盖**新增**面。VPS 上的人工验证入口见 [E2E_SERVER_GUIDE.md](../E2E_SERVER_GUIDE.md)。
> **整体测试策略 / 工具 / 命令**：见 [TESTING.md](../TESTING.md)。

---

## 0. 这批新功能清单（按 git log）

| # | 功能 | commit | 已有自动化 spec | 详细方案 |
|---|---|---|---|---|
| F1 | 服务者自动化合规 — ABN 实时校验、第三方背调（mock vendor）、Stripe Connect onboarding、job gate、到期 cron | `6345e2bd` | `e2e/provider-compliance.spec.ts`（6 用例，chromium 已通过） | [§1](#1-f1--服务者自动化合规) |
| F2 | 公开捐赠流程 — campaigns + Stripe Checkout（单次/月捐）+ webhook + 感谢信 | `e52cb8b0` | `e2e/donate.spec.ts`（4 用例，到 redirect 前） | [§2](#2-f2--公开捐赠流程) |
| F3 | 明/暗主题系统 — `next-themes` 三态（light / dark / 跟随系统）+ Header/AdminShell 切换入口 + donate 页强制 light | `baea4b2a` | 无（建议加视觉回归 / a11y 用例） | [§3](#3-f3--明暗主题系统) |
| F4 | i18n 扩到 5 语言（en / zh-CN / zh-TW / ja / ko）+ `/zh→/zh-CN` 308；服务区域 AU / CN / CA → **AU / US / CA**（Postgres country enum migration 0004） | `98563ff6` | 无（建议加 locale 冒烟） | [§4](#4-f4--i18n-5-语言--服务区域-auusca) |
| F5 | 认证统一 — `/auth/login` 角色 tab（消费者/服务者）、`/login` 与 `/p` 短链接（经 `proxy.ts`） | `f797456d` | 无（旧的 `e2e/uat-signin-flow.spec.ts` 已于 2026-05-12 删除 —— 它假设有 sign-in modal，已不存在） | [§5](#5-f5--认证统一角色-tab--短链接) |

> **依赖关系**：F1 依赖 F4 的 country enum（`AU / US / CA`）—— `lib/compliance/country.ts` 的 ABN/必需文档 matrix 按这三国分支。F2 / F1 共用同一个 `/api/stripe/webhook` 路由（按 `event.type` 分流）+ Stripe Connect 用 `/api/stripe/connect-webhook`。

---

## 1. F1 — 服务者自动化合规

> 设计文档：[provider-automated-compliance-plan.md](./provider-automated-compliance-plan.md)（v7，已实施）。本节是它 §11「测试」的可执行展开。

### 1.0 前置

| 项 | 要求 |
|---|---|
| migration | `0007_remarkable_ender_wiggin.sql` 的 18 条 DDL 已 apply（3 新表 `providerBackgroundChecks` / `complianceExpiryAlerts` / `complianceWebhookEvents` + `providerProfiles` 7 新列 + `background_check_status` enum）。注意：测试库 `npm run db:migrate` 不可用（`__drizzle_migrations` 为空，会从 0000 重跑冲突），用一次性脚本直接 apply SQL 或 `npm run db:push`。 |
| 背调 vendor | `BG_CHECK_VENDOR=mock`（默认）—— mock 适配器在 `triggerCheck` 后 ~3s 自 POST 一次 `cleared` webhook，端到端可跑通无需真 vendor 账号。 |
| Stripe | test-mode key（`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET`）。Stripe Connect onboarding 跳到 Stripe 托管页，自动测试只断言到 redirect。 |
| ABR | `ABR_GUID`（env）。无凭证时 `lib/compliance/abr.ts` 走可配 stub；测试用例覆盖 active / cancelled / 超时三态。 |
| 测试账号 | `npx tsx scripts/seed-e2e-provider.ts` 造一个 AU provider（`e2e-provider@silverconnect.test` / `E2eTest123!`，profile 状态 `docs_review`），跑 spec 时传 `PW_PROVIDER_EMAIL` / `PW_PROVIDER_PASSWORD`。 |
| cron | 手动 `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-compliance-expiry` 触发到期检查。 |

### 1.1 注册向导 — ABN 国家专属（PR-001）

| # | 触发 | 期望 |
|---|---|---|
| F1-1 | AU provider 在 `/provider/register` Step1 渲染 | 出现 ABN 输入框（必填） |
| F1-2 | 填非 11 位 / 非数字 / 非 active 的 ABN → 提交 | `?step=1&error=abnInvalid`；不写库 |
| F1-3 | 填有效 active ABN → 提交 | `providerProfiles.abn / businessName / abnActive=true / abnValidatedAt` 写入；UI 回显 Business Name（只读） |
| F1-4 | US / CA provider 注册 | **不出现** ABN 字段；缺 ABN 不影响注册 |

### 1.2 背调授权 + 触发（PR-002）

| # | 触发 | 期望 |
|---|---|---|
| F1-5 | Step5 提交时**未勾**背调授权 | `?step=5&error=consentRequired`，不提交 |
| F1-6 | 勾选授权 → `finishWizard` | `providerProfiles.bgCheckConsentAt / bgCheckConsentVersion='2026-05-11' / bgCheckConsentIp` 写入；`providerBackgroundChecks` +1 行（`status='pending'`, `isCurrent=true`）；profile → `docs_review`；redirect 到 `/provider/onboarding-status` |
| F1-7 | onboarding-status 页 | 显示「Verification in Progress / 背调进行中」（`obBackground` 步骤为 pending） |
| F1-8 | mock vendor ~3s 后回调 `cleared`（`POST /api/compliance/background-check/webhook`） | `providerBackgroundChecks.status='cleared'`, `clearedAt` / `expiresAt` 非空；`complianceWebhookEvents` +1 行 `status='processed'` |
| F1-9 | vendor 触发失败（`status='failed'`，配置 mock 失败态模拟） | onboarding-status 显示「背调发起失败，请重试」+ retry 按钮；点 retry → 新 `pending` 行 |
| F1-10 | 重复投递同一 `(vendor, externalRef)` webhook | 幂等：背调行不重复变更，`complianceWebhookEvents` 唯一约束生效 |
| F1-11 | 投递找不到本地背调记录的 webhook | `complianceWebhookEvents.status='orphaned'`，返回 200，admin 页 dead-letter 区可见 |

### 1.3 自动 approve（`tryAutoApproveProvider`）

上线硬条件（口径统一）：当前背调 `cleared` + 必需文档全 `approved` 且未过期 + AU 时 `abnActive` + `stripeAccountId` 存在且 payouts-enabled。

| # | 触发 | 期望 |
|---|---|---|
| F1-12 | 背调 cleared 但文档未全 approved | profile 仍 `docs_review`，无 `verified` badge |
| F1-13 | admin 在 `/admin/providers/{id}` 逐份 `Approve` 必需文档（`reviewDocumentAction`） | `providerDocuments.status='approved'`, `reviewedAt` / `reviewerNote` 写入；`adminActions` +1 行；末份 approve 后触发 `tryAutoApproveProvider` |
| F1-14 | 全部条件满足后 | `providerProfiles.onboardingStatus='approved'`, `approvedAt` 非空；`providerBadges` upsert `kind='verified'`；`notifications` +1（Helen，"approved"）；`auditLog` 记自动 approve（actor 可空） |
| F1-15 | admin `Force approve`（填 note，二次确认） | 跳过自动检查直接 `approved`；`adminActions` +1 行 `action='provider.force_approve'`（记 actor / target / note / 检查项快照）；**默认不授** `verified` badge |
| F1-16 | 重复触发 `tryAutoApproveProvider`（webhook 重投 / 重复审核 / Stripe 回调重复） | 幂等：只有实际 `docs_review→approved` 那次发通知 + upsert badge（检查 affected rows） |

### 1.4 Stripe Connect onboarding（P3）

| # | 触发 | 期望 |
|---|---|---|
| F1-17 | Step5 的 "Connect with Stripe" 按钮（`formAction=startStripeConnect`） | 建 Express account（若无）→ `providerProfiles.stripeAccountId` 写入 → 生成 account link → redirect 到 `connect.stripe.com`（**自动测试断言到此为止**） |
| F1-18 | 返回 `?step=5&stripe=done` | Step5 显示「已连接 Stripe」状态 |
| F1-19 | `account.updated` 回调（payouts-enabled）`POST /api/stripe/connect-webhook` | 调 `tryAutoApproveProvider`（若其余条件齐 → approved） |
| F1-20 | onboarding-status 的 `obStripe` 步骤 | 未完成显示「连接 Stripe」按钮（阻塞步骤）；payouts-enabled 后变完成 |

### 1.5 Job 可见性 gate（覆盖完整）

| # | 触发 | 期望 |
|---|---|---|
| F1-21 | 背调未 `cleared` / profile 未 `approved` 的 provider 访问 `/provider`（首页） | 不显示 `todayJobs`；显示「账户受限」横幅 + 仅列已有 `confirmed`/`in_progress` 订单（不直接整页 redirect） |
| F1-22 | 同上访问 `/provider/jobs` 列表 | 同上：不显示新 `pending` 派单 |
| F1-23 | 同上访问 `/provider/jobs/{id}` | 仅对已 `confirmed`/`in_progress` 的订单可进；新 `pending` 单被挡 |
| F1-24 | 构造 POST 调 `jobAction` 的 `accept`（未 active） | `assertActiveProviderOrThrow` 拒绝 → redirect 到 onboarding-status |
| F1-25 | 构造 POST 调 `jobAction` 的 `start` / `complete` / `decline`（未 active，但订单已 `confirmed`/`in_progress`） | **放行**（让 provider 收尾或退单，不卡死客户订单） |
| F1-26 | active provider 正常 accept/start/complete | 不受影响，照常 |

### 1.6 到期预警 + 过期下架（cron）

| # | 触发 | 期望 |
|---|---|---|
| F1-27 | 某文档 / 背调 `expiresAt` 落在 `(now, now+30d]`，跑 cron | `notifyAndEmail` 给 provider + `notifyAdmins` 摘要；`complianceExpiryAlerts` +1 行 |
| F1-28 | 同一 `(subjectType, subjectId, expiresAt)` 再跑 cron | 不重复发（查 `complianceExpiryAlerts` 去重） |
| F1-29 | `expiresAt` 续期后变化，再跑 cron | 重新提醒（新的 `(subject, expiresAt)`） |
| F1-30 | 某记录 `expiresAt < now`，跑 cron | 标 `expired`；`suspendForComplianceExpiry`：`approved→docs_review`；`auditLog action='provider.compliance_expired'`；通知 provider+admin |
| F1-31 | 过期下架后，客户侧 `/services/{cat}` / 搜索 / `/bookings/new` Step2 | **不再出现**该 provider（可见性统一依赖 `onboardingStatus='approved'`） |
| F1-32 | provider 续传必需文档（已 approved 状态下） | `uploadDocAction` 同事务把 `onboardingStatus` 改回 `docs_review`；`auditLog action='provider.required_document_reuploaded'`；通知 admin；文档重新 approved 后由 `tryAutoApproveProvider` 恢复上线 |

### 1.7 私有文件存储（P2）

| # | 触发 | 期望 |
|---|---|---|
| F1-33 | provider 在 `/provider/compliance` 上传 PDF | 文件落到 `process.cwd()/.private-uploads/compliance/{providerId}/{uuid}.pdf`（**不在** `public/`，Next 不静态托管）；`providerDocuments.fileUrl` 存相对 key 非 URL |
| F1-34 | 访问 `GET /api/compliance/documents/{id}`（本人或 admin） | 流式返回文件（`Content-Type` + `Content-Disposition: inline`） |
| F1-35 | 访问 `GET /api/compliance/documents/{id}`（非本人非 admin） | 拒绝（403/404） |

### 1.8 verified badge 来源统一

| # | 触发 | 期望 |
|---|---|---|
| F1-36 | 客户侧 `/home`、`/services/{cat}`、`/providers/{id}` 渲染 ProviderCard | `verified` 取自 `providerBadges.kind='verified'` 真值，**无硬编码 `verified:true`** |

### 1.9 已有自动化 spec 现状

`e2e/provider-compliance.spec.ts`（6 用例，chromium 已通过）覆盖：未登录访问 `/provider/register` / `/provider/compliance` 跳登录；AU 注册无效 ABN 报错 / 有效回显 Business Name；US 注册无 ABN 字段；未勾 consent 不能提交；提交后 onboarding-status 显示 background pending。

**缺口**：未覆盖 §1.3 自动 approve 全链、§1.5 job gate（首页/列表/详情/POST）、§1.6 cron 到期/下架、§1.8 badge 来源 —— 这些目前靠 `__tests__/compliance-country.test.ts`（4/4 通过，只测 country matrix）+ 人工。建议补 e2e。

---

## 2. F2 — 公开捐赠流程

> 设计文档：[donate-integration-plan.md](./donate-integration-plan.md)。本节是它 §9「验收标准」的可执行展开。

### 2.0 前置

| 项 | 要求 |
|---|---|
| migration | `0005` / `0006`（`campaigns` / `donations` / `donation_payments` / `processed_stripe_events` 四表）已 apply；seed 一条 active campaign（`npm run db:seed` 或单独 seed 脚本）。 |
| Stripe | **test mode** key + 测试卡 `4242 4242 4242 4242`；`APP_URL`（server-only，本地 `http://localhost:3000`）；`STRIPE_WEBHOOK_SECRET`。本地用 `stripe listen --forward-to localhost:3000/api/stripe/webhook` 转发 webhook。 |
| 邮件 | 感谢信走 `sendEmail` 直发（捐赠人无账号），需 SMTP 配置；测试可只看 `console` 日志。 |

### 2.1 页面渲染 + 表单（已有 `e2e/donate.spec.ts` 覆盖）

| # | 触发 | 期望 |
|---|---|---|
| F2-1 | 访问 `/zh-CN/donate` | H1 含「让每一位长者都…」；表单「现在就帮助一位长者」可见；`$50` 按钮 `aria-pressed=true` |
| F2-2 | 点 `$100` 金额预设 | `$100` `aria-pressed=true`、`$50` 变 `false` |
| F2-3 | 选金额 → 提交 | `POST /api/donate/checkout` 收到正确 payload（`amountCents` 整数、`currency='aud'`、`mode`、`locale`） |
| F2-4 | 自定义金额 `0` / 负数 / `>5000000` cents | 表单 + 服务端双重拒绝 |
| F2-5 | 5 种 locale 切换 | `donate` namespace 文案在 en / zh-CN / zh-TW / ja / ko 都有（无硬编码可见文案） |
| F2-6 | `/zh-CN/donate` 强制 light（见 [§3](#3-f3--明暗主题系统)） | 即使全站切到 dark，捐赠页仍 light（`data-theme="light"` 包裹） |

### 2.2 单次捐款（手动 — Stripe 托管页）

| # | 触发 | 期望 |
|---|---|---|
| F2-7 | 选 `$50` → Stripe Checkout → `4242` 卡成功 → 跳回 `/donate/success?session_id=…` | success 页基于 `donations` 行渲染 |
| F2-8 | webhook `checkout.session.completed`（mode=payment） | `donations.status='completed'`；`donation_payments` +1 行（`amountCents=5000`, `status='succeeded'`, `stripePaymentIntentId` / `stripeChargeId` / `receiptUrl` 写入, `billingReason='manual'`）；感谢信发一次 |
| F2-9 | campaign 进度卡 | raised +$50 / donor +1（`SUM(amountCents - refundedAmountCents)`，60s 缓存） |

### 2.3 月捐（手动）

| # | 触发 | 期望 |
|---|---|---|
| F2-10 | 选月捐 `$25` → Subscription 创建成功 | `donations.mode='monthly'`, `status='active'`, `stripeCustomerId` / `stripeSubscriptionId` 写入 |
| F2-11 | `invoice.paid`（`billing_reason=subscription_create`） | `donation_payments` +1 行（`amountCents=2500`, `stripeInvoiceId` 写入） |
| F2-12 | `invoice.paid`（`billing_reason=subscription_cycle`，Stripe CLI 模拟） | 再 +1 行；进度共 +$50 |
| F2-13 | `customer.subscription.deleted` | `donations.status='cancelled'`；`donation_payments` 不动 |

### 2.4 幂等 / 退款 / 边界

| # | 触发 | 期望 |
|---|---|---|
| F2-14 | Stripe CLI 重发同一 `event.id` | `donation_payments` 不出现重复行；感谢信只发一次（验证 claim-then-finalize + `ON CONFLICT DO NOTHING` + stale-lock 接管） |
| F2-15 | `processing` 状态超 5 分钟后再投递 | 视为前进程崩溃，新进程接管 claim |
| F2-16 | Stripe Dashboard 退款（`refund.created` 主路径） | `donation_payments.stripeRefundIds` 追加 refund.id；`refundedAmountCents += refund.amount`；全额退则 `status='refunded'`，部分则 `partially_refunded`；进度相应减少 |
| F2-17 | `charge.refunded` 兜底路径 | 仅在 `charge.amount_refunded > refundedAmountCents` 时同步，不追加 `stripeRefundIds`；不报错 |
| F2-18 | 服务端 5xx / 无网络时提交 | 表单 inline 报错，按钮恢复可点（不用 alert） |

### 2.5 Live smoke（生产部署后，只跑一次）

| # | 触发 | 期望 |
|---|---|---|
| F2-19 | `https://silverconnect.xinxinsoft.org/zh-CN/donate` 真实 $1 单次 | 邮件 / DB / 进度都更新 |
| F2-20 | 立即在 Stripe Dashboard 退 $1 | `refund.created` 命中并幂等处理；`donation_payments.status='refunded'`, `refundedAmountCents=100`；进度 -$1 |
| F2-21 | 月捐 live smoke | **跳过**（开订阅要等真实月度账单） |

> **robots**：`/donate` 允许收录；`/donate/success`（带 session_id）`noindex`。

### 2.6 已有自动化 spec 现状

`e2e/donate.spec.ts`（4 用例）= F2-1 ~ F2-4。**缺口**：Stripe 托管页之后的全部（F2-7 ~ F2-21）只能手动；webhook 幂等/退款建议补 `__tests__/donations/*.test.ts` 单测（设计文档 §8 step 2 已列：stale-lock 接管 / 部分退款 / refund 重投递三种边界）。

---

## 3. F3 — 明/暗主题系统

> 设计文档：[theme-system-plan.md](./theme-system-plan.md)。

### 3.0 前置

`next-themes@0.4.4`（已在 `package.json`）；`<html suppressHydrationWarning>`；切换入口在 Header（customer / provider / public donate&help）+ AdminShell（admin 登录后）+ public auth 5 页 & admin login 的固定角落入口。

### 3.1 切换行为

| # | 触发 | 期望 |
|---|---|---|
| F3-1 | 首次访问（无 cookie/localStorage） | 跟随 OS `prefers-color-scheme`；`<html>` 有稳定的 `data-theme` 属性（next-themes 注入），无首屏闪烁 |
| F3-2 | Header 的 ThemeToggle 选 "Light" | `<html data-theme="light">`；刷新后保持（localStorage `theme`） |
| F3-3 | 选 "Dark" | `<html data-theme="dark">`；`dark:` 工具类生效；刷新保持 |
| F3-4 | 选 "System" | 移除显式覆盖，回到跟随 OS |
| F3-5 | AdminShell 的切换入口 | 同样作用于全站（同一个 `<html>` 属性） |
| F3-6 | public auth（login/register/forgot/reset/verify）+ admin login 的固定角落入口 | 可切换（这些页没有 Header） |

### 3.2 视觉回归（两种主题下都不破）—— 建议用 Playwright 截图快照

| 区域 | 重点页面 |
|---|---|
| customer | `/home`、`/services/{cat}`、`/bookings`、`/bookings/{id}`、`/profile`、`/chat` |
| provider | `/provider`、`/provider/jobs`、`/provider/compliance`、`/provider/onboarding-status` |
| admin | `/admin`、`/admin/providers/{id}`、`/admin/disputes/{id}` |
| public | `/donate`（**强制 light，dark 下也必须是 light**）、`/help`、`/auth/login`、`/oops`、404 catch-all |

| # | 触发 | 期望 |
|---|---|---|
| F3-7 | dark 下逐页截图 | 无「浅色 tile + 深色背景」违和；donut 圆心不扎眼（donate 强制 light 所以不受影响，但若有别处复用 donate 组件需查）；对比度仍 ≥ WCAG AA |
| F3-8 | `dark:` 字面工具类 audit | 接入 next-themes 后 `<html data-theme="dark">` 稳定存在，原先 OS-dark 下没生效的 `dark:xxx` 类现在会生效 → 专门 audit 是否暴露新视觉问题 |
| F3-9 | donate 硬编码 hex（Stories / ImpactStats / AllocationDonut / ProgressBar / Hero 渐变） | 在强制 light 下正常；确认没泄漏到会被 dark 影响的地方 |

### 3.3 a11y

| # | 触发 | 期望 |
|---|---|---|
| F3-10 | ThemeToggle 按钮 | 有可见 focus ring；`aria-label`；下拉用 `@radix-ui/react-dropdown-menu`，键盘可操作 |

---

## 4. F4 — i18n 5 语言 + 服务区域 AU/US/CA

> commit `98563ff6`。5 个 message 文件 993 keys parity；7 篇 help articles 全部 5 语言；country enum 经 migration `0004` 从 `AU/CN/CA` 改 `AU/US/CA`。

### 4.1 locale 路由

| # | 触发 | 期望 |
|---|---|---|
| F4-1 | 访问 `/zh`（旧 locale） | 308 redirect 到 `/zh-CN`（保留路径与 query） |
| F4-2 | 访问 `/en` `/zh-CN` `/zh-TW` `/ja` `/ko` 各主要页面 | 正常渲染，无缺 key 运行时报错（缺 key 会 throw） |
| F4-3 | 语言切换器切到每种 locale | 路径前缀切换；文案全翻译 |
| F4-4 | 5 个 `messages/*.json` key 结构 | 完全一致（993 keys，CI 可加 parity check） |
| F4-5 | 7 篇 help articles | 5 语言都有内容（非英文 fallback） |

### 4.2 服务区域 AU / US / CA

| # | 触发 | 期望 |
|---|---|---|
| F4-6 | provider 注册选国家 | 选项为 `AU / US / CA`（无 `CN`）；DB `users.country` enum 已迁移 |
| F4-7 | US 上下文 | 紧急号码 `911`；货币 `US$ / USD`；税标签 `Sales Tax`；隐私条款引 `CCPA / Delaware`（原 CN 的 `120 / ¥ CNY / VAT / PIPL / 上海法院` 已全部替换） |
| F4-8 | AUD→USD 占位汇率 | 显示用占位 rate（`lib/db/schema/payments.ts`）；不参与真实结算 |
| F4-9 | provider profile 语言选择器 | BCP47 codes（`en / zh-CN / zh-TW / ja / ko` + `es / ar / vi`） |
| F4-10 | F1 的 country matrix | `lib/compliance/country.ts` 的 ABN/必需文档规则按 `AU / US / CA` 三国生效（见 [§1.1](#11-注册向导--abn-国家专属pr-001)） |

### 4.3 建议补的自动化

- locale 冒烟 spec：对 5 个 locale × 几个关键页面（home / services / donate / auth/login）跑 `goto` + 断言无 console error + H1 文案非英文。
- `messages/*.json` parity 单测 / lint（key 集合 diff）。

---

## 5. F5 — 认证统一（角色 tab + 短链接）

> commit `f797456d`。`AuthRoleTabs.tsx` + `proxy.ts` 加 `/login` `/p` 短链；admin 登录流不动。

### 5.1 角色 tab

| # | 触发 | 期望 |
|---|---|---|
| F5-1 | 访问 `/auth/login`（无 `?role=`） | 默认 role = consumer；标题 + 注册链接为消费者版 |
| F5-2 | 切到 "Provider" tab（`?role=provider`） | 标题 + 注册链接切到服务者版 |
| F5-3 | 用 DB role=provider 的账号登录（任意 tab） | 仍按 `users.role` 路由到 `/provider`（tab 只影响文案，不影响实际路由） |
| F5-4 | 用 DB role=customer 的账号登录 | 路由到 `/home` |

### 5.2 短链接（`proxy.ts`）

| # | 触发 | 期望 |
|---|---|---|
| F5-5 | 访问 `/login` | 经 proxy 委派给 next-intl → 落到 `/{detected-locale}/auth/login` |
| F5-6 | 访问 `/p` | 同上 → provider 入口（`/{locale}/auth/login?role=provider` 或等价） |
| F5-7 | 带 locale 前缀的 `/en/login` 等 | 正常工作 |

### 5.3 不动的部分

- Admin 登录（`/admin/login`，独立 cookie `sc-admin`，TOTP stub）—— 不受 F5 影响。
- `/auth/register` 仍硬编码 `role: "customer"`（成为 provider 须先注册 customer 再走 `/provider/register`）。

### 5.4 现状

旧的 `e2e/uat-signin-flow.spec.ts`（一批 UAT-xxx 用例，假设点 "Sign In" 弹一个 modal）已于 2026-05-12 删除 —— 认证统一后登录是独立页面 `/auth/login`，没有 modal 了。**F5 当前没有自动化覆盖**，建议新建 `e2e/auth-tabs.spec.ts` 实现 F5-1 ~ F5-7。

---

## 6. 跑法汇总

```bash
# 已有的新功能 spec（需要 dev server 在 :3000 或设 PLAYWRIGHT_TEST_BASE_URL）
npm run dev   # 另开终端；或 playwright.config.ts 的 webServer 会自动起

npx playwright test e2e/donate.spec.ts --project=chromium
npx tsx scripts/seed-e2e-provider.ts
PW_PROVIDER_EMAIL=e2e-provider@silverconnect.test PW_PROVIDER_PASSWORD=E2eTest123! \
  npx playwright test e2e/provider-compliance.spec.ts --project=chromium

# 全量
npm run test:e2e
npm test            # 含 __tests__/compliance-country.test.ts
```

**手动验证入口**（VPS / 生产）：见 [E2E_SERVER_GUIDE.md](../E2E_SERVER_GUIDE.md) §3A。

---

## 7. 待补的自动化测试（优先级）

| 优先级 | 内容 | 落点 |
|---|---|---|
| 高 | F2 webhook 幂等 / 部分退款 / refund 重投递 单测 | `__tests__/donations/*.test.ts`（设计文档 §8 step 2 已规划） |
| 高 | F1 job gate（首页/列表/详情/POST `jobAction`）e2e | `e2e/provider-compliance.spec.ts` 扩充 |
| 中 | F1 自动 approve 全链 + cron 到期/下架 | e2e + `__tests__` |
| 中 | F4 locale 冒烟（5 locale × 关键页）+ `messages/*.json` parity check | 新 `e2e/i18n-smoke.spec.ts` + 单测 |
| 中 | F5 角色 tab + 短链 | 新建 `e2e/auth-tabs.spec.ts`（旧 `uat-signin-flow.spec.ts` 已删） |
| 中 | F3 主题切换 + 双主题视觉回归快照 | 新 `e2e/theme.spec.ts`（用 Playwright 截图快照，参考 `e2e/full-flow-ui.spec.ts-snapshots/`） |
| 低 | 给上述 must-pass 用例打 `@critical` 标签（当前全站 0 个，`npm run test:e2e:critical` 是空跑） | 各 spec |

---

## 8. 新功能页面 / 路由清单（按角色）

> URL 用 `https://silverconnect.xinxinsoft.org`（本地 `http://localhost:3000`）；locale 用 `/en/` 或 `/zh-CN/`（旧 `/zh/` 会 308 跳 `/zh-CN/`）。第三列是源码位置（点开即跳）。VPS 上对应的可点 URL 表见 [E2E_SERVER_GUIDE.md §2 + §3A](../E2E_SERVER_GUIDE.md)。

### 访客 / 公开（无需登录）

| 功能 | URL | 源码 |
|---|---|---|
| F2 捐赠落地页 | `…/zh-CN/donate` | [donate/page.tsx](<../../app/[locale]/(public)/donate/page.tsx>)、表单 [components/donate/DonateForm.tsx](../../components/donate/DonateForm.tsx)、组件 [components/donate/](../../components/donate/) |
| F2 捐赠成功页 | `…/zh-CN/donate/success?session_id=…` | [donate/success/page.tsx](<../../app/[locale]/(public)/donate/success/page.tsx>) |
| F2 捐赠取消页 | `…/zh-CN/donate/cancel` | [donate/cancel/page.tsx](<../../app/[locale]/(public)/donate/cancel/page.tsx>) |
| F2 创建 Checkout Session | `POST …/api/donate/checkout` | [api/donate/checkout/route.ts](../../app/api/donate/checkout/route.ts)、业务层 [lib/donations/](../../lib/donations/) |
| F2 Stripe webhook（捐赠+其他事件分流） | `POST …/api/stripe/webhook` | [api/stripe/webhook/route.ts](../../app/api/stripe/webhook/route.ts) |
| F5 登录（角色 tab） | `…/en/auth/login`（`?role=consumer\|provider`） | [auth/login/page.tsx](<../../app/[locale]/(public)/auth/login/page.tsx>)、[components/domain/AuthRoleTabs.tsx](../../components/domain/AuthRoleTabs.tsx) |
| F5 短链 `/login` `/p` | `…/login`、`…/p` | [proxy.ts](../../proxy.ts)（`/login`→`/auth/login`，`/p`→`/auth/login?role=provider`） |
| F3 无 Header 页面的主题切换角落 | auth 5 页 + `/oops` + 404 | [components/layout/PublicThemeCorner.tsx](../../components/layout/PublicThemeCorner.tsx)、[components/layout/ThemeToggle.tsx](../../components/layout/ThemeToggle.tsx) |

### 服务者（provider）

| 功能 | URL | 源码 |
|---|---|---|
| F1 入驻向导（ABN / Stripe Connect / 背调授权） | `…/en/provider/register` | [provider/register/page.tsx](<../../app/[locale]/(provider)/provider/register/page.tsx>) |
| F1 合规文档上传（私有存储） | `…/en/provider/compliance` | [provider/compliance/page.tsx](<../../app/[locale]/(provider)/provider/compliance/page.tsx>)、[lib/upload/private.ts](../../lib/upload/private.ts) |
| F1 入驻状态（DB 驱动 5 步 + retry） | `…/en/provider/onboarding-status` | [provider/onboarding-status/page.tsx](<../../app/[locale]/(provider)/provider/onboarding-status/page.tsx>) |
| F1 仪表盘（job gate 入口） | `…/en/provider` | [provider/page.tsx](<../../app/[locale]/(provider)/provider/page.tsx>) |
| F1 任务列表 / 详情（job gate + `jobAction`） | `…/en/provider/jobs`、`…/en/provider/jobs/{id}` | [provider/jobs/page.tsx](<../../app/[locale]/(provider)/provider/jobs/page.tsx>)、[provider/jobs/[id]/page.tsx](<../../app/[locale]/(provider)/provider/jobs/[id]/page.tsx>)、gate [lib/provider/requireActiveProvider.ts](../../lib/provider/requireActiveProvider.ts) |
| F1 私有合规文件读取（鉴权路由） | `GET …/api/compliance/documents/{id}` | [api/compliance/documents/[id]/route.ts](<../../app/api/compliance/documents/[id]/route.ts>) |

### 管理员（admin）

| 功能 | URL | 源码 |
|---|---|---|
| F1 服务者审批（ABN/背调/consent 展示 + 逐份 Approve/Reject + Force approve + webhook dead-letter） | `…/en/admin/providers/{id}` | [admin/providers/[id]/page.tsx](<../../app/[locale]/(admin)/admin/providers/[id]/page.tsx>) |
| F1 服务者列表 | `…/en/admin/providers` | [admin/providers/page.tsx](<../../app/[locale]/(admin)/admin/providers/page.tsx>) |
| F3 后台主题切换入口 | AdminShell 顶栏（admin 登录后所有页） | [components/layout/AdminShell.tsx](../../components/layout/AdminShell.tsx) |
| F3 admin 登录页主题角落 | `…/en/admin/login` | [admin/login/page.tsx](<../../app/[locale]/(admin)/admin/login/page.tsx>) |

### 系统 / 后台任务（无 UI）

| 功能 | 触发 | 源码 |
|---|---|---|
| F1 背调 vendor 回调 | `POST …/api/compliance/background-check/webhook` | [api/compliance/background-check/webhook/route.ts](../../app/api/compliance/background-check/webhook/route.ts)、vendor 适配器 [lib/compliance/](../../lib/compliance/) |
| F1 Stripe Connect 账户回调 | `POST …/api/stripe/connect-webhook` | [api/stripe/connect-webhook/route.ts](../../app/api/stripe/connect-webhook/route.ts)、[lib/stripe/connect.ts](../../lib/stripe/connect.ts) |
| F1 合规到期 cron（30 天预警 + 过期下架） | `GET …/api/cron/check-compliance-expiry`（Bearer `CRON_SECRET`） | [api/cron/check-compliance-expiry/route.ts](../../app/api/cron/check-compliance-expiry/route.ts) |
| F1 自动 approve / country matrix | 多入口调用 | [lib/provider/autoApprove.ts](../../lib/provider/autoApprove.ts)、[lib/compliance/country.ts](../../lib/compliance/country.ts) |

> 主链路（消费者/服务者/管理员）的**既有**页面 URL 表（订单、个人资料、安全、争议等）见 [E2E_SERVER_GUIDE.md §2](../E2E_SERVER_GUIDE.md) 与 [E2E_FULL_FLOW.md](../E2E_FULL_FLOW.md) 各 Phase 步骤里的源码链接。
