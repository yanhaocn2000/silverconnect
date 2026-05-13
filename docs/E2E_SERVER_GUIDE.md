# SilverConnect VPS — E2E 验收手册

> **服务器**：现在主站走 **`https://silverconnect.xinxinsoft.org`**（AWS-1 Sydney nginx + Let's Encrypt → HTTP 转 VPS-5 `47.236.169.73`，见 [AGENTS.md](../AGENTS.md) / [DEPLOYMENT.md](../DEPLOYMENT.md)）。下文 §2 的 URL 表仍写裸 IP `http://47.236.169.73` 是 2026-05-06 的历史 —— **新验证一律把 host 换成 `https://silverconnect.xinxinsoft.org`**，cookie `Secure` 已恢复。
> **生成时间**：2026-05-06（§3A「新功能验证入口」于 2026-05-12 增补）
> **用途**：E2E 全流程跑通后，验证三种角色的功能入口；§3A 覆盖 2026-05 新增功能（合规自动化 / 捐赠 / 主题 / i18n / 认证统一）
> **完整测试方案**：主链路见 [E2E_FULL_FLOW.md](./E2E_FULL_FLOW.md)；新功能见 [zh/e2e-new-features-2026-05.md](./zh/e2e-new-features-2026-05.md)。

---

## 1. 测试账号

| 角色 | 邮箱 | 密码 | 备注 |
|---|---|---|---|
| Customer | `yanhaocn2000@gmail.com` | `Ab@13882177114` | 主测试账号；已下过一笔订单 |
| Provider | `helen-li@example.com` | `Helen2026!` | seed 数据；订单 `8d3da170` 的服务者 |
| Provider（备用） | `helen.test@example.com` | `Helen2026!` | seed 数据；未实际使用 |
| Admin | `admin.e2e@example.com` | `Admin2026!` | 登录 TOTP 输任意 6 位数字（当前是 stub） |

> ⚠️ **临时密码**：上面 Helen / Admin 的密码是 E2E 期间重置的临时值。上线前请改回。
> ⚠️ **Customer 注册只能选 customer**：`/auth/register` 硬编码 `role: "customer"`，要成为 provider 必须先注册成 customer，再走 `/provider/register` 入驻向导。

---

## 2. URL 一览

### 公共入口

| 用途 | URL |
|---|---|
| 注册（仅 customer） | http://47.236.169.73/en/auth/register |
| 登录（按 DB role 自动跳转；`?role=consumer\|provider` 切 tab 文案） | http://47.236.169.73/en/auth/login |
| 登录短链 | http://47.236.169.73/login（→ `/auth/login`）、http://47.236.169.73/p（→ `/auth/login?role=provider`） |
| 邮箱验证 | http://47.236.169.73/en/auth/verify |
| 忘记密码 | http://47.236.169.73/en/auth/forgot |
| 公益捐赠落地页 | http://47.236.169.73/zh-CN/donate |
| 捐赠成功 / 取消 | http://47.236.169.73/zh-CN/donate/success?session_id=… ／ http://47.236.169.73/zh-CN/donate/cancel |

### Customer 端

| 用途 | URL |
|---|---|
| 首页（服务发现） | http://47.236.169.73/en/home |
| 服务列表 | http://47.236.169.73/en/services |
| 我的订单 | http://47.236.169.73/en/bookings |
| 订单详情（已跑） | http://47.236.169.73/en/bookings/8d3da170-967b-4693-a7e1-89df33de7723 |
| 通知中心 | http://47.236.169.73/en/notifications |
| 个人资料 | http://47.236.169.73/en/profile |
| 地址管理 | http://47.236.169.73/en/profile/addresses |
| 紧急联系人 | http://47.236.169.73/en/profile/emergency |
| 安全设置 | http://47.236.169.73/en/profile/security |
| 隐私 / 数据导出 / 注销账号 | http://47.236.169.73/en/settings/privacy |
| 账户设置 | http://47.236.169.73/en/settings/account |
| 报告安全事件 | http://47.236.169.73/en/safety/report |
| AI 助手 | http://47.236.169.73/en/chat |

