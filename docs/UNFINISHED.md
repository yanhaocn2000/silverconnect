# SilverConnect — 未完成工作清单

**生成时间**: 2026-05-04
**最近修订**: 2026-05-06（晚间 round 3 — 大规模功能补完；详见 §0.5）
**当前部署**: http://47.236.169.73（迁移至 Vercel `https://silverconnect-global.vercel.app/` 在路上）
**当前分支**: `feat/ui-rebuild`（即将重命名为 `main`，旧 main 转 `legacy-old`）

> 这份文档列出 demo 跑通后**距离生产可上线**还差什么。每条标了类别（凭据 / 项目硬规则 / 用户延后 / 外部依赖）和**做之前需要的输入**。

---

## 0.5 Round 3（2026-05-06 晚）大批量补完

这一轮做完的（不再是未完成项）：

**清理 / 工程**：
- 删 7 个死 lib 文件（matching/providers/services/location/locationUtils/translations/types/supabase）
- 删整个 `components/domain/{adminMock,providerMock}.ts`（~600 行 mock）；`priceCountry` 移至 `components/domain/pricing.ts`
- `next.config.ts` 已无 `ignoreBuildErrors` / `ignoreDuringBuilds`；TS + lint 0 errors
- `npm test` 加 `--passWithNoTests`，CI 不再 false-fail
- Playwright 5 projects 配置（chromium/firefox/webkit/Mobile Chrome/Mobile Safari）+ webServer 启用

**新功能 / 真 DB 接入**：
- `RescheduleModal` + 完整改约 server action（4h/30d/状态校验，触发 provider in-app + email）
- `DeleteCardConfirm` 模态（堵住误触删卡）
- `ReportReviewModal`（customer 举报评价）+ `/admin/reports` 全 CRUD（keep/delete/warn）
- `DeclineJobModal` / `ReplyReviewModal` / `UploadDocModal` 抽出（Provider 侧）；DeclineJobModal 已接入
- 9 个 admin / provider 页面切真 DB：ai/kb、ai/conversations、refunds、payments、dashboard、settings、provider/reviews、provider/calendar、customers/[id]
- 邮件模板：`buildBookingStatusEmail` (5 种状态) / `buildDisputeUpdateEmail` / `buildProviderApprovalEmail`
- `notifyAndEmail()` helper（按 notification_prefs 自动跳过 opt-out 用户）
- 接入触发点：provider/jobs accept/decline/start/complete + admin dispute decision + admin provider approve/reject

**部署 / 基础设施**：
- 决定迁移到 Vercel（HTTPS/CDN/HTTP-2/brotli 全自动）
- `.github/workflows/deploy.yml` 改为 `push: branches: [main]` 自动触发
- `vercel.json` 写好（framework=nextjs，maxDuration 60s）
- 3 个 Vercel Cron 路由：`/api/cron/recurring-bookings` / `cancel-stale` / `sla-disputes`（daily schedule）
- PWA：`app/manifest.ts` + 自动生成 `/icon` + `/apple-icon`（Next 15 metadata 约定）

**记忆固化**：deployment.md 更新为 Vercel；新建 feedback_stripe-live-keys.md（用户决策"用 live key 不要再提示"）

---

---

## 0. 报告口径

| 标签 | 含义 |
|---|---|
| 🟡 USER-DEFERRED | 你已经明确说"测试服不用做，正式上线再做" |
| 🔴 RULE-BLOCKED | 项目 `CLAUDE.md` 硬规则禁止动相关目录（已部分解禁，标注当前状态） |
| 🟠 INPUT-NEEDED | 等你提供凭据 / 决策 |
| ⚪ NICE-TO-HAVE | 可做但优先级不高 |

---

## ✅ 自 2026-05-04 以来已完成（不再是"未完成"）

按 git log 核对，文档上一版列为"未做"但已落地的：

