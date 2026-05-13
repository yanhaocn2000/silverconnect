# 全业务流程 E2E 测试设计

**版本**：v2（2026-05-12）— v1（2026-05-05）基础上吸收 2026-05 这批新功能
**作用域**：1 个消费者 + 1 个服务者，走完一笔订单的完整生命周期，覆盖主链路 + 旁支 A–E
**目的**：作为可执行的测试基线 — 任何后端改动后跑一遍即可确认核心闭环未坏

> **2026-05 新功能的详细测试方案**（服务者自动化合规、公开捐赠、明/暗主题、5 语言 i18n + AU/US/CA、认证统一）见 [zh/e2e-new-features-2026-05.md](zh/e2e-new-features-2026-05.md)。本文里：
> - Phase 1 的服务者入驻已改为「自动化合规」流程（ABN 校验 + 第三方背调 + Stripe Connect onboarding + 自动 approve）—— 见下方 Phase 1 注 + 旁支 D。
> - 旁支 D = 服务者合规自动化 / job gate；旁支 E = 公开捐赠流程。
> - 主题 / i18n / 认证统一不改变本文的订单主链路，列在 §9 / §10。

---

## 0. 前置条件

| 项 | 要求 |
|---|---|
| 应用运行 | `npm run dev` 在 `http://localhost:3000`（或让 `playwright.config.ts` 的 `webServer` 自动起）|
| 数据库 | Supabase dev project 已 apply 全部 migration（截至 2026-05：`drizzle/migrations/0000`–`0007`，含 0004 country enum 改 `AU/US/CA`、0005/0006 捐赠四表、0007 合规三表+列）。注：测试库 `npm run db:migrate` 不可用（`__drizzle_migrations` 为空会从 0000 重跑冲突），用 `npm run db:push` 或一次性 SQL apply |
| 种子 | `npm run db:seed`（[scripts/seed-catalog.ts](../scripts/seed-catalog.ts) — 类目 / service / 国家定价）+ 需 demo provider 时 `npm run db:seed:providers`；跑合规旁支 D 时另跑 `npx tsx scripts/seed-e2e-provider.ts` 造 AU provider；跑捐赠旁支 E 时 seed 一条 active campaign |
| Admin | `npm run db:seed`（[scripts/seed-catalog.ts](../scripts/seed-catalog.ts)）**只 seed catalog，不建 admin** —— 需用 [e2e/_helpers/db.ts](../e2e/_helpers/db.ts) 的 `seedAdmin()`（默认 `admin.e2e@example.com` / `role='admin'`）或手工往 `users` 插一行 `role='admin'` + `emailVerifiedAt` 非空 |
| 邮件 | 验证码 / 通知通过 Gmail SMTP 发，需 `.env.local` 里 `GMAIL_*` 配置；测试时也可读 `users.emailVerificationCode` 直接绕过 |
| 合规 vendor | `BG_CHECK_VENDOR=mock`（默认，~3s 自回调 `cleared`）；`ABR_GUID`（无则走 stub）|
| Stripe | test-mode key（`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET`）+ `APP_URL`；本地用 `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
| 私有文件目录 | `process.cwd()/.private-uploads/`（运行时自建）；dispute 等仍用 [public/uploads/](../public/uploads/) |

---

## 1. 角色

### 消费者：Mary

| 字段 | 值 |
|---|---|
| 邮箱 | `mary.test@example.com` |
| 密码 | `Test1234!` |
| 角色 | `customer` |
| 国家 | `AU` |
| 地址 | `12 Smith St, Sydney NSW 2000` |
| 紧急联系人 | `Tom Lee, +61400000000` |

### 服务者：Helen

| 字段 | 值 |
|---|---|
| 邮箱 | `helen.test@example.com` |
| 密码 | `Test1234!` |
| 角色 | `provider` |
| 国家 | `AU` |
| ABN | 任意有效 active ABN（ABR stub 模式下用脚本配的固定值；AU provider 必填）|
| 服务地址 | `45 Park Rd, Sydney NSW 2010` |
| 服务半径 | `15 km` |
| 类目 | `cleaning`、`cooking` |
| 文档 | police_check / first_aid / insurance（任意 PDF 即可；按 `lib/compliance/country.ts` 的 AU matrix 三份必需）|
| 背调授权 | Step5 勾选（`bgCheckConsentVersion='2026-05-11'`）|
| Stripe Connect | Step5 连接 Express account（test mode）|

### 管理员：Admin

| 字段 | 值 |
|---|---|
| 邮箱 | `admin.e2e@example.com`（[e2e/_helpers/db.ts](../e2e/_helpers/db.ts) `seedAdmin()` 的默认值；不由 catalog seed 创建 —— 手工跑 `seedAdmin()` 或往 `users` 插 `role='admin'` 行）|
| 密码 | E2E 期间设置的临时值（见 [E2E_SERVER_GUIDE.md §1](E2E_SERVER_GUIDE.md)）|
| 用途 | 第 6、A2、B2 步审批；admin 登录走独立 cookie `sc-admin`（不经 `/auth/login`），登录 TOTP 当前是 stub（任意 6 位数字） |

---

## 2. 主链路（Happy path）

### Phase 1 — 服务者入驻（步骤 1–6）

> ⚠️ **角色模型（关键）**：注册页 [/auth/register](<../app/[locale]/(public)/auth/register/page.tsx>) **只能注册成 customer** —— register action 硬编码 `role: "customer"`，没有 `/auth/signup`、也没有"注册时选角色"。成为服务者的路径是：先注册 customer → 走 [/provider/register](<../app/[locale]/(provider)/provider/register/page.tsx>) 入驻向导 → 向导末步 `finishWizard` 提交时才把 `users.role` 改成 `provider`（[register/page.tsx](<../app/[locale]/(provider)/provider/register/page.tsx>) 里 `update(users).set({ role: "provider" })`）+ `provider_profiles.submittedAt`。
> ⚠️ **2026-05 起改为自动化合规流程**（commit `6345e2bd`，设计见 [zh/provider-automated-compliance-plan.md](zh/provider-automated-compliance-plan.md)，测试见 [zh/e2e-new-features-2026-05.md §1](zh/e2e-new-features-2026-05.md)）。下表是更新后的步骤；旁支 D 列了 ABN 校验失败 / 背调 / job gate / 到期下架等分支。
> 关键变化：① 向导 Step1（bio）对 AU provider 多一个 **ABN 输入框**（必填，ABR 实时校验，回显 Business Name）；② 向导有 **背调授权勾选框**（必勾），提交后触发第三方背调（`BG_CHECK_VENDOR=mock` 时 ~3s 自动回调 `cleared`）；③ 向导的 **"Connect with Stripe"** 步骤接活了（建 Express account + onboarding link）；④ 合规文件（在 [/provider/compliance](<../app/[locale]/(provider)/provider/compliance/page.tsx>) 单独上传，不在向导里）存到 `.private-uploads/`（不在 `public/`），经 `/api/compliance/documents/{id}` 鉴权读取；⑤ admin 不再一键 approve —— 要逐份 `Approve` 必需文档，背调 cleared + 文档全 approved + AU 的 abnActive + Stripe payouts-enabled 全齐时由 `tryAutoApproveProvider` 自动 `approved`（admin 也可 `Force approve` 带 note override）。
> ⚠️ **`services` 是全局 catalog**（[lib/db/schema/services.ts](../lib/db/schema/services.ts) 的 `services` 表无 `providerId`，按 `categoryCode` 组织）—— 入驻向导**不创建** provider-specific 的服务/定价行；provider 可服务哪些类目由 `provider_categories` 表示。

| # | 触发动作 | 关键期望 |
|---|---|---|
| 1 | Helen 访问 [/auth/register](<../app/[locale]/(public)/auth/register/page.tsx>) 注册 | `users` +1 行（role=`customer`，emailVerifiedAt=null）。`provider_profiles` 此时**不**插入 —— 等步骤 3 进入 `/provider/register` 向导首步才建 |
| 2 | Helen 输入 6 位验证码（从邮件或 `users.emailVerificationCode` 读出）→ 提交 [/auth/verify](<../app/[locale]/(public)/auth/verify/page.tsx>) | `users.emailVerifiedAt` 非空 |
| 3 | Helen 走 [/provider/register](<../app/[locale]/(provider)/provider/register/page.tsx>) 5 步向导：bio（AU 填 ABN，回显 Business Name）→ 服务区域 / 类目（cleaning+cooking）→ 可用时段 → 连接 Stripe → 勾选背调授权；末步 `finishWizard` 提交（"Submit for review"） | 进向导首步即 `provider_profiles` +1（onboardingStatus=`pending`）；走完后 `provider_categories` +2、`provider_availability` +N、`provider_profiles` 写入 `abn / businessName / abnActive / abnValidatedAt / stripeAccountId / bgCheckConsentAt / bgCheckConsentVersion='2026-05-11'` 等、`submittedAt` 非空、onboardingStatus=`docs_review`、**`users.role` 由 `customer` 改为 `provider`**；`provider_background_checks` +1（status=`pending`, isCurrent=true）|
| 4 | mock vendor ~3s 后回调 `cleared`（`POST /api/compliance/background-check/webhook`） | `provider_background_checks.status='cleared'`、`clearedAt` / `expiresAt` 非空；`compliance_webhook_events` +1（status=`processed`） |
| 5 | Helen 在 [/provider/compliance](<../app/[locale]/(provider)/provider/compliance/page.tsx>) 上传 3 份 PDF（police_check / first_aid / insurance；必需文档按 `lib/compliance/country.ts` 的国家 matrix）+ 文档号 + 到期日 | `.private-uploads/compliance/{providerId}/` 出现 3 个 UUID 文件（**不在 `public/`**）；`provider_documents` +3 行（status=`pending`），`fileUrl` 存相对 key |
| 6 | Admin 登录 → [/admin/providers/{id}](<../app/[locale]/(admin)/admin/providers/[id]/page.tsx>) 逐份 `Approve` 必需文档（`reviewDocumentAction`），末份触发 `tryAutoApproveProvider` | 每份 `provider_documents.status='approved'` + `admin_actions` +1；条件全齐时 onboardingStatus=`approved`、`approvedAt` 非空、`provider_badges` upsert `kind='verified'`、`notifications` +1（userId=Helen, kind=`system`, title 含 "approved"）、`audit_log` 记自动 approve |

### Phase 2 — 消费者注册 + 资料（步骤 7–9）

| # | 触发动作 | 关键期望 |
|---|---|---|
| 7 | Mary 走 [/auth/register](<../app/[locale]/(public)/auth/register/page.tsx>)（注册即 role=`customer`）+ [/auth/verify](<../app/[locale]/(public)/auth/verify/page.tsx>) | `users` +1，role=`customer`，emailVerifiedAt 非空 |
| 8 | Mary 访问 [/profile/addresses/new](<../app/[locale]/(customer)/profile/addresses/new/page.tsx>) 填地址 | `addresses` +1 行；`isDefault` 自动置 `true`（因这是首条）|
| 9 | Mary 访问 [/profile/emergency](<../app/[locale]/(customer)/profile/emergency/page.tsx>) 加紧急联系人 Tom | `emergency_contacts` +1 行 |

### Phase 3 — 发现 + 下单（步骤 10–14）

| # | 触发动作 | 关键期望 |
|---|---|---|
| 10 | Mary 访问 [/home](<../app/[locale]/(customer)/home/page.tsx>) | 5 个类目卡片可见；cleaning 卡显示 `from $X/h`（来自 services × service_prices 联查）|
| 11 | Mary 访问 [/services/cleaning](<../app/[locale]/(customer)/services/[category]/page.tsx>) | 列表第一位是 Helen（`onboardingStatus=approved` 且类目匹配）；rating 显示 `—`（无评价）|
| 12 | Mary 点 Helen → [/providers/{id}](<../app/[locale]/(customer)/providers/[id]/page.tsx>) | bio、类目、可预订 7 天可见 |
| 13 | Mary 走 [/bookings/new](<../app/[locale]/(customer)/bookings/new/page.tsx>) 多步草稿（iron-session 暂存）：选 service → 时间 → 地址 → 备注 → 提交 | `bookings` +1 行（status=`pending`）；`booking_changes` +1 行（type=`status_change`, toStatus=`pending`）|
| 14 | 渲染等待时 `after()` 钩子触发通知 | `notifications` +1 行（userId=Helen, kind=`booking_update`，title="New booking request"）|

### Phase 4 — 履约（步骤 15–19）

> ⚠️ **release 和 review 是同一个动作**：completed 订单详情页 [/bookings/{id}](<../app/[locale]/(customer)/bookings/[id]/page.tsx>) 的按钮跳 [/bookings/{id}/feedback](<../app/[locale]/(customer)/bookings/[id]/feedback/page.tsx>)；该页的 feedback action 在**一个事务里**插入 `reviews` 行 +（若当前 `completed`）把 booking 改成 `released` + 写 `booking_changes`（toStatus=`released`，note="Customer released payment via feedback"）。**没有独立的 "release" 按钮** —— 按 v1 文档去找单独 release 控件的 Playwright 会失败。

| # | 触发动作 | 关键期望 |
|---|---|---|
| 15 | Helen [/provider/jobs/{id}](<../app/[locale]/(provider)/provider/jobs/[id]/page.tsx>) 点 `confirm` | bookings.status=`confirmed`；`booking_changes` +1；Mary 收通知 |
| 16 | 时间到，Helen 点 `start` | status=`in_progress`；`booking_changes` +1 |
| 17 | Helen 点 `complete` | status=`completed`；`completedAt` 非空；`booking_changes` +1；Mary 收通知 |
| 18 | Mary 在 [/bookings/{id}](<../app/[locale]/(customer)/bookings/[id]/page.tsx>) 看到 "completed · 待您确认" → 点进 [/bookings/{id}/feedback](<../app/[locale]/(customer)/bookings/[id]/feedback/page.tsx>) 留 5★ + 评论 → 提交 | 一个事务里：`reviews` +1 行；`bookings.status` `completed`→`released`；`booking_changes` +1（toStatus=`released`）。**wallet 流当前不自动写入** —— 生产会在 Stripe webhook 里调钱包，本期 release 只切 booking 状态；要观察钱包变化需先手动 seed Helen 的 `wallets` 行（参考 [scripts/smoke-phase2.ts](../scripts/smoke-phase2.ts)） |
| 19 | Helen [/provider/reviews](<../app/[locale]/(provider)/provider/reviews/page.tsx>) 看到评论 → 回复 | `review_replies` +1 行 |

### Phase 5 — 账户管理（步骤 20–21）

| # | 触发动作 | 关键期望 |
|---|---|---|
| 20 | Mary [/settings/privacy](<../app/[locale]/(customer)/settings/privacy/page.tsx>) 点 "Download my data" | `public/uploads/exports/{userId}/{uuid}.json` 生成；页面顶部出现下载链接 |
| 21 | 下载并解析 JSON | 字段含：user 资料 / 1 笔 booking / 1 个 address / 1 个 emergencyContact / 1 条 reviewWritten / 0 个 disputeRaised |

---

## 3. 旁支 A — 争议（替代步骤 18）

| # | 触发动作 | 关键期望 |
|---|---|---|
| A1 | 步骤 17 后，Mary 不走 feedback（即不 release/评论），改走 [/bookings/{id}/dispute](<../app/[locale]/(customer)/bookings/[id]/dispute/page.tsx>) 选 `incomplete` + 描述（>20 字符）+ 上传 2 张 JPG | `disputes` +1 行（status=`open`, raisedBy=Mary.id）；`dispute_evidence` +2 行（fileUrl 指向 `/uploads/dispute/{bookingId}/...`）；bookings.status=`disputed`；`booking_changes` +1 |
| A2 | Admin [/admin/disputes/{id}](<../app/[locale]/(admin)/admin/disputes/[id]/page.tsx>) 选 `partial refund $40` + note → submit | disputes.status=`decided`；resolution=`refund_partial`；resolutionAmount=`40.00`；bookings.status=`cancelled`；`notifications` +2（Mary + Helen 各一）|

跑完 A1+A2 后跳过步骤 18–19（订单已终态）。

---

## 4. 旁支 B — 安全事件（独立于订单）

| # | 触发动作 | 关键期望 |
|---|---|---|
| B1 | Mary 提交 incident（category=`harassment`，body >10 字符，附 1 张 JPG）— 入口在订单详情页或紧急流程 | `incident_reports` +1 行（reviewedAt=null）|
| B2 | Admin [/admin/safety/{id}](<../app/[locale]/(admin)/admin/safety/[id]/page.tsx>) 选 `ban` + note → submit | reviewedAt 非空；action 文本含 "Banned"；Helen.provider_profiles.onboardingStatus 不变（safety 与 onboarding 独立 — 如需联动需走 `/admin/providers/{id}` 单独 suspend）|
| B3 | Mary 收通知 | `notifications` +1（kind=`safety`, title 含 "reviewed"）|

---

## 5. 旁支 C — 注销账号（最后跑，会毁数据）

| # | 触发动作 | 关键期望 |
|---|---|---|
| C1 | Mary [/settings/privacy](<../app/[locale]/(customer)/settings/privacy/page.tsx>) 输入 `DELETE` → 提交 | `users` 行删除 |
| C2 | 级联清理 | `bookings` / `addresses` / `emergency_contacts` / `family_members` / `payment_methods` / `reviews` / `ai_conversations` / `ai_messages` / `incident_reports` / `notifications` 涉及 Mary 的全部 0 行 |
| C3 | 删除策略 | 用户的所有数据被清空 — 包括其发起的争议（通过 `disputes.bookingId` → `bookings.customerId` → `users.id` 的级联链一并删除）。仅 `review_reports.reporterId` 置 `null`（保留匿名审核历史）。隐私政策已与此一致：[components/domain/helpArticles.ts](../components/domain/helpArticles.ts) 声明 GDPR 第 17 条「被遗忘权」式删除 |
| C4 | session 销毁 | cookie `sc-session` 已清；浏览器跳 [/home](<../app/[locale]/(customer)/home/page.tsx>)`?deleted=1` |

---

## 5D. 旁支 D — 服务者合规自动化 / job gate（2026-05 新增）

> 完整用例（F1-1 ~ F1-36，含前置）见 [zh/e2e-new-features-2026-05.md §1](zh/e2e-new-features-2026-05.md)。这里只列与主链路 Phase 1 衔接的关键分支：

| # | 触发动作 | 关键期望 |
|---|---|---|
| D1 | AU 注册 Step1 填无效/非 active 的 ABN | `?step=1&error=abnInvalid`，不写库；填有效 → 回显 Business Name |
| D2 | US/CA provider 注册 | 不出现 ABN 字段；缺 ABN 不影响注册 |
| D3 | Step5 未勾背调授权就提交 | `?step=5&error=consentRequired` |
| D4 | 背调回调 `failed`（mock 失败态） | onboarding-status 显示「背调发起失败，请重试」+ retry 按钮 |
| D5 | 重复投递同一 `(vendor, externalRef)` webhook / 重复触发 `tryAutoApproveProvider` | 幂等：背调行不重复变更，通知/badge 只在实际 `docs_review→approved` 那次 |
| D6 | 背调未 `cleared` / 未 `approved` 的 provider 访问 `/provider`、`/provider/jobs`、`/provider/jobs/{id}` | 不显示新 `pending` 派单；显示「账户受限」横幅，仅列已有 `confirmed`/`in_progress` 订单 |
| D7 | 构造 POST 调 `jobAction` 的 `accept`（未 active） | 被 `assertActiveProviderOrThrow` 拒绝；但 `start`/`complete`/`decline` 对已 `confirmed`/`in_progress` 订单放行 |
| D8 | `tryAutoApproveProvider` 条件全齐（背调 cleared + 必需文档全 approved + AU 时 abnActive + Stripe payouts-enabled） | onboardingStatus=`approved`、`provider_badges` upsert `verified` |
| D9 | admin `Force approve`（填 note） | 跳过自动检查直接 `approved`；`adminActions` `action='provider.force_approve'`；默认不授 `verified` badge |
| D10 | cron `check-compliance-expiry`：文档/背调 `expiresAt` 落在 `(now, now+30d]` | `notifyAndEmail` 给 provider + `notifyAdmins`；`compliance_expiry_alerts` +1 行（同 `(subject, expiresAt)` 不重复发） |
| D11 | cron：`expiresAt < now` | 标 `expired`；`approved→docs_review`；`auditLog action='provider.compliance_expired'`；客户侧 `/services/{cat}` / 搜索 / `/bookings/new` Step2 不再出现该 provider |
| D12 | approved provider 续传必需文档 | `onboardingStatus` 回 `docs_review`；`auditLog action='provider.required_document_reuploaded'`；重新 approved 后恢复上线 |
| D13 | 客户侧 ProviderCard 的 `verified` | 取自 `provider_badges.kind='verified'` 真值，无硬编码 |

---

## 5E. 旁支 E — 公开捐赠流程（2026-05 新增，独立于订单）

> 完整用例（F2-1 ~ F2-21）见 [zh/e2e-new-features-2026-05.md §2](zh/e2e-new-features-2026-05.md)；设计见 [zh/donate-integration-plan.md](zh/donate-integration-plan.md)。捐赠人**无需登录**，与本文的 Mary/Helen 主链路无交集。

| # | 触发动作 | 关键期望 |
|---|---|---|
| E1 | 访问 `/zh-CN/donate` | hero + 进度卡 + 故事 + 饼图 + 表单渲染；强制 light（即使全站 dark）；`$50` 按钮 `aria-pressed=true` |
| E2 | 选金额 → 提交 | `POST /api/donate/checkout` 收到正确 payload；amount=0/负/超限被表单+服务端拒 |
| E3 | 单次 $50 → Stripe Checkout（test 卡 4242）→ 跳回 `/donate/success` | `donations.status='completed'`；`donation_payments` +1 行（`amountCents=5000`, `succeeded`）；感谢信发一次；进度 +$50 / donor +1 |
| E4 | 月捐 $25 → `invoice.paid`（create + cycle） | `donations.mode='monthly'`, `status='active'`；每次扣款 `donation_payments` +1 行 |
| E5 | Stripe CLI 重发同一 `event.id` | `donation_payments` 不重复；感谢信只发一次（claim-then-finalize + stale-lock 接管） |
| E6 | Stripe Dashboard 退款（`refund.created`） | `stripeRefundIds` 追加；`refundedAmountCents += refund.amount`；全额→`refunded`，部分→`partially_refunded`；进度相应减少 |
| E7 | `customer.subscription.deleted` | `donations.status='cancelled'`；`donation_payments` 不动 |
| E8 | 5 种 locale 切换 `/donate` | `donate` namespace 文案全翻译，无硬编码可见文案 |
| E9 | live smoke（生产，只跑一次）：真实 $1 单次 → 立即退 $1 | 邮件/DB/进度更新；退款 webhook 幂等命中；进度 -$1 |

---

## 6. Assertion 矩阵（主链路完成后）

| 表 | 增量 | 备注 |
|---|---|---|
| `users` | +2 | Mary + Helen |
| `provider_profiles` | +1 | Helen, status=approved；含 `abn / businessName / abnActive=true / abnValidatedAt / stripeAccountId / bgCheckConsentAt / bgCheckConsentVersion='2026-05-11'` |
| `provider_documents` | +3 | police_check / first_aid / insurance，跑完 admin 审核后 status=`approved` |
| `provider_background_checks` | +1 | Helen，`isCurrent=true`, status=`cleared`（mock vendor），`clearedAt` / `expiresAt` 非空 |
| `compliance_webhook_events` | +1 | mock vendor 的 `cleared` 回调，status=`processed` |
| `provider_badges` | +1 | Helen，`kind='verified'`（自动 approve 时 upsert；Force approve 默认不授） |
| `provider_categories` | +2 | cleaning + cooking（provider 可服务的类目）|
| `provider_availability` | +N | 入驻向导第 3 步选的可用时段（行数取决于勾了几个 day×slot）|
| `services` | 0 | `services` 是全局 catalog（无 `providerId`），入驻向导**不创建**服务/定价行 —— 这条不该有增量 |
| `admin_actions` | +3+ | admin 逐份 `Approve` 3 份必需文档时各记一行（`reviewDocumentAction` 写入）；若改用 Force approve 另记一行（`action='provider.force_approve'`） |
| `audit_log` | +1 | 自动 approve（actor 可空） |
| `addresses` | +1 | Mary, isDefault=true |
| `emergency_contacts` | +1 | Mary, Tom |
| `bookings` | +1 | status=released |
| `booking_changes` | +5 | 下单时一行（toStatus=`pending`）+ confirm + start + complete + release（feedback 触发）共 5 行（[scripts/smoke-full-flow.ts](../scripts/smoke-full-flow.ts) 也按 5 断言）|
| `reviews` | +1 | 5★ |
| `review_replies` | +1 | Helen 回复 |
| `notifications` | +5 | Helen 接 2 行（kind=`system` 的 "approved"（自动 approve 触发）+ kind=`booking_update` 的 "New booking request"）；Mary 接 3 行（kind=`booking_update`，分别对应 confirm / start / complete）。注：若跑了 D10 到期预警 / D4 背调失败等旁支，会多出 provider + admin 的额外通知行 |
| `wallets` | 0 | release 流仍不创建钱包行；Stripe Connect 本期只做 onboarding + 状态打通，未做 completed 订单到 provider 的 payout 结算。要观察钱包态需先手动 seed |
| `campaigns` / `donations` / `donation_payments` / `processed_stripe_events` | 0 | 捐赠流程（旁支 E）独立于订单主链路，与 Mary/Helen 无关；跑旁支 E 时按 [zh/e2e-new-features-2026-05.md §2](zh/e2e-new-features-2026-05.md) 单独断言 |

---

## 7. 实现形式（现状）

> 本设计已经落成两类可跑产物（**不是待办**）：

| 形式 | 文件（已存在） | 说明 |
|---|---|---|
| tsx smoke 脚本 | [scripts/smoke-full-flow.ts](../scripts/smoke-full-flow.ts)（+ 分阶段 `smoke-phase1/2/3.ts`） | 直接调 DB + Server Action 等价 helper；快；可在 CI 跑；`--delete` 才跑旁支 C |
| Playwright UI E2E | [e2e/full-flow-ui.spec.ts](../e2e/full-flow-ui.spec.ts)（含 `e2e/full-flow-ui.spec.ts-snapshots/`） | 真浏览器走 UI；慢；视口/CSS 偶发 flake |
| 新功能 spec | [e2e/provider-compliance.spec.ts](../e2e/provider-compliance.spec.ts)、[e2e/donate.spec.ts](../e2e/donate.spec.ts) | 覆盖旁支 D / E 的一部分 |

**待办不是"从零落地"，而是**：把 `smoke-full-flow.ts` / `full-flow-ui.spec.ts` 对齐本文 v2 的差异 —— ① `services` 不再有增量；② `booking_changes` = 5；③ release/review 合并为 feedback 一步；④ 补 `.private-uploads/`、background check、auto-approve、`verified` badge 的覆盖。**建议**：smoke 作日常回归（CI），UI E2E 作发版前烟雾（手动 / nightly）。

---

## 8. 数据清理

- **测试前**：删 `mary.test@example.com` 与 `helen.test@example.com` 两个 user 行 — schema 上 cascade 会带走全部相关数据（包括 `provider_profiles`、`provider_documents`、`provider_background_checks`、`provider_badges`、`bookings`、`addresses` 等）；`scripts/seed-e2e-provider.ts` 是 idempotent upsert，重跑即可重置那个 AU provider。
- **测试后**：默认不清理 — 保留作演示数据；下次跑前再清。
- **争议旁支跑过的**：`disputes` 表会有 raisedBy=null 的孤儿行（合规保留），如要彻底清理需手动 DELETE。
- **合规旁支跑过的**：`compliance_webhook_events` / `compliance_expiry_alerts` 会留行（设计如此，用于排查），不影响下次跑；`.private-uploads/compliance/{providerId}/` 下的文件不会自动清理。
- **捐赠旁支跑过的**：test-mode 的 `donations` / `donation_payments` / `processed_stripe_events` 行保留；如要清需手动 DELETE（注意外键顺序）。

---

## 9. 已知限制

| 项 | 现状 | 影响 |
|---|---|---|
| Stripe — 订单 payout | Connect onboarding 已做（建 Express account + 状态打通），但 **completed 订单到 provider 的结算 payout 未做** | 步骤 18 的 feedback action 把 booking 翻 `released`，但只切 booking 状态，不写 `wallets`；钱真正到 provider 要等 payout 触发实现 |
| Stripe — 捐赠 | 已接入（hosted Checkout + webhook + 退款），用 test/live key | 旁支 E 的 E3 之后需要 Stripe 托管页，自动测试只能到 redirect 前；webhook 流要 `stripe listen` 转发或在 VPS 真实投递 |
| 背调 vendor | `mock` 适配器（默认）；`ncc.ts` 是 stub，待 NCC 凭证 | mock ~3s 自回调 `cleared`，可端到端跑；真 vendor 接入后行为可能不同 |
| 邮件 | Gmail SMTP（个人账户）| 高频跑会被 Google 限流；CI 建议读 `users.emailVerificationCode` 直接绕过 |
| HTTPS | 主站已上 `https://silverconnect.xinxinsoft.org`（AWS-1 反代 → VPS HTTP），Stripe webhook 走主站 HTTPS；`E2E_SERVER_GUIDE.md` 里的裸 IP `http://47.236.169.73` 是历史，新验证用域名 | — |
| 私有文件 | `.private-uploads/`（本地磁盘，鉴权路由读）；dispute / export 仍在 `public/uploads/` | 生产上前迁云对象存储（TODO）；测试中文件不会自动清理 |
| 5 个 inline 模态 | 当前以 inline form 实现 | UI E2E 中点击位置/选择器与真模态不同，写测试时按现状对照 |
| i18n / 主题 / 认证统一 | 见 [zh/e2e-new-features-2026-05.md](zh/e2e-new-features-2026-05.md) §3–§5 | 这批改动不改本文订单主链路，但跑全量回归时需另外覆盖 locale 冒烟（5 语言）、双主题视觉回归、`/auth/login` 角色 tab + `/login` `/p` 短链 |

---

## 10. 下一步

可跑产物已存在（见 §7），下一步是**对齐 2026-05 差异**：

1. 更新 [scripts/smoke-full-flow.ts](../scripts/smoke-full-flow.ts)：`services` 不再断言增量；`booking_changes` 改 5；release/review 合并为 feedback；补 `.private-uploads/` + background check + auto-approve + `verified` badge 断言。
2. 更新 [e2e/full-flow-ui.spec.ts](../e2e/full-flow-ui.spec.ts)：注册走 `/auth/register`（customer-only）→ `/provider/register` 提升 provider；删掉找独立 "release" 按钮的步骤，改点 feedback 页提交。
3. 扩 [e2e/provider-compliance.spec.ts](../e2e/provider-compliance.spec.ts)（job gate / auto-approve / cron）、新增 i18n 冒烟 / 主题视觉回归 spec —— 见 [zh/e2e-new-features-2026-05.md §7](zh/e2e-new-features-2026-05.md)。

改动时回到本文逐条核对断言。