### Provider 端（成为服务者）

| 用途 | URL |
|---|---|
| **入驻向导**（普通用户 → 服务者；含 ABN / Stripe Connect / 背调授权） | http://47.236.169.73/en/provider/register |
| 入驻状态（DB 驱动 5 步 + retry） | http://47.236.169.73/en/provider/onboarding-status |
| 仪表盘（登录后自动跳；job gate 入口） | http://47.236.169.73/en/provider |
| 全部任务 | http://47.236.169.73/en/provider/jobs |
| 任务详情（已跑） | http://47.236.169.73/en/provider/jobs/8d3da170-967b-4693-a7e1-89df33de7723 |
| 收入 | http://47.236.169.73/en/provider/earnings |
| 提现 | http://47.236.169.73/en/provider/payouts |
| 评价 | http://47.236.169.73/en/provider/reviews |
| 个人资料 | http://47.236.169.73/en/provider/profile |
| 服务列表 | http://47.236.169.73/en/provider/services |
| 文档合规 | http://47.236.169.73/en/provider/compliance |

### Admin 端

| 用途 | URL |
|---|---|
| Admin 登录 | http://47.236.169.73/en/admin/login |
| 仪表盘 | http://47.236.169.73/en/admin |
| 安全事件 | http://47.236.169.73/en/admin/safety |
| 已处理报告示例 | http://47.236.169.73/en/admin/safety?id=969c92be-3a1c-4bfb-9994-827e40fdcf9c |
| 争议处理 | http://47.236.169.73/en/admin/disputes |
| 服务者审批 | http://47.236.169.73/en/admin/providers |
| 退款 | http://47.236.169.73/en/admin/refunds |
| 订单管理 | http://47.236.169.73/en/admin/bookings |
| 客户管理 | http://47.236.169.73/en/admin/customers |
| 收款 | http://47.236.169.73/en/admin/payments |
| 报告 | http://47.236.169.73/en/admin/reports |
| 数据分析 | http://47.236.169.73/en/admin/analytics |
| AI 对话审计 | http://47.236.169.73/en/admin/ai/conversations |
| AI 知识库 | http://47.236.169.73/en/admin/ai/kb |
| 系统设置 | http://47.236.169.73/en/admin/settings |

> 中文版把 URL 里的 `/en/` 换成 `/zh/`。

---

## 3. 快速验证清单（10 分钟跑完）

### Customer 流程
1. 访问 http://47.236.169.73/en/auth/login，用 customer 账号登录 → 应跳转到 `/en/home`，标题 "Hello, yanhaocn2000 👋"
2. 看 "Recently booked" 卡片有 Helen Li → 点 "Book again" → 看 provider 详情
3. http://47.236.169.73/en/bookings → 列表里有 1 条订单，状态 "Completed"
4. 点订单详情 → 看到 timeline（Booked → Confirmed → In progress → Completed），底部 "Leave review" 按钮（已留过评论会显示已完成）
5. http://47.236.169.73/en/notifications → 4 条通知（safety reviewed / service complete / on the way / accepted）
6. http://47.236.169.73/en/settings/privacy → 点 "Download my data" → 出现下载链接（线上 404，见已知问题）

### Provider 流程
1. **登出 customer**（点 Profile → Sign out 按钮，**注意现在是 button form 不是链接**）
2. 用 Helen 账号登录 → 自动跳到 `/en/provider`，标题 "Hi, Helen Li"
3. http://47.236.169.73/en/provider/jobs → 看到任务列表
4. 点已跑那笔（`8d3da170...`）→ 详情显示 "Cleaning · Completed"

### Admin 流程
1. 登出（如果在 customer / provider 状态） → 访问 http://47.236.169.73/en/admin/login
2. 用 admin 账号 + **任意 6 位数字** 作 TOTP → 进入仪表盘
3. http://47.236.169.73/en/admin/safety → 看到 2 条 incident，其中 `I-969c92be` 状态为 REVIEWED
4. 点进去查看 → action 显示 "Warning issued — E2E test: warning issued."