- **真鉴权**：Supabase Postgres + Gmail SMTP 6 位验证码（`90ff191f` Phase 1 / `a6511e35` Real email verification）
- **真订单数据库**：Phase 2 + Phase 3 schema 共 27 张表（`06bffe85` / `3ed012ce`）
- **bookings / profile / reviews / disputes / safety 全部接 DB**（waves 5-9）
- **AI 客服真接 GLM-4.5-flash**（`af7c7cdd`，注：**不是 OpenAI/Claude，是智谱 GLM**）
- **GDPR 数据导出 + 注销账号**（`b9c499fa` Wave 11，含 30 天冷静期 cascade）
- **本地磁盘文件上传**：合规材料、争议证据（`c3482f21` Wave 10）
- **AskAI 跨页悬浮入口**（`834345e1` Wave 12）
- **`/profile/addresses/new` + `/profile/payment/new`**（`59630cb3` Wave 9）
- **admin 长尾详情页**：disputes/[id]、safety/[id]、providers/[id]（Wave 9）
- **CI**：GitHub Actions schema-check + 手动 Vercel deploy（`aeede992`）
- **legacy `app/api/**` Supabase 路由清理**（`d042a9f8`）
- **全流程 Playwright UI E2E + 视觉回归**（`b8b6a553` / `16e8b809`）

---

## 1. 上线门槛级（必做）

### 1.1 🟠 Stripe 收付款 — 进行中

**前端 UI 是 mock**：`/pay/[bookingId]`、`/profile/payment`、`/provider/payouts`、`/admin/refunds`、`/admin/payments` 全是占位。

**SDK 已装**：`stripe@^17.3.0`、`@stripe/stripe-js@^4.0.0`（package.json）。
**DB 字段已留**：`stripe_payment_intent_id` / `stripe_refund_id` / `stripe_transfer_id` / `stripe_connect_id`。

**待建文件**：
- [ ] `lib/stripe/server.ts` — Stripe Node SDK init
- [ ] `app/api/checkout/route.ts` — 创建 PaymentIntent + 客户端 Element
- [ ] `app/api/webhooks/stripe/route.ts` — 验签 + `payment_intent.succeeded` → bookings 状态机
- [ ] `app/api/connect/onboard/route.ts` — Provider Stripe Connect Express 入驻
- [ ] `app/api/connect/dashboard/route.ts` — Express dashboard login link
- [ ] `app/api/refunds/route.ts` — Stripe refund + 状态回流
- [ ] 托管支付（escrow）业务逻辑：customer 确认完成 → transfer 给 Provider
- [ ] **顺手修** `lib/paymentUtils.ts:74` ReferenceError（`booking.total_price` 取不到）
- [ ] Stripe Connect 平台费率（AU 18% / CN 22% / CA 18%）从 admin 设置读取——schema 留了字段没接 UI

**做之前需要**（用户决策：用 live key）：
1. ⏳ `pk_live_...` Publishable key
2. ⏳ `sk_live_...` Secret key
3. ⏳ `whsec_...` Webhook signing secret（依赖 1.2 HTTPS）
4. ⏳ Stripe Connect 平台账号 + 是否开 Connect 的决策

### 1.2 🟡 HTTPS + 域名

**现状**：纯 IP `http://47.236.169.73`。Stripe live webhook **强制要求 HTTPS**，是 1.1 的硬前置。

**做之前需要**：
- 域名（用户提供）
- DNS A 记录指向 47.236.169.73
- nginx + Let's Encrypt certbot

### 1.3 🟠 中国区支付通道

Stripe 在中国大陆不直接服务个人。需要单独接：
- 微信支付（JSAPI / Native）
- 支付宝（Alipay）
- （可选）银联

**预估**：3-5 天，看具体接哪家。

### 1.4 法务 / 合规

`/help/privacy`、`/help/tos` 文案已经写过（Wave 11），但**三国合规没专门审过**：
- [ ] 澳洲 Aged Care Quality Standards（老人产品特别合规）
- [ ] CN 数据本地化（个人信息保护法）
- [ ] CA PIPEDA
- [ ] 隐私 / 服务条款由律师 review

---

## 2. 通知 / 实时 / 定时

### 2.1 业务通知邮件

SMTP 链路有了（Gmail 6 位验证码用的就是它），但**业务通知邮件模板没写**：
- [ ] 订单确认 / 状态变更
- [ ] 争议进展通知
- [ ] Provider 入驻审核结果
- [ ] 释放托管支付通知

**位置**：建 `lib/email/templates/` + 在状态机切换点（bookings 状态变更 / Stripe webhook）触发。

### 2.2 推送通知

**现状**：`/notifications` 是 DB 里的通知列表，**没有真推送**。

**缺**：
- [ ] FCM (Android/Web) + APNs (iOS) 凭据
- [ ] `lib/push/` — 客户端订阅 + 服务端推送
- [ ] `/profile/notifications` 偏好真实生效

### 2.3 Websocket 实时

**现状**：聊天、订单状态变化要手动刷新。

**缺**：
- [ ] Websocket 网关（Supabase Realtime / Pusher / 自建）
- [ ] 订单状态变化推流（customer ↔ provider）
- [ ] 聊天消息推流

### 2.4 cron 定时任务

- [ ] 循环订单自动下单（recurring_series 表已有）
- [ ] 24h 未确认订单自动取消
- [ ] SLA 倒计时

---

## 3. Spec 漏建：模态 / inline 替代

`docs/UI_PAGES.md` 列了 spec、当前用 inline form 替代的：

### 3.1 Provider 侧（[UI_PAGES.md:479-481](UI_PAGES.md#L479-L481) 明确列出）

| 模态 | 当前 inline 位置 | 重要性 |
|---|---|---|
| **DeclineJobModal** | [provider/jobs/[id]/page.tsx](../app/[locale]/(provider)/provider/jobs/[id]/page.tsx) 内联 form | 多触发点：任务列表 + 详情都要弹 |
| **ReplyReviewModal** | provider/reviews 内联 form | 列表内每条都要能弹 |
| **UploadDocModal** | provider/compliance 内联 `<input file>` | 资质过期通知 / 合规页 / 入驻 都要呼出 |

### 3.2 Customer 侧（spec 列了，待逐个 audit）

未逐个核过哪些已做哪些 inline 替代：AuthModal、LocaleModal、RescheduleModal、InviteFamilyModal、ChatModal、FeedbackQuickModal、ReportReviewModal、DeleteCardConfirm。

> ⚠️ 文档上一版误列了 LocationConfirm / ServiceConfirm / AppointmentReminder / AskAI overlay 这 4 个。这些**不在** UI_PAGES.md 里，已删除。

**优先级**：不阻塞上线。inline 替代功能上 100% 通；只是体验一致性 + 多触发点复用问题。

---

## 4. 监控 / 运维

### 4.1 🟠 Sentry DSN

`@sentry/nextjs` 装好、`instrumentation.ts` + `instrumentation-client.ts` 接好、`error.tsx` 自动 captureException。**但没 DSN 全部 no-op**。

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

→ `pm2 reload silverconnect`，立即开始捕获。

### 4.2 ⚪ Prometheus / Grafana

什么监控都没有。pm2 内置监控只能本机看。**已有基础**：pm2-logrotate 装了，每晚备份脚本装了。

### 4.3 ⚪ Staging 环境

直接打生产，没有预发布。

### 4.4 ⚪ Lighthouse 性能优化

| URL | Perf | A11y | Best | SEO | LCP |
|---|---|---|---|---|---|
| /zh/home | 73 | 95 | 79 | 100 | 4960ms |
| /zh/services | 82 | 96 | 79 | 100 | 3643ms |
| /zh/auth/login | 75 | 95 | 79 | 100 | 4652ms |
| /zh/admin/login | 74 | 95 | 79 | 100 | 4667ms |

LCP 4-5s 主要因为：裸 IP（无 HTTP/2、无 CDN、无静态缓存头）+ JS bundle 偏大。**HTTPS 后顺手做**：HTTP/2 + brotli + 静态资源 1y cache + 字体子集化 + 首屏图片 priority。

---

## 5. 测试 / 质量

- [ ] **`__tests__/` 单元测试** — 没跑过，pass 率未知；`__tests__/services/auth.service.test.ts`、`geo.service.test.ts` 引用不存在的模块
- [ ] **k6 压测** — 没跑过
- [ ] **跨浏览器**（Safari / Firefox / 移动端 viewport）— 当前 e2e 只跑 chromium 桌面
- [ ] **真实键盘 a11y 流测**（tab 顺序、焦点陷阱）
- [ ] **i18n 中文母语审校** — zh.json 全部我直译。聚焦：老人称呼（"师傅"/"阿姨"/"护工"）、紧急话术、法律文案、AU 华人 vs 国内华人差异