---

## 3A. 新功能验证入口（2026-05 增补）

> host 用 `https://silverconnect.xinxinsoft.org`；locale 用 `/en/` 或 `/zh-CN/`（旧 `/zh/` 会 308 跳 `/zh-CN/`）。完整用例编号见 [zh/e2e-new-features-2026-05.md](./zh/e2e-new-features-2026-05.md)。

### F1 — 服务者自动化合规

| 用途 | URL / 操作 | 看什么 |
|---|---|---|
| 入驻向导（AU provider） | `…/en/provider/register` | Step1 出现 ABN 输入框（填无效 → 报错；有效 → 回显 Business Name）；Step5 有「连接 Stripe」按钮 + 背调授权勾选框（未勾不能提交） |
| 入驻状态 | `…/en/provider/onboarding-status` | 5 步：submitted / docs / background（pending→cleared，~3s mock 回调）/ stripe / live；每步旁有对应 action 按钮；背调 failed 时显示 retry |
| 合规文档 | `…/en/provider/compliance` | 上传 3 份必需 PDF（按 AU matrix）；文件不再是公开 URL，经 `/api/compliance/documents/{id}` 鉴权读取 |
| Admin 服务者审批 | `…/en/admin/providers/{id}` | 展示 ABN / 背调状态 / consent；每份文档有 `Approve` / `Reject` 按钮；有 `Force approve`（带 note）；webhook dead-letter/orphan 区块 |
| Job gate | 用未 cleared 的 provider 访问 `…/en/provider` 与 `/provider/jobs` | 「账户受限」横幅，只列已有 confirmed/in_progress 订单，不显示新 pending 派单 |
| 到期 cron | `curl -H "Authorization: Bearer $CRON_SECRET" https://silverconnect.xinxinsoft.org/api/cron/check-compliance-expiry` | 30 天内到期 → 通知 provider+admin；已过期 → 标 expired + `approved→docs_review` + 客户侧下架 |

### F2 — 公开捐赠

| 用途 | URL / 操作 | 看什么 |
|---|---|---|
| 捐赠落地页 | `…/zh-CN/donate` | hero + 进度卡（实时 DB）+ 故事 + 饼图 + 表单；强制 light（即使全站 dark）；金额预设按钮 `aria-pressed` |
| Stripe Checkout（test 卡 4242） | 选 $50 → 提交 → Stripe 托管页 | 跳回 `…/zh-CN/donate/success?session_id=…`；DB `donations.status='completed'` + `donation_payments` 一行；进度 +$50 |
| 取消回退 | Stripe 页点 cancel | 跳 `…/zh-CN/donate/cancel` |
| Webhook（VPS 真实投递或 `stripe listen`） | Stripe Dashboard webhook endpoint = `https://silverconnect.xinxinsoft.org/api/stripe/webhook` | `checkout.session.completed` / `invoice.paid` / `refund.created` 等命中；重投同 event 不重复 |
| Live smoke | 真实 $1 单次 → 立即 Dashboard 退 $1 | 邮件/DB/进度更新；退款 webhook 幂等；进度 -$1 |

### F3 — 明/暗主题

| 用途 | 操作 | 看什么 |
|---|---|---|
| 切换入口 | Header（customer/provider/public）或 AdminShell 的 ThemeToggle | Light / Dark / System 三态；刷新保持（localStorage）；无首屏闪烁；`<html data-theme=…>` 稳定存在 |
| 双主题不破 | dark 下逐页看 customer / provider / admin / public | 无「浅色 tile + 深色背景」违和；`/donate` 在 dark 下仍是 light |
| auth 页入口 | `…/en/auth/login` 等无 Header 的页 + `/admin/login` | 固定角落入口可切换 |

### F4 — i18n 5 语言 + AU/US/CA

| 用途 | 操作 | 看什么 |
|---|---|---|
| locale 路由 | 访问 `/zh`（旧） | 308 跳 `/zh-CN` |
| 5 语言 | `…/en|zh-CN|zh-TW|ja|ko/home` 等关键页 | 正常渲染、无缺 key 报错；语言切换器切换正常 |
| 服务区域 | provider 注册选国家 | `AU / US / CA`（无 `CN`）；US 上下文显示 `911` / `US$` / `Sales Tax` / `CCPA` |
| help articles | `…/en|…/help` 7 篇文章 | 5 语言都有内容 |

### F5 — 认证统一

| 用途 | 操作 | 看什么 |
|---|---|---|
| 角色 tab | `…/en/auth/login` | 默认 consumer；切 Provider tab → 标题/注册链接变；实际登录仍按 `users.role` 路由 |
| 短链接 | 访问 `https://silverconnect.xinxinsoft.org/login` 和 `…/p` | 经 `proxy.ts` 委派给 next-intl，落到对应 locale 的登录页（`/p` → provider 入口）|
| Admin 登录 | `…/en/admin/login` | 不受 F5 影响（独立 cookie `sc-admin`，TOTP 仍 stub）|

---

## 4. 已知问题

| # | 问题 | 严重度 | 状态 |
|---|---|---|---|
| 1 | Admin 登录 TOTP / 密码都是 stub，任意 6 位数字 + ≥8 字符密码就过 | 🔴 严重 | 上线前必修 |
| 2 | 数据导出文件写到 `public/uploads/exports/` 但 production 不动态托管 build 后的 public 文件，URL 返回 404 | 🟡 中 | 改走 download 路由或迁 S3 |
| 3 | ~~VPS 裸 IP HTTP，cookie `Secure` 关闭~~ | — | **已解除**：主站已上 HTTPS（`silverconnect.xinxinsoft.org`），`SESSION_COOKIE_SECURE` 在 VPS env 已注释掉、回落 `NODE_ENV==='production'`，Secure cookie 已签发 |
| 4 | Stripe：**捐赠流程已接入**（hosted Checkout + webhook + 退款）；**订单支付 / payout 仍未接** —— booking 详情的 "Pay securely" 是跳转 link、release 不结算给 provider | 🟢 低 | 捐赠按设计；订单 payout 待实现 |
| 5 | `e2e/functional.spec.ts` 还在用 GET `/auth/logout`，但 GET handler 已删 | 🟢 低 | 测试代码同步即可 |
| 6 | Provider 端 review 回复（`…/en/provider/reviews`）和争议（旁支 A）E2E 未跑 | 🟢 低 | 缺 fixture 数据 |
| 7 | `/profile/addresses` 的 "Edit" 按钮 disabled（feature gap） | 🟢 低 | 未实现 |
| 8 | 背调 vendor `ncc.ts` 是 stub（待 NCC 凭证）；测试期用 `BG_CHECK_VENDOR=mock` | 🟢 低 | 设计如此 |
| 9 | 私有合规文件存 VPS 本地 `.private-uploads/`，未迁云对象存储 | 🟢 低 | 上生产前迁 S3/Supabase Storage |

---

## 5. 修过的 7 个 Bug（这次 E2E 顺手修的）

| # | Bug | 修法 |
|---|---|---|
| 1 | `Secure` cookie 在 HTTP VPS 上让 `sc-session` 失效 → 登录后所有页都掉登录 | [lib/auth/session.ts](../lib/auth/session.ts) 改用 `SESSION_COOKIE_SECURE` env 控制 |
| 2 | `/pay/{id}` 显示硬编码金额（A$195/177.27/17.73）与订单不符 | [pay/[bookingId]/page.tsx](<../app/[locale]/(customer)/pay/[bookingId]/page.tsx>) 接 DB 反推 subtotal/tax |
| 3 | `/bookings/{id}/success` 整页 mock 文案 | [bookings/[id]/success/page.tsx](<../app/[locale]/(customer)/bookings/[id]/success/page.tsx>) 接 DB |
| 4 | `pending` 译为 "Awaiting payment" 与架构语义错位 | [messages/en.json:325](../messages/en.json) 改为 "Awaiting confirmation" |
| 5 | `/profile/addresses?add=1` 不打开新增表单 | [profile/addresses/page.tsx](<../app/[locale]/(customer)/profile/addresses/page.tsx>) 加重定向 |
| 6 | "Submit & release payment" 不翻 status 为 released | [feedback/page.tsx](<../app/[locale]/(customer)/bookings/[id]/feedback/page.tsx>) 事务里加 status 翻转 + booking_changes 留痕 |
| 7 | `/auth/logout` + `/admin/logout` 用 GET，被 Next.js 预取自动登出 | 删除 GET handler；4 处链接改为 `<form method="POST">` |