---

## 6. 长尾 / Nice-to-have

- [ ] **PWA / 添加到主屏** — 老人桌面 App 体验
- [ ] **`next.config.ts` 上线版的 `ignoreBuildErrors:true` / `ignoreDuringBuilds:true`** — 等代码修干净后撤掉
- [ ] **`lib/supabase.ts` 占位凭据** — 现在真用 Postgres 了，这文件可能已废，待清理确认
- [ ] **mock 数据清理** — `components/domain/{providerMock,adminMock}.ts` 在接 DB 后应删
- [ ] **Sprint 5 设计稿出图** — Sprint 1 出过 14 屏高保真，Sprint 2-5 直接按 docs 实现，没二次出图

---

## 7. 仓库 / 流程

| 项 | 状态 |
|---|---|
| 本地未推 commit | `feat/ui-rebuild` ≥30 commits 未 push（等 Vercel envs 就绪） |
| origin | 已配置 `https://github.com/yanhaocn2000/silverconnect.git` |
| .env.example secret 占位符 | 全是 `your-xxx`；上线前给生产 .env |
| 🟡 `sc-deploy.key` 私钥 | 用户说"上线后轮换" |

### 7.1 Vercel 首次部署 checklist（用户操作）

**A. Vercel Dashboard → silverconnect-global → Settings → Git**：连 `yanhaocn2000/silverconnect`，Production Branch 设为 `main`，**关掉 Vercel 自带 auto-deploy**（GitHub Actions 控）

**B. Vercel Dashboard → Settings → Environment Variables**（All Environments）：
```
DATABASE_URL=<postgres URL — 测试库 jtauyssjtmmagjltjcvz pooler，等生产 DATABASE_URL 切>
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
PLATFORM_FEE_PERCENT=20
SESSION_SECRET / NEXT_PUBLIC_APP_URL=https://silverconnect-global.vercel.app
EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASSWORD / EMAIL_FROM
GLM_API_KEY / GLM_BASE_URL / GLM_MODEL
CRON_SECRET=<随机 32+ 字节，用于 /api/cron/* 验签>
```

**C. GitHub Repo Settings → Secrets → Actions**：
```
VERCEL_TOKEN=<vercel.com/account/tokens 创建>
VERCEL_ORG_ID=team_V0iunB5JnKuPRw80UkiSNxFc
VERCEL_PROJECT_ID=prj_mfwDqQusJ1UnEWr6ppat0yEv7Rwh
```

**D. Stripe Dashboard → Webhooks**：Add endpoint `https://silverconnect-global.vercel.app/api/webhooks/stripe`，订阅 `payment_intent.succeeded` / `payment_intent.payment_failed` / `charge.refunded` / `account.updated`。复制新 signing secret 替换 Vercel env 里的 `STRIPE_WEBHOOK_SECRET`。

A-D 全部就绪后告诉我 → 我执行分支 reorg 推 main，触发首次自动部署。

---

## 8. 优先级建议（依赖顺序）

```
1. HTTPS + 域名 (1.2)
        ↓
2. Stripe live webhook (1.1) ← 当前进行中
        ↓
3. Stripe Connect 平台费率 UI
        ↓
4. 业务通知邮件 (2.1)  ← 顺势接 Stripe webhook
        ↓
5. 法务文案 review (1.4)
        ↓
6. Sentry DSN (4.1)  ← 非阻塞，可任意时机做
        ↓
7. 中国区支付 (1.3)  ← 独立分支
```

后置：推送通知、Websocket、cron、PWA、Prometheus、跨浏览器测试。

---

## 9. 当前对话进度

正在做 **1.1 Stripe**。等用户提供：
- [ ] `pk_live_...`
- [ ] `sk_live_...`
- [ ] `whsec_...`（依赖 1.2 HTTPS 才能在 Stripe Dashboard 创建 endpoint）
- [ ] 是否开 Connect + 平台费率确认（默认 AU 18% / CN 22% / CA 18%）

凭据齐了立刻写 `lib/stripe/server.ts` + `/api/checkout` + `/api/webhooks/stripe` 三件套。