---

## 6. 部署到 VPS 的方法

详见 [DEPLOY_VPS5.md](../DEPLOY_VPS5.md)。

**热修流程**（改一两个文件后）：
```powershell
# 本机
scp -i F:\Project\testspec\TV2ALL\tmp\vps5_key.pem `
    <修改的文件> `
    root@47.236.169.73:/opt/silverconnect/<相对路径>

# VPS
ssh -i F:\Project\testspec\TV2ALL\tmp\vps5_key.pem root@47.236.169.73
cd /opt/silverconnect
NODE_OPTIONS='--max-old-space-size=1024' npm run build
pm2 restart silverconnect --update-env
```

数据库（Supabase pooler）直连查询：
```bash
ssh root@47.236.169.73
cd /opt/silverconnect
# 在 scripts/ 下写一个 .ts 文件，使用 postgres + dotenv
npx tsx scripts/<your-script>.ts
```

---

## 7. 三个角色的关系（数据模型）

```
users (id, email, password_hash, role, email_verified_at)
  │
  ├── role=customer ─────► addresses, emergency_contacts, payment_methods, bookings (as customer)
  │
  ├── role=provider ─────► provider_profiles (1:1) ──► provider_categories, services, service_prices
  │                            └─ onboarding_status: pending → docs_review → approved
  │                            └─ provider_documents (police_check, first_aid, insurance)
  │
  └── role=admin ────────► admin 登录走独立 cookie sc-admin（不通过 auth/login）

bookings.provider_id  ─► provider_profiles.id
bookings.customer_id  ─► users.id
bookings.status: pending → confirmed → in_progress → completed → released
                   └─► cancelled / disputed
```

---

## 8. E2E 测试设计文档

- 完整的主链路（21 步，v2）+ 旁支 A–E（A 争议 / B 安全事件 / C 注销 / D 合规自动化&job gate / E 公开捐赠）：[E2E_FULL_FLOW.md](./E2E_FULL_FLOW.md)
- 2026-05 这批新功能的可执行测试方案：[zh/e2e-new-features-2026-05.md](./zh/e2e-new-features-2026-05.md)
- 整体测试策略 / 工具 / 命令 / CI 闸门：[TESTING.md](./TESTING.md)

2026-05-06 那次（按当时的 v1 设计）跑完了主链路 Phase 1-5 + 旁支 B（B1-B3）。未跑：旁支 A（争议，需新订单走到 in_progress）、旁支 C（注销账号，毁数据级未授权）、旁支 D/E（2026-05 新增，`e2e/provider-compliance.spec.ts` 已覆盖 D 的一部分、`e2e/donate.spec.ts` 已覆盖 E 的一部分）。

---

## 9. 安全注意事项

1. **当前 Admin 登录是 stub**：`admin.e2e@example.com` + 任意 8 字符密码 + 任意 6 位数字 → 进入 admin。**上线前必修**。
2. **VPS 是 HTTP**：cookie 敏感数据（session、admin email）在网络上明文传输。**上线前必上 HTTPS**。
3. **临时凭证**：本文里的 4 个测试账号密码上线前必须改。
4. **数据库直连**：VPS `.env.local` 里有 Supabase 的 DATABASE_URL（含密码），切勿外泄。
