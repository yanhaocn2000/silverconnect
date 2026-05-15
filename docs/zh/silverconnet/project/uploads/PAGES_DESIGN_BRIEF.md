# SilverConnect — 页面设计交接文档（中文版）

> 给视觉设计（Claude Design / UI 设计师）的交接文档。
> 生成于 2026-05-12；并于 2026-05-12 对照路由树复核过。覆盖应用当前已上线的**全部 75 个页面路由**。
> 来源依据：`app/[locale]/**/page.tsx` + `docs/zh/provider-automated-compliance-plan.md`。
> 英文原版见 [../PAGES_DESIGN_BRIEF.md](../PAGES_DESIGN_BRIEF.md)（以英文版为准，本文同步翻译）。

---

## 一、产品概览

**SilverConnect Global** —— 一个面向长者的上门服务预订平台。顾客（长者本人或其家人）预约经核验的本地服务者，提供保洁、做饭、园艺、个人护理、家居维修等服务；服务者管理派单、可用时间与收款提现；后台管理控制台处理纠纷、安全事件、合规与财务。

- **国家：** 澳大利亚 🇦🇺（AU）、美国 🇺🇸（US）、加拿大 🇨🇦（CA）。当前国家存于 Cookie（`CountrySwitcher`，默认 AU）。当前税名/税率为 AU 10% GST、US 8% Sales Tax、CA 13% HST。服务卡片用本地化的"含税"行展示时薪区间；预订/支付页显示小计 + 税 + 含税合计。部分遗留的显示工具仍把 US demo 价格自动缩放到 AU 的约 0.65 倍。
- **币种：** AUD / USD / CAD，统一用 `tabular-nums` 渲染。
- **语言（locale）：** `en`、`zh-CN`、`zh-TW`、`ja`、`ko`。路由带 locale 前缀（`/[locale]/...`），产品标准是用 `next-intl` 承载可见 UI 文案。**不允许新增硬编码文案** —— 每个新页面或新文案都要在 5 个 messages 文件里补齐 key。少数较旧/demo 页面里仍残留行内 fallback/demo 字符串，那是实现欠债，不是设计目标。
- **目标用户 = 长者。** 全站设计约束：大字号（正文 ≥16px）、高对比（有对比度 lint 脚本）、大触控目标（`min-h-touch` / `min-h-touch-btn`）、留白宽松、措辞平实、降低认知负担。
- **主题：** 明暗主题，基于 `next-themes`（`<html>` 上的 `data-theme`）。设计 token 是 CSS 自定义属性：`--brand` / `--brand-soft`，`--bg-base` / `--bg-surface` / surface-2，`--text-primary` / `--text-secondary` / `--text-tertiary`，`--border` / `--border-strong`，`--success` / `--warning` / `--danger`（各有 `-soft` 变体），`--chip-*`。圆角：`sm` / `md` / `lg` / `pill`。组件基于 Radix UI + 一套小型 shadcn 风格组件库（`components/ui/*`）。
- **技术栈：** Next.js（App Router、React Server Components）、Drizzle ORM + Postgres、Stripe（捐款 + 服务者 Connect onboarding/状态）、GLM（"问 AI"助手）。预订支付/收款结算仍是占位级；捐款走托管的 Stripe Checkout + webhook。多数页面是服务端渲染，因此很少有显式"加载中"状态 —— 报错/反馈状态通过 `?error=` / `?saved=` 等 query 参数以行内 banner 呈现。

### 四套"外壳"（route group）

| 分组 | URL 前缀 | 外壳 | 适用对象 |
|---|---|---|---|
| `(public)` | `/[locale]/...` | 裸壳；auth 页加一个角落主题切换；营销/帮助页用 `Header` | 任何人 |
| `(customer)` | `/[locale]/...` | `Header` + 移动端 `BottomTabBar` + `AIFloatButton`（悬浮按钮）+ `EmergencyOverlay`（SOS） | 已登录顾客（多数页未登录也能访问） |
| `(provider)` | `/[locale]/provider/...` | `Header` + 移动端 `ProviderBottomTabBar`；注册/onboarding 期间隐藏底部 tab | `role = provider` 的用户 |
| `(admin)` | `/[locale]/admin/...` | `AdminShell`（吸顶顶栏 + 左侧栏 / 移动端抽屉） | `role = admin` 的用户 |

---

## 二、全局 UI 模式与复用组件

**布局外框**
- **`Header`**（`components/layout/Header.tsx`）—— 吸顶，移动端 64px / 桌面 80px，底部边框。左侧：子页面上是返回箭头按钮（`back` 属性），否则是 **"SilverConnect"** 文字标 → `/home`，桌面端再加 `DesktopNav`。右侧簇：**Donate** 爱心 pill → `/donate`（移动端隐藏文字）、`ThemeToggle`、`CountrySwitcher`（AU/US/CA）、`LanguageChip`，以及已登录时的圆形首字母头像 → `/profile` / 未登录时的 **"Sign in"** 品牌色按钮 → `/auth/login`。
- **`BottomTabBar`**（顾客端，仅移动端）—— 固定底部，84px，5 等分：**Home** `/home` · **Services** `/services` · **Bookings** `/bookings` · **Messages** `/chat` · **Profile** `/profile`；当前 tab 品牌色。在 `/chat` 和 `/dev/*` 上隐藏。页面移动端预留 `pb-[120px]`。
- **`ProviderBottomTabBar`**（服务者端，仅移动端）—— 84px，5 列：**Workbench** `/provider` · **Jobs** `/provider/jobs` · **Calendar** `/provider/calendar` · **Earnings** `/provider/earnings` · **Profile** `/provider/profile`。在 `/provider/register/*` 和 `/provider/onboarding-status/*` 上隐藏。
- **`AdminShell`** —— 吸顶顶栏（移动端汉堡菜单、"SilverConnect **Admin**" 文字标、管理员邮箱、主题切换、登出图标）；左侧栏 `w-64`（移动端为抽屉），两个导航分组；主区最大宽 1280px。详情类页面在暗色遮罩上叠出右侧滑入式 `<aside role="dialog">` 面板（最大宽 480px）。
- **`AIFloatButton`** —— 移动端悬浮按钮，右下（约上移 100px），品牌 pill "Ask AI" → `/chat`。在 `/chat`、`/pay/*`、`/providers/[id]`、`/bookings/[id]*`、`/bookings/new`、`/dev/*` 上隐藏。
- **`EmergencyOverlay` / SOS** —— 小红色"SOS"圆按钮，固定右下（移动端约上移 180px / 桌面 88px）。打开一个全屏暗红色弹层：脉冲告警图标、标题、按国家区分的副文案、一个大的 `tel:` 拨号按钮（000 / 911）、一个"通知我的紧急联系人"按钮 → `/profile/emergency`、关闭入口。也可由 `#sos` hash 或 `sc:sos` window 事件触发。
- **跳转链接** —— 每个 locale 页面有一个视觉隐藏的"skip to content"链接；获焦时变为固定品牌按钮，指向 `#main-content`。

**设计师会反复见到的复用组件**
`AuthCard`（居中卡片，移动端全宽 / ≥sm 时 480px，置于 `bg-surface` 底色上，26px 特粗 h1 + 可选副标题）、`AuthRoleTabs`（Consumer / Provider 双段 tablist）、`ProviderCard` + `ProviderAvatar`（圆形首字母头像，4 种色相；卡片显示评分 ★、评价数、距离、$/h、"Verified" 等徽章）、`BookingStatusBadge`（按状态着色的 pill）、`BookingTimeline`（状态步进器）、`BookingProgress`（向导步进器）、`EmptyState`（lucide / 自定义插画 + 标题 + 可选提示 + 可选 CTA）、各类模态框（`DeclineJobModal`、`ReplyReviewModal`、`ReportReviewModal`、`RescheduleModal`、`DeleteCardConfirm`）、`Skeleton`（骨架闪光）、状态 `Alert` banner、`Button`（变体 primary / secondary / ghost / danger；尺寸 sm / md / lg；`block`）、`Input` / `Label`（带 `invalid` 状态 + 提示行）、`Switch`、`Card` / `CardTitle` / `CardBody`。有个实时组件画廊在 `/dev/components`（仅 dev 构建）。

**反复出现的交互范式**
- **吸底 CTA 条**：在移动端 tab 栏上方（移动端 `bottom-[84px]` / 桌面 `bottom-0`）—— 用于预订详情、预订向导、支付、服务者详情、派单详情、注册向导。
- **全屏成功页**：居中绿色对勾圆圈（或插画）+ 大标题 + 提示 + 单个品牌 CTA。用于：邮箱验证后、密码重置后、纠纷已提交、反馈已提交、支付成功、安全报告已提交。
- **行内 banner**：执行变更操作后通过 `?saved=1` / `?added=1` / `?uploaded=1` / `?applied={id}` 显示绿色 `success-soft` `role="status"`（"已保存 ✓ / 已发送 / 已处理 · {id}"）；通过 `?error=...` 显示红色 `danger-soft` `role="alert"`（校验错误）；琥珀色 `warning-soft` 用于软提示（如"账户审核中"、"距开始前 47 小时可免费取消"、"文档即将到期"）。
- **空状态**：带插画 + 标题 + 可选提示 + 可选 CTA 的边框卡片。（少数后台页目前用裸"—"代替 —— 下文已标注。）
- **禁用 / "即将上线" 控件**广泛存在（见下文标注）—— 请按它们的最终形态设计，但要知道它们目前是惰性的。
- **数字、金额、日期、ID** 一律 `tabular-nums`；ID 显示为 8 位短哈希，常带前缀：预订 `#xxxxxxxx` / `B-xxxxxxxx`，纠纷 `D-xxxxxxxx`，安全事件 `I-xxxxxxxx`，退款 `R-…`。

---

## 三、认证流程  *（设计参考：airtasker.com）*

> **设计方向：** 注册 / 登录体验对标 **Airtasker** —— 一条干净、友好、以信任为先的漏斗。当前登录页有显著的 **Consumer ⇄ Provider** 角色切换；注册页是邮箱优先，且即便从 Provider tab 进入也始终先创建一个 customer 账号；用户在邮箱验证后通过完成 `/provider/register` 才成为服务者。认证页面刻意**无外框** —— 没有 Header、没有导航、没有 tab 栏 —— 只有居中的 `AuthCard` 置于 `bg-surface` 底色上，仅在右上角固定一个主题切换。这是用户的第一印象：要温暖、让人安心（面对的是把信任交出来的长者）。社交登录按钮目前只是视觉占位。

> **目标账户模型（Airtasker 式 —— 这是设计意图；当前代码只是近似实现）：** **注册一次 = 一个账号，既能当消费者也能当服务者。** 新用户只注册一次（邮箱 + 密码 + 验证）就能立即预约服务。**服务者那一侧** —— 发布服务信息、对派单投标 / 接单 —— 才是**需要先提交合规材料**的部分（身份 / ABN、背景调查、证书、保险、Stripe 收款设置）。这些材料一旦提交并审核通过，**平台会保存下来，用户以后不用再提交** —— 只有到期或被拒时才需要重交。*目前代码用这些方式近似：一个 `role` 字段从 `customer → provider` 升级（通过 `/provider/register` 向导）；4 项条件的"approved"门禁（见第五节）；以及 `/provider/compliance` 文档库 —— 已批准的文档会一直存档到过期。注册页仍然先创建 customer 账号。设计师可以把"统一单账号"体验当作目标，把消费者/服务者的角色拆分当作要在 UI 里隐藏掉的实现细节。*

顾客认证页把已登录用户重定向到 `/home`；独立的后台登录会把已有 admin cookie 的用户重定向到 `/admin`。实际逻辑由 server action 完成；错误通过 `?error=` 回传。

### 3.1 `/[locale]/auth/login` — 登录
- `AuthRoleTabs`（Consumer / Provider —— 切换会改变 `?role`、标题/副标题文案、以及"注册"链接的目标）。
- `?error=credentials`（"凭据无效"）或通用错误时显示红色错误 banner。
- 表单：**邮箱**（`type=email`）、**密码**（`minLength=8`，current-password 自动填充），下方一小行灰色提示（"≥8 位"）。主按钮（block）**"登录"**。成功后：按角色跳转 → `/provider`、`/admin` 或 `/home`；邮箱未验证 → `/auth/verify`。
- **"忘记密码？"** 链接（品牌色，48px 高）→ `/auth/forgot`。
- "或"分隔线（两条细线 + 居中"或"）。
- 社交按钮：**"用 Google 继续"**（G 字形）、**"用 Apple 继续"**（代码里的图标位目前是空的）—— 大号带边框按钮；**目前是惰性占位**。
- 底部："还没账号？**注册**"（从 Provider tab 进入时带 `?role=provider`，但注册仍先创建 customer 账号）+ 一小行条款提示。

### 3.2 `/[locale]/auth/register` — 创建账号
- 红色错误 banner：`?error=taken`（"邮箱已被使用"）、`smtp`（"邮件服务未配置"）、`send`（"发送失败"）、通用。
- 表单：**邮箱**、**密码**（`minLength=8`，new-password）+ 提示。主按钮（block）**"注册"**。提交后：创建（或更新未验证用户的）`customer` 账号，签发 6 位 `email_verify` 验证码，异步发送验证邮件，→ `/auth/verify?email=…&sent=1`。`?role=provider` 不被此 action 消费，它只是登录/注册导航上下文的一部分。
- "或"分隔线 + 同样的 **Google / Apple** 按钮（惰性）。
- 底部："已有账号？**登录**" → `/auth/login` + 一小行条款提示。
- *（注：Airtasker 那样的多步资料补全 —— 姓名、所在地等 —— 目前还没有；现在注册就是邮箱 + 密码 → 验证。设计师可提出更丰富的分步方案。）*

### 3.3 `/[locale]/auth/verify` — 验证邮箱（6 位验证码）
需要 `?email=`。状态机：`pending` / `resent` / `success` / `expired`。
- **success：** 卡片标题 + 提示，大号绿色 `CheckCircle2`（48px），大品牌按钮 **"前往首页 →"** → `/home`。
- **expired：** 标题 + 提示，单个重发表单 → **"重新发送验证码"** block 按钮。
- **pending / resent（默认）：** 标题（"verifyResent" vs "verifyTitle"），副标题插入邮箱地址。可选错误 banner（验证码错误/缺失、被限流、格式错误、发送失败）。Hero：大号 brand-soft 圆圈 + `Mail` 图标（42px）+ 加粗 `tabular-nums` 的邮箱。**验证码表单：** 单个大号居中输入框 —— `inputMode=numeric`、`pattern=\d{6}`、`maxLength=6`、one-time-code 自动填充，样式 `tracking-[8px] text-[24px] tabular-nums`，下方一行提示（"检查垃圾邮件"）。主按钮（block）**"确认"**（验证码正确 → 标记邮箱已验证、登录、→ `?state=success`）。下方：**"打开邮件应用"** 带边框按钮（`mailto:`）和一个文字链接 **"重新发送验证码"**（独立表单 → `?resent=1`）。

### 3.4 `/[locale]/auth/forgot` — 忘记密码（请求验证码）
- `?error=invalid` 时显示错误 banner。
- 表单：单个**邮箱**字段。主按钮（block）**"发送重置验证码"**。**不暴露邮箱是否存在** —— 无论账号是否存在行为一致；若存在，则签发 6 位 `password_reset` 验证码并发送邮件。→ `/auth/reset?email=…&sent=1`。
- **"返回登录"** 链接（品牌色，48px 高，全宽）。

### 3.5 `/[locale]/auth/reset` — 重置密码（验证码 + 新密码）
状态：`default` / `success` / `expired`。
- **success（`?sent=1`）：** 标题 + 提示，绿色 `CheckCircle2`，大品牌按钮 **"返回登录"**。
- **expired（`?state=expired`）：** 标题 + 提示，大品牌按钮 → `/auth/forgot`。
- **default：** 可选绿色状态 banner（"已给你发送验证码"）；可选红色错误 banner（密码不匹配、验证码格式/缺失/错误/过期/被限流）。表单：**邮箱**（预填）、**验证码**（`inputMode=numeric`、`pattern=\d{6}`、`maxLength=6`，居中 `tracking-[6px] text-[20px]`）、**新密码**（`minLength=8`）+ 提示、**确认密码**。主按钮（block）**"重置密码"** → 消费验证码、更新哈希、→ `?sent=1`。**"返回"** 链接（品牌色，48px，全宽）。

### 3.6 `/[locale]/admin/login` — 后台登录（独立，无 AdminShell）
居中卡片（最大宽 420px）置于 `bg-surface-2`，角落主题切换。顶部：品牌 `ShieldCheck` 图标 + "SilverConnect Admin" 眉标 + 标题/副标题。表单：**邮箱**、**密码**（≥8）、**TOTP** 6 位验证码（`\d{6}`，带提示）→ 主按钮（block）**"登录"** → 设置 admin Cookie → `/admin`。`?error=invalid` 时显示错误 banner。底部说明：IP 白名单 + 账户锁定提示。*（密码/TOTP 校验目前是 stub。）*

---

## 四、顾客端 —— 页面

> 外壳：`Header`（逐页渲染，适当带 `back`）+ 移动端 `BottomTabBar` + `AIFloatButton` + `EmergencyOverlay/SOS`。常用容器：`max-w-content`，移动端 `pb-[120px]` / 桌面 `pb-12`。有主操作的页面使用**吸底 CTA 条**。

### 首页与发现

**`/[locale]/home` — 顾客首页**（`(customer)/home/page.tsx`）
落地仪表盘。从上到下：**问候块** —— 大字"Hi, {name}"（退化为邮箱前缀 / "guest"）、副标题提示、装饰性 `S1 TeaTime` 插画。**搜索条**（GET → `/search?q=`）。**品类网格**（2 列）—— 带彩色 emoji 的方块（🧹 保洁 · 🍳 做饭 · 🌿 园艺 · 🤝 个人护理 · 🔧 维修）、品类名、"from $X/h"（按国家最低价），→ `/services/[cat]`。**最近预约**（已登录 + 有历史）—— 横向滚动，最多 4 个历史服务者（头像、名字、品类、"再次预约" 描边按钮 → `/providers/[id]`）；未登录则显示一行品牌色"欢迎"文案代替。**推荐服务者** —— 一张精选 `ProviderCard`（按平均评分排第一的服务者：评分、评价数、$/h、verified 徽章）；已登录但无数据 → `EmptyState`。

**`/[locale]/search` — 搜索**（`search/page.tsx`）
标题 + 搜索表单（文本框 + "搜索"，GET，保留 `q`）。无 `q` 时为提示态。有 `q` 时：标题"Results for {q}" + 最多三段（仅非空时）：**服务者**（头像、名字、品类用 · 连接、★评分(数) → `/providers/[id]`）、**服务**（pill 芯片 → `/services/[cat]`）、**帮助文章**（卡片 → `/help/[slug]`）。无结果 → 虚线卡片"无结果"。

**`/[locale]/services` — 服务品类**（`services/page.tsx`）
标题"Services" + 含税信息 banner（"价格含 GST"）。品类卡片纵向列表（约 200px 高）：大号人物插画（C3 HelperMei / C4 CookZhang / C5 GardenerTom / C6 NurseAnna / C7 FixerBob）、品类名、描述、"$lo–$hi/h" 价格区间、服务者数（"N 位服务者" / "暂无服务者"）、箭头 → `/services/[cat]`。

**`/[locale]/services/[cat]` — 按品类看服务者**（`services/[cat]/page.tsx`）
`cat` ∈ cleaning|cooking|garden|personalCare|repair（否则 404）。标题"{品类} (AU)" + 时薪区间副标题（含税）。**筛选 pill 行**（横向滚动）：评分 · 距离 · 语言 · 周末 · 女性 · 急救证 + "排序: 推荐 ▾" —— **全部为禁用占位**。`ProviderCard` 列表（该品类已批准的服务者，按评分再按评价数排序）：头像、名字、评分、评价数、距离（"—"）、$/h、verified 徽章。空 → `EmptyState`"无匹配"。

**`/[locale]/providers/[id]` — 服务者详情**（`providers/[id]/page.tsx`）
`id` = 服务者档案 id（缺失则 404）。若服务者未批准 → 琥珀色"当前离线"banner。**头部：** 100px 头像、名字、★平均分(评价数)、徽章行（已批准则"Verified" + 其他徽章 + 品类芯片）。**简介**卡片（如有）。**提供的服务：** 服务变体行列表（品类 · 时长 · 编码 · 价格）或"无变体"说明。**评价：** 无 → 边框卡片"暂无评价"；有 → 大号平均分数字 + 5→1 星**直方图条** + 可选"举报已发送"成功 banner + 最多 5 条最近评价（星级行；已登录用户可触发 `ReportReviewModal` 举报评价 —— 原因 spam/abusive/false/off_topic/other + 详情文本框、可选评论；"— {顾客} · 日期"）。**吸底 CTA：** 禁用的"给服务者发消息"图标按钮 + 一个禁用的"当前离线"按钮或品牌按钮 **"继续 · 起价 $X 含 GST"** → `/bookings/new?step=1`。

### 预订流程

**`/[locale]/bookings/new` — 新建预订向导**（`bookings/new/page.tsx`）
4 步向导，通过 `?step=1..4`；草稿存于 session。每步：Header 下方的 `BookingProgress` 步进器 + 吸底页脚（返回链接 + 下一步/确认）。校验错误用行内 `Alert`。
- **第 1 步 — 选服务：** 当前国家可用服务变体的单选列表（品类 · 时长、服务编码、基础价）。
- **第 2 步 — 选服务者 + 时间：** 提供该品类的已批准服务者单选列表（名字、服务半径 km）+ `datetime-local` "何时"（≥ 当前 1 小时后，服务端强制）。无服务者 → 提示。
- **第 3 步 — 选地址：** 已保存地址单选列表（标签、完整地址行；默认地址预选）。无 → 卡片提示"添加地址" → `/profile/addresses/new`。
- **第 4 步 — 确认并完成：** 摘要卡片（服务 / 服务者 / 何时 / 地址）、价格明细（服务费 + 税率 % + 加粗合计）、"距开始前 24 小时可免费取消"信息提示、可选**备注**文本框、**"确认并支付 $X"** 提交 → 创建预订（`pending`），通知服务者，→ `/pay/[id]`。

**`/[locale]/bookings` — 预订列表**（`bookings/page.tsx`）
tab 栏 **即将进行 / 历史 / 周期性**（`?tab=`）。即将进行/历史：预订卡片 —— 服务者头像（色相由 id 派生）、服务者名字、格式化日期时间、`BookingStatusBadge`、加粗价格 → `/bookings/[id]`；空 → `EmptyState`（"无即将进行" + "预约一次保洁" CTA → `/services`；"无历史" + 提示）。周期性：行（服务编码、频率 · 周几 · 几点、"自 {日期}" / "已结束 {日期}"）；空 → `EmptyState`"无周期性"。

**`/[locale]/bookings/recurring` — 周期性订单**（`bookings/recurring/page.tsx`）—— *mock 数据。*
标题 + 副标题、活跃/暂停计数行、订单卡片列表（服务者头像、"{品类} · {服务者}"、节奏 周/双周/月、"下次执行 {日期}"、活跃/暂停芯片、每卡 **暂停/恢复** + 红色 **结束** —— 均惰性）。虚线"添加周期性" → `/services`。空 → `EmptyState`（`Repeat` 插画 + "添加" CTA）。

**`/[locale]/bookings/[id]` — 预订详情**（`bookings/[id]/page.tsx`）
`id` = 预订 id（非本人则 404）。状态徽章 + `#xxxxxxxx`。条件信息条（"距开始前 47 小时可免费取消" / 琥珀色"无法取消 —— 进行中"）。**服务者/预订卡片：** 头像、服务者名字、服务编码 · 时长；各行：日历（日期时间）、地图标记（地址，如有）、信用卡（合计 + 币种）。**`BookingTimeline`** 状态步进器。若 confirmed/in-progress/completed：红色"我有问题 → 报告"链接 → `/bookings/[id]/dispute`。**吸底操作条：** 若 pending/confirmed —— 一个方形红色"✕"取消按钮（server action）+ `RescheduleModal` 触发器（"改期" —— 日期时间输入，4 小时–30 天窗口）；主 CTA —— pending → "立即支付" → `/pay/[id]`；completed → → `/bookings/[id]/feedback`；其他 → 一个带状态文案的禁用品牌按钮。

**`/[locale]/pay/[bookingId]` — 支付**（`pay/[bookingId]/page.tsx`）
非本人则 404。状态 `?state=default|loading|threeDS|failed|success`。**success：** 全屏 —— 绿色对勾圆圈、"支付成功"、金额、"跳转中…"。**default：** 标题"Pay" + "🔒 安全"行；支付按钮 —— **Apple Pay**（黑）、**Google Pay**、"或用银行卡"分隔线，然后品牌边框的**银行卡 fieldset**：卡号 / 有效期 / CVV / 持卡人姓名 —— **全部预填了测试值（4242…、12/28、123、MARGARET WANG）**。**failed：** 红色"被拒"alert。**threeDS：** 蓝色"3-D Secure"状态块。**订单摘要**卡片：小计 / 税率 % / 加粗合计。**吸底：** loading/threeDS 时为转圈"处理中" / "等待银行"禁用按钮；否则品牌 **"🔒 支付 $X"** → `/bookings/[bookingId]/success`。

**`/[locale]/bookings/[id]/success` — 支付成功**（`bookings/[id]/success/page.tsx`）
非本人则 404。居中：`S5 PaymentSuccess` 插画；大标题"预订已确认"（仍 pending 时为"处理中…"）；副文案"{服务者} 已接受"（或处理中提示）。**预订摘要**卡片：服务者头像 + 名字 + 服务·时长；各行：日期时间、地址、"已付 $X"。按钮：**"加入日历"**（品牌，日历图标）、**"下载 .ics"**（描边）—— *两者均惰性占位* —— 以及 **"查看预订 →"** → `/bookings/[id]`。

**`/[locale]/bookings/[id]/feedback` — 留下反馈**（`bookings/[id]/feedback/page.tsx`）
未找到则 404；仅当预订为 `completed`/`released` 时可用。已提交（或刚提交）→ 成功页（绿对勾、"谢谢！"、"{服务者}"、"{评分}★ 已提交"、"查看预订"链接）。否则：标题 + "给 {服务者} 评分"副标题、可选错误 alert（rating / not_completed / duplicate / server）、服务者摘要卡片。**表单：** 5 个大星按钮单选组（默认选 5）；一行可选 **标签 pill**（守时 / 专业 / 干净 / 友好 / 公道 —— 仅视觉）；**评论**文本框；**禁用**的照片上传；**"提交并放款"**（同时释放托管资金 → `released`）。

**`/[locale]/bookings/[id]/dispute` — 发起纠纷**（`bookings/[id]/dispute/page.tsx`）
非本人则 404。已有/刚提交的纠纷 → 成功页（绿对勾、"纠纷已提交"、"案件 D-xxxxxxxx"、当前状态、"返回预订"）。否则：标题 + 副标题；琥珀色**警告提示**（"请如实…"）；错误 alert（描述太短 / 文件太大 / 文件类型不对）。**表单（multipart）：** 单选**类型**（服务者未到 / 服务未完成 / 损坏 / 其他）；必填**描述**文本框（≥20 字）；**文件上传**证据（JPG/PNG/WebP/HEIC/PDF，每个 ≤10 MB，相机图标提示）；单选**诉求**（重做 / 部分退款 / 全额退款）；**"提交"** → 预订状态 → `disputed`。

### 聊天 / AI

**`/[locale]/chat` — AI 助手**（`chat/page.tsx`）
全屏聊天（移动端隐藏 Header，桌面显示；此处隐藏 tab 栏与 FAB）。`?from=` 设置返回链接目标（默认 `/home`）。`?emergency=1` → 专门的紧急视图（暗屏、脉冲告警图标、"紧急"、按国家副文案、巨大红色 `tel:` 按钮 000/911、"关闭" → `/chat`）。**普通视图：** 聊天头栏（返回箭头、`C9 AICompanion` 头像、"{标题}" + 绿色"在线"点、国旗芯片）；**消息流** —— 未登录 → AI 伴侣插画 + "请登录后开始聊天" + "登录"按钮；已登录但空 → 伴侣插画 + 空标题/提示；否则一串 `ChatBubble`（我在右 / AI 在左），`role:"system"` 行为居中琥珀色 alert pill（GLM 错误）。**输入栏：** 禁用的"+"附件按钮、文本框（"composer"占位，1–2000 字，未登录则禁用）、禁用的麦克风/语音按钮、品牌圆形 **发送** 按钮。提交后立即持久化用户消息、扫描紧急关键词（→ `?emergency=1`）、延迟生成 GLM 回复。

### 通知

**`/[locale]/notifications` — 通知**（`notifications/page.tsx`）
顶栏：tab **全部 / 预订 / AI / 系统**（`?tab=`）+ **"全部标为已读"** 提交。"AI" tab 永远是 `EmptyState`（`S4 EmptyChat` 插画）。列表行：按类型着色的方块图标（日历 = 预订/支付/纠纷，消息气泡 = 评价/安全，齿轮 = 系统/营销）、加粗标题、可选正文、相对时间（"3 分钟前" / "昨天" / 本地化）、红色未读点；未读行有淡 brand-soft 底色；带 `link` 的行可点击。空 → `EmptyState`"无通知"。

### 个人中心

**`/[locale]/profile` — 个人中心菜单**（`profile/page.tsx`）
头像头部：96px 首字母头像、名字、"会员自 {Mar 2024}"。菜单列表（图标 + 标签 + 描述 + 箭头）：**编辑资料** → `/profile/edit` · **安全** → `/profile/security` · **地址** → `/profile/addresses` · **支付方式** → `/profile/payment` · **紧急联系人** → `/profile/emergency` · **收藏** → `/profile/favourites` · **通知设置** → `/profile/notifications` · **帮助** → `/help`。另有红色 **"登出"** 按钮（POST → `/auth/logout`）。

**`/[locale]/profile/edit` — 编辑资料**（`profile/edit/page.tsx`）—— *demo（GET 往返，不持久化）。*
标题、可选"已保存"banner、居中 96px 头像，表单：**姓名**、**邮箱**（预填 `margaret@example.com`）、**电话**（预填）、**语言**下拉（5 个 locale）、**保存**。

**`/[locale]/profile/security` — 安全**（`profile/security/page.tsx`）—— *demo（假实现）。*
标题、已保存/错误 banner（不匹配 / 当前密码错）。**修改密码**表单：当前 / 新（≥8）/ 确认 + 保存。**两步验证**卡片：盾图标、提示、"启用"按钮 —— *惰性*。**会话**列表：一条（"本设备"、"刚才活跃"）+ 红色 **"全部登出"**（POST → `/auth/logout`）。

**`/[locale]/profile/addresses` — 已保存地址**（`profile/addresses/page.tsx`）
标题。空 → `EmptyState`（MapPin）+ "新增" CTA。地址卡片列表：地图标记图标、标签（默认则带"默认"徽章）、完整地址行；每卡 **编辑**（禁用占位）、**"设为默认"** 提交（非默认时）、红色 **垃圾桶** 删除。底部虚线"新增" → `/profile/addresses/new`。

**`/[locale]/profile/addresses/new` — 添加地址**（`profile/addresses/new/page.tsx`）
返回 → `/profile/addresses`。标题"新增"。表单卡片：可选"必填"错误 banner、**标签**（默认"Home"）、**地址行**（必填）、**区/市**（必填）+ **州**（2 列）、**邮编**、**保存**。第一个地址自动设为默认。

**`/[locale]/profile/payment` — 支付方式**（`profile/payment/page.tsx`）
标题 + "🔒 安全"banner。空 → `EmptyState`（CreditCard）+ "添加卡" CTA。卡片行列表：品牌徽章（"VISA"）、"•••• {last4}"（带"默认"徽章）、"有效期 MM/YYYY"、**"设为默认"** 提交（非默认时）+ `DeleteCardConfirm` 模态（删前确认）。虚线"添加卡" → `/profile/payment/new`。

**`/[locale]/profile/payment/new` — 添加卡**（`profile/payment/new/page.tsx`）—— *占位，无真实表单。*
返回 → `/profile/payment`。标题"添加卡" + "🔒 安全"banner。一张虚线卡片：信用卡图标、"暂未开放"、说明卡片采集将走 Stripe Elements、"返回"链接。

**`/[locale]/profile/emergency` — 紧急联系人**（`profile/emergency/page.tsx`）
标题 + 副标题。空 → `EmptyState`（ShieldAlert）+ "添加联系人" CTA。联系人卡片列表：红色电话图标、名字（优先级 1 则带红色"主要"徽章）、关系标签 + 电话；每卡 **"设为主要"** 提交（非主要时）+ 红色 **垃圾桶** 删除。`?add=1` 显示行内品牌边框表单：可选错误 banner、**姓名**（必填）、**电话**（必填，tel）、**关系**下拉（女儿/配偶/兄弟姐妹/朋友/其他）、**保存**；否则一个虚线"添加联系人"链接。

**`/[locale]/profile/favourites` — 收藏**（`profile/favourites/page.tsx`）—— *mock 数据；`?state=empty` 强制空。*
标题。空 → `EmptyState`（Heart）+ "浏览" CTA → `/services`。否则一个 `ProviderCard` 列表（名字、首字母、评分、评价数、距离、$/h、verified + firstAid 徽章）。

**`/[locale]/profile/notifications` — 通知偏好**（`profile/notifications/page.tsx`）—— *demo（GET 往返）。*
标题、可选"已保存"banner。两个 `Switch` 行的 fieldset：**渠道** —— 邮件（开）、短信（开）、推送（关）；**主题** —— 预订（开）、提醒（开）、支付（开）、营销（关）（各带提示）。**保存**。

**`/[locale]/profile/family` — 家庭成员**（`profile/family/page.tsx`）
标题 + 副标题；可选"邀请已发送" / "无效"banner。**成员**列表：一条"本人"行（当前用户头像、名字·"你"、邮箱、"管理员"芯片），然后每个成员（头像、名字、邮箱、角色芯片"付款人"/"查看者"、琥珀色"待定"芯片、红色垃圾桶移除）。**邀请表单**（虚线卡片）："邀请家庭成员"、**姓名**（必填）、**邮箱**（必填）、"可代我预约"复选框、**"发送邀请"**。*（真实邀请/接受流程待做。）*

### 安全

**`/[locale]/safety/report` — 报告安全事件**（`safety/report/page.tsx`）
可选 `?bookingId=` 关联到某预订。刚提交（`?sent=1`）→ 成功页（绿对勾、"报告已提交"、安抚文案、"返回首页"）。否则：标题带红色盾告警图标 + 副标题；一个**红色紧急 banner**（"如果这是紧急情况…" + "打开 SOS" → `/chat?emergency=1`）；可选"太短"错误。**表单：** 单选**严重程度**（低 / 中 / 高 —— 各带提示）；必填 `datetime-local` "何时"；必填**描述**文本框（≥30 字）；一个**禁用**的证据文件上传（image/video/audio）；一个"已联系警方"复选框；**"提交"**。高严重程度会把报告分类映射为"harassment"。

### 设置

**`/[locale]/settings/account` — 账户设置**（`settings/account/page.tsx`）—— *demo（空操作重定向）。*
标题、可选"已保存"banner。下拉：**语言**（5 个 locale）、**地区**（AU/US/CA）、**时区**（Australia/Sydney、America/New_York、America/Toronto、UTC）、**币种**（AUD/USD/CAD）、**保存**。

**`/[locale]/settings/privacy` — 隐私与数据**（`settings/privacy/page.tsx`）
标题 + 副标题；"已保存" / "需确认"banner。**隐私开关**（复选卡片）：分析（开）、营销（关）、与家人共享（开）—— 各带可选提示 + **保存**（装饰性 —— 尚未持久化）。**下载你的数据：** 标题、提示、一个**"下载"**提交生成 JSON 导出；生成后（`?export=`）显示绿色 **"下载 JSON 归档"** 链接。**删除账号**（红色/危险）：标题、提示、一个文本框要求输入字面 **"DELETE"**，然后红色 **"删除账号"** 提交 —— *真的删除用户行（外键级联）、登出、→ `/home?deleted=1`。*

---

## 五、服务者端 —— 页面

> 外壳：`Header` + 移动端 `ProviderBottomTabBar`（Workbench / Jobs / Calendar / Earnings / Profile；注册和 onboarding 期间隐藏）。每个页面的角色门禁：未登录 → `/auth/login`；已登录但 `role ≠ provider` → `/home`；是 provider 但无档案行 → `/provider/register`。

### ⚠️ 合规门禁 —— 设计师必须体现的规则

一个服务者只有在**以下四项全部满足**时才是 **`approved`（上线）**（由 `lib/compliance/country.ts` 按国家驱动）：
1. **ABN** 有效且 ABR 显示 active —— **仅 AU**（US/CA 隐藏 ABN 字段）；
2. **背景调查** 状态 = `cleared`（第三方 vendor；测试期用 mock 适配器）；
3. **所有必需文档** 经 admin 审核通过且未过期 —— AU：警方记录 + 急救证 + 保险；US：警方记录 + 急救证（保险可选）；CA：警方记录 + 急救证 + 保险；
4. **Stripe Connect** 账号已创建且**已启用收款**（`details_submitted && charges_enabled && payouts_enabled`）。

只有 **active** 的服务者才能看到新的 `pending` 派单或**接受**它们。尚未 active 的服务者会在 workbench/jobs 处看到琥珀色 **"账户审核中"** banner 及指向 `/provider/onboarding-status` 的链接。（如果一个曾批准的服务者合规失效，会被降级到 `docs_review` 并从顾客侧搜索/服务列表/预订第 2 步下架，但仍能 **start / complete / decline** 已有的 `confirmed`/`in_progress` 派单，以免顾客被卡住。）批准/到期/文档审核都会触发本地化通知 + 邮件。

### 页面

**`/[locale]/provider` — 服务者工作台（首页）**（`provider/page.tsx`）
`h1` "Hi, {name}" + 今天日期。可选琥珀色 **"账户审核中"** banner → `/provider/onboarding-status`。**收益摘要卡片**（→ `/provider/earnings`）：绿色 $ 徽章、"本周"、加粗大号合计（held + paid）、副行"Held {金额}"（琥珀）· "Paid {金额}"（绿）、箭头。**今日派单**段（"查看全部" → `/provider/jobs`）：空 → 虚线"今天无派单"；否则最多 10 张卡片 → `/provider/jobs/{id}`（顾客头像、开始时间 + 顾客名、服务品类、价格 · 本地化状态、箭头）。尚未 active 的服务者**看不到**新 `pending` 派单。

**`/[locale]/provider/jobs` — 派单列表**（`provider/jobs/page.tsx`）
`h1` "Jobs"；可选琥珀 banner。**pill tab**（`?tab=`）：**今天**（活跃状态，今天）/ **本周**（活跃，未来 7 天）/ **历史**（completed/cancelled/released/disputed，最新优先）。空 → `EmptyState`（`ListChecks`）带 tab 专属标题 + 提示。列表（≤50）→ `/provider/jobs/{id}`：顾客头像、大写日期 · 时间、加粗顾客名、服务品类、`MapPin` + 截断地址、价格 · 状态。尚未 active 的服务者列表不含 `pending`。

**`/[locale]/provider/jobs/[id]` — 派单详情**（`provider/jobs/[id]/page.tsx`）
非本人拥有则 `notFound()`；尚未 active 的服务者看 `pending` 派单 → 重定向到 onboarding-status。顶部：大写日期 · 时间；`h1` = 服务品类。状态 banner：`completed` → 绿色"已完成"；`cancelled` → 琥珀色"取消政策"警告（且吸底操作条被抑制）。**顾客卡片：** 头像、名字、电话（tabular）；有电话则圆形绿色拨号按钮（`tel:`）。**地址卡片：** MapPin 徽章、完整地址；**"导航"** → 新标签页打开 Google Maps（无地址则隐藏）。**备注卡片**（顾客的预订备注）。**价格明细：** 基础、税、分隔线、**合计**（加粗）。**报告问题** 按钮（红色描边，全宽）→ `/safety/report?bookingId=…`。**吸底操作条**（未 completed/cancelled 时）：`pending` → **拒绝**（打开 `DeclineJobModal`：标题、提示、4 选项单选原因列表、取消/提交）+ 主按钮 **接受派单**（需 active）；`confirmed` → 主按钮 **"我已出发"**（→ in_progress）；`in_progress` → 主按钮 **"标记完成"**（→ completed）。非法状态转换 → `?error=invalid_transition`。

**`/[locale]/provider/availability` — 每周可用时间**（`provider/availability/page.tsx`）
`h1` "Availability" + 提示。`?saved=1` 后绿色"已保存"banner。**快捷模板卡片：** "应用模板" + 两个 pill —— "周一/三/五上午"、"工作日下午"（点击通过 `?tpl=` 预览，附"已预览模板 —— 点保存以应用"）。**主表单：** 7 行（周一→周日），每行 = 星期标签 + 3 个切换按钮（上午 / 下午 / 晚上），样式为 48px 按钮；选中 = 品牌边框 + brand-soft 底色；由 DB 行 / 模板预览预选。全宽主按钮 **保存** → 替换所有 `providerAvailability` 行。

**`/[locale]/provider/blocked-times` — 休息时间**（`provider/blocked-times/page.tsx`）*（不在 tab 栏）*
`h1` "Time off" + 副标题。`?added=1` 后绿色"已添加"banner；end ≤ start 时错误 banner。空 → `EmptyState`（`CalendarOff`）+ 大品牌 **"添加休息时间"**（`?add=1`）。列表：卡片"{开始日} → {结束日}" + 原因标签（休假 / 培训 / 其他）+ 红色垃圾桶删除（每行）。非空时一个虚线"+ 添加休息时间"按钮。**添加表单**（`?add=1`，品牌边框卡片）：**从**（日期）、**到**（日期）、**原因**（下拉：休假 / 培训 / 其他）、主按钮 **保存**。

**`/[locale]/provider/calendar` — 月历**（`provider/calendar/page.tsx`）*（以只读为主）*
`h1` "Calendar"。月份切换：上/下箭头（`?ym=YYYY-MM`）夹着"Month YYYY"。网格：周一起的星期表头、6×7 日格 —— **已预订** = brand-soft 底色 + 品牌色文字 + 小品牌点；**可用** = 普通边框；**已封锁** = surface-2、灰、删除线；**淡化** = 非本月（变灰，`aria-disabled`）；每个本月格链接到 `/provider/availability`。图例：已预订（品牌）· 可用（绿）· 已封锁（灰）。

**`/[locale]/provider/earnings` — 收益**（`provider/earnings/page.tsx`）
`h1` "Earnings"。**区间 pill**（`?range=`）：本周 / 本月 / 全部。**四张统计卡**（2×2）：**Gross** / **Net**（强调 —— 品牌边框/底色）/ **Held** / **Paid**（Net = Gross − 18% 平台费；Held/Paid 来自 `wallets`）。**平台费卡片：** "Platform fee" + 金额 + "(18%)"。*（注：本页硬编码 18%，而后台 Payments 页用 `PLATFORM_FEE_PERCENT`，默认 20% —— 这是代码里既有的不一致；设计文案不要写死某个数字。）* **7 天趋势卡片：** "本周"、一个 7 柱迷你柱状图（柱高 ∝ 当日营收，按峰值缩放，最高 96px；零值日 = surface-2 残柱）、每柱下方日号标签、每柱 `aria-label` "Mon 5 $X"。**交易列表：** 区间内的预订（服务品类、"日期 · 顾客 · STATUS"、价格在右）；空 → "暂无收款"。**导出 CSV** 按钮 —— *禁用*，tooltip"CSV 导出在打通收款后上线"。

**`/[locale]/provider/payouts` — 收款**（`provider/payouts/page.tsx`）—— *mock 数据；保存是空操作重定向。*
`h1` "Payouts"。`?saved=1` 后"已保存"banner。**Stripe 账号卡片：** 绿色对勾徽章、"收款账号"、绿色"Active"、次按钮 **"重新验证"**（惰性）。**频率表单：** fieldset "收款频率" —— 单选 **每日 / 每周 / 手动**（选中 = 品牌边框）、主按钮 **保存**（`?freq=&saved=1`）。**历史：** "收款历史" —— 3 笔 mock 收款（绿色箭头徽章、加粗金额、"日期 · stripeTransferId"）。

**`/[locale]/provider/profile` — 服务者公开档案编辑**（`provider/profile/page.tsx`）—— *保存是 stub（`?saved=1`，无 DB 写入）。*
`h1` "Profile"。"已保存"banner。**身份卡片：** 大号首字母头像、服务者名字、**"预览"** → `/provider`（以顾客视角看）。**表单：** **简介**（文本框，4 行，带提示）；**语言** fieldset —— en、zh-CN、zh-TW、ja、ko、es、ar、vi 的 pill 切换复选框（当前 locale 预选）；**性别** 下拉 —— 私密（默认）/ 女 / 男；主按钮 **保存**。

**`/[locale]/provider/services` — 服务与价格**（`provider/services/page.tsx`）—— *mock 数据；保存是 stub。*
`h1` "Services"。"已保存"banner。**表单：** 每个提供的服务一张卡片（mock：保洁 @55/2h、个人护理 @70/1h）—— 品类名 + 红色垃圾桶"移除"；两个输入框 **费率（{币种符号}）**（数字）和 **最少小时**（数字 1–8）；辅助行"建议 {min}–{max} {符号}"（US 价格自动缩放 ×0.65）。然后一个虚线 **"+ 添加服务"** 按钮，再是主按钮 **保存**。

**`/[locale]/provider/register` — 服务者入驻向导（5 步）**（`provider/register/page.tsx`）
把已登录顾客转为服务者。进入时仅需登录（用户此时可能仍是 `role = customer`）；状态在各步之间持久化到 `providerProfiles` 草稿。**隐藏 tab 栏。** 外框：`h1` "成为服务者"；副行"第 {n} 步 · {步骤标题}"；一个 **5 段进度条**（已完成 = 绿，当前 = 品牌，未来 = 灰）；`?error=` 码的错误 alert banner（必填字段、未选品类、ABN 无效/未激活/查询失败、缺少同意）；页脚 **返回** 链接（第 1 步则 → `/home`）+ 主按钮 **下一步** / **提交**。
- **第 1 步 — 基本资料：** 全名、**ABN**（仅 AU —— 对照 ABR 校验；有效后只读显示解析出的企业名）、电话、地址、简介（文本框 + 提示）。name/phone/address 必填；ABN 必须 active。
- **第 2 步 — 文档：** 必需文档信息列表 —— 警方记录、急救证、保险（US 可选）—— 各带 Upload 徽章 + 视觉上的"上传"文件输入。*（此向导步骤不持久化所选文件，该步只是前进。真正的文档上传/重新上传稍后在 `/provider/compliance` 完成。）*
- **第 3 步 — 服务区域与品类：** 一张卡片带 `MapPin` "服务区域" + 提示 + 占位地图框 + **半径**（数字，1–50 km，默认 15/10）；fieldset "服务品类" —— pill 复选框（保洁、做饭、园艺、个人护理、维修）；≥1 必选。
- **第 4 步 — 可用时间：** 提示 + 7 行星期 × 3 个时段切换（上午/下午/晚上），与可用时间页同一套。
- **第 5 步 — 收款与同意：** Stripe Connect 卡片带提示；已连接则"Stripe onboarding 已开始"绿色芯片；全宽 Stripe 紫（`#635BFF`）**"用 Stripe 连接"** / **"继续 Stripe onboarding"**（→ Stripe Connect onboarding 链接）。下方一条分隔线：一个**背景调查同意**块 —— 加粗标题 + 必勾复选框 + 同意文案。提交（需勾同意）会把 onboarding 状态设为 `docs_review`、记录 `submittedAt` + 同意元数据/IP、把用户升级为 `role = provider`、重新签发 session、触发背景调查、→ `/provider/onboarding-status`。

**`/[locale]/provider/onboarding-status` — 申请状态**（`provider/onboarding-status/page.tsx`）
服务者所处审批位置的纵向步进追踪。**隐藏 tab 栏。** `h1` "申请状态" + 副标题。**时间线（`<ol>`）：** 每步 = 一个圆形状态图标（带连接线）+ 标签 + 状态文字 + 可选时间戳 + 可选行内 CTA。状态：**done**（绿对勾）/ **inProgress**（品牌转圈，`animate-spin`）/ **waiting**（灰时钟）/ **action**（琥珀告警图标）。
- **申请已提交** —— done（带提交时间戳）或 in-progress。
- **ABN 已验证**（仅 AU）—— done，或 "action" 带 CTA → `/provider/register?step=1` 去修 ABN。
- **文档已审核** —— 所有必需文档已批准且未过期则 done；任一被拒则 "action"（CTA → `/provider/compliance`）；已上传但待审则 in-progress。
- **背景调查** —— 无则 waiting；cleared 则 done；failed/expired 则 "action" 带 **重试** 按钮（`RotateCcw`）；否则 in-progress。显示 cleared/requested 时间戳。
- **Stripe 收款** —— 服务者完全批准后显示为 done；若已有 Stripe 账号但批准仍 pending 则显示 in-progress；否则 CTA → `/provider/register?step=5`（"继续" / "连接 Stripe"）。
- **上线** —— approved 则 done，否则 waiting。

**`/[locale]/provider/compliance` — 合规文档**（`provider/compliance/page.tsx`）
上传 / 重新上传背景调查、急救证、保险、身份、WWC 等文档（具体集合按国家驱动）。`h1` "Compliance" + 副标题。**banner：** 任一必需文档缺失/即将到期/已过期则琥珀色"文档即将到期/缺失"；`?uploaded=` 后绿色"文档已上传 —— 待 admin 审核"；红色错误 banner（"文件过大（最大 10 MB）"、"仅接受 JPG/PNG/WebP/HEIC/PDF"、"请选择文件"、"上传失败"）。**文档列表：** 每个适用文档类型一张卡片 —— 状态徽章（`FileText`；绿 = 有效 / 琥珀 = 即将到期（<30 天）/ 红 = 已过期 / 灰 = 缺失）、标题（非必需则带"(可选)"标签）、"于 {日期} 到期"、"# {文档编号}"、一个大写状态 pill、待审则"等待 admin 审核"提示、一个 **查看** 链接 → `/api/compliance/documents/{id}`（私有存储下载）。下方一条分隔线，一个行内**重新上传表单：** **文档编号** 文本框、**到期** 日期框、"选择文件"（接受 jpeg/png/webp/heic/pdf）、主按钮 **重新上传**。页脚说明关于本地存储 / 10 MB / 文件类型。*（如果一个已批准的服务者重新上传必需文档，onboarding 状态会回退到 `docs_review`、写一条审计行、通知 admin。）*

**`/[locale]/provider/reviews` — 评价与评分**（`provider/reviews/page.tsx`）
`h1` "Reviews"。**统计行（3 张卡）：** 平均评分（大号，品牌星图标）/ 评价数 / "{pct}% 好评"（≥4★ 占比）。**维度细分卡片：** 5 行（守时、专业、干净、态度、价格）—— 标签 + 横向进度条（当前全部 = 总平均分）+ 数字平均分 + 一条脚注（"维度细分将在带品类标签的评价上线后提供"）。**星级筛选 pill**（`?stars=`）：全部、5★、4★、3★、2★、1★。空 → "—" 占位卡片。**评价列表（≤100）：** 卡片 —— 顾客首字母头像、名字 + 日期、5 星行（按评分填充）、评论文本。每条评价要么显示服务者已有的**回复**（surface-2 框中"你已回复"），要么显示一个 **回复** 按钮打开 `ReplyReviewModal`（标题、文本框、取消/提交；回复 ≥5 字；upsert `reviewReplies`）。

---

## 六、后台管理控制台 —— 页面

> 外壳：`AdminShell`（吸顶顶栏 + 左侧栏 / 移动端抽屉）。每个页面调 `getAdmin()`；未登录 → `/admin/login`。侧栏分组 —— **主组：** Overview、Disputes、Safety、Providers、Refunds、Analytics。**次组：** Reports、Customers、Bookings、Payments、AI、Settings。*（KB 和 Settings 的部分入口可直接访问，但有一两个链接没在侧栏露出。）*
>
> 两套详情模式并存，理应统一：**(a)** 列表页上的右侧**滑入抽屉**（最大宽 480px，通过 `?id=` 打开）；**(b)** 独立的 **`/.../[id]` 页面**（更丰富 —— disputes、safety、providers、customers *两者都有*）。两种筛选风格也并存：**pill tab**（`role=tablist`，在 Bookings 和 Analytics 上）vs. `<select>` + "Apply" GET 表单（Disputes、Safety、Providers）。表格：`bg-surface-2` 上的大写 `text-tertiary` 表头、`border` 行分隔、当前/抽屉打开的行高亮 `bg-brand-soft`。"已处理/已保存 ✓" 绿色 banner + 红色错误 banner 由 query 参数驱动。

**`/[locale]/admin` — 概览**（`admin/page.tsx`）
`h1` "Overview"。**告警**（条件）：未处理安全事件 > 0 → 危险 banner；未处理纠纷 ≥ 5 → 警告 banner（各带 `AlertTriangle`）。**KPI 网格（6 张卡）**，图标块 + 标签 + 大号数字：今日新订单（`ShoppingBag`）· 未处理纠纷（`Scale`，> 0 则警告边框）· 待审服务者（`Users`）· 未处理安全事件（`ShieldAlert`，> 0 则警告边框）· 近 7 天 GMV（`TrendingUp`，币种）· 近 7 天 AI 解决率 %（`Bot`）。**快捷链接：** 3 张大箭头卡 → 审核纠纷 / 审核安全 / 审核服务者。仅导航。

**`/[locale]/admin/analytics` — 数据分析**（`admin/analytics/page.tsx`）
`h1` analytics 标题。**区间 tab**（`role=tablist`，`?range=`）：日 / 周 / 月 / 季 / 年。一小行"{N} 单 · {M} 顾客 在区间内"。**订单图表卡片：** "近 7 天，按国家" —— 7 天堆叠柱状图，按国家着色（AU = 品牌、US = success/绿、CA = warning/琥珀；零值 = 20% 不透明度）；下方星期标签；图例带彩色点 + 国家名。**KPI 网格（5 张卡，移动 2 列 / 桌面 5 列）：** 复购率 % · 平均评分（或"—"）· 纠纷率 %（1 位小数）· AI 解决率 % · 支付成功率 %（1 位小数）。只读。

**`/[locale]/admin/disputes` — 纠纷列表**（`admin/disputes/page.tsx`）
`h1` "Disputes"。`?applied={id}` 时成功 banner；`?error=invalidAmount` 时错误 banner。**筛选条（GET 表单）：** 状态下拉 —— all / open / evidence_needed / decided / closed —— + "Apply"。"{N} 个案件"行。**表格：** ID `D-xxxxxxxx`（链接）· 顾客 · 服务者（lg+）· 金额（币种）· 状态徽章（open = 危险，evidence_needed = 警告，decided = 成功，closed = 中性）· SLA（创建日期 + 时钟图标）。≤100 行，最新优先。空 → 卡片内"emptyDisputes"。**详情抽屉（`?id=`）：** 头部 `D-xxxxxxxx` + 关闭；定义列表（顾客 / 服务者 / 金额 / 状态）；"纠纷时间线" —— 框中的原因文本；"对话" —— 纠纷消息带作者 + 时间戳。**裁决表单**（仅状态 ∉ {decided, closed} 时）：4 个动作单选 —— **全额退款** / **部分退款** / **驳回主张** / **升级（要求更多证据）**；一个部分退款金额数字输入框（0…预订合计）；可选裁决**备注**文本框；**"应用裁决"** 提交。已裁决 → 绿色"已裁决。"提示。*（裁决时：更新纠纷、追加 `[Decision: …]` 消息、把预订从 `disputed` 翻出来 —— 退款则 `cancelled`，驳回则 `completed` —— 带审计行、通知双方。）*

**`/[locale]/admin/disputes/[id]` — 纠纷详情**（`admin/disputes/[id]/page.tsx`）*（比抽屉更丰富；未找到则 404）*
返回 → "Disputes"。`h1` `D-xxxxxxxx` + 状态徽章。`?applied=1` 成功 banner；`?error=invalidAmount` 错误 banner。**4 张卡网格：** 顾客（名字+邮箱）· 服务者（名字+邮箱）· 预订（`B-xxxxxxxx` 链接 → `/admin/bookings?id=…`，预订状态）· 金额（预订合计 + 设了退款则退款额）。**"纠纷时间线"卡片：** 原因文本。**"对话"卡片**（条件）：纠纷消息，admin 专属的着警告色，带时间戳。**"证据"卡片**（条件）：上传的证据行 —— 类型、时间戳、外部文件 URL、备注。**裁决表单**（同样 4 单选 + 部分金额 + 备注）未裁决/未关闭时；此整页操作还会给双方发邮件（`buildDisputeUpdateEmail`）。已裁决/已关闭 → 绿色摘要卡片（"已裁决 · {裁决}" + 裁决时间 + 备注）。

**`/[locale]/admin/safety` — 安全 / 事件报告列表**（`admin/safety/page.tsx`）
`h1` "Safety"。`?applied={id}` 时成功 banner。**筛选条（GET 表单）：** 状态下拉 —— all / open / reviewed —— + "Apply"。"{N} 份报告"行。**表格：** ID `I-xxxxxxxx`（链接）· 分类徽章（`ShieldAlert`；harassment/accident = 危险，theft/damage = 警告，其他 = 中性）· 报告人（名字）· 状态（reviewed = 成功 / open = 警告）· 提交时间（datetime，md+）。≤100 行。空 → "emptySafety"。**详情抽屉（`?id=`）：** 头部 `I-xxxxxxxx` + 关闭；定义列表（报告人 / 分类 / 预订 id / 提交时间 / 已审核[已审核则 + 时间戳 + 审核人]）；框中的事件正文。**裁决表单**（仅未审核时）：单选 —— **警告** / **暂停** / **封禁** / **上报警方** / **不处理关闭**；可选**备注**文本框；**"Apply"** 提交。已审核 → 绿色框带记录的动作。*（裁决时：记录 `reviewedAt/reviewedBy/action`、通知报告人。）*

**`/[locale]/admin/safety/[id]` — 事件报告详情**（`admin/safety/[id]/page.tsx`）*（未找到则 404）*
返回 → "Safety"。`h1` `I-xxxxxxxx` + 分类徽章。`?applied=1` 成功 banner。**4 张卡网格：** 报告人（名字+邮箱）· 预订（`B-xxxxxxxx` 链接或"—"）· 提交时间（datetime）· 状态（已审核 · 审核人 / 待处理）。**"纠纷时间线"卡片：** 事件正文。**"照片"卡片**（条件）：用户上传的证据图片网格（方形缩略图）。**裁决表单**（同样 5 单选 + 备注）未审核时；否则绿色摘要卡片（动作 + 审核时间 + 审核人）。

**`/[locale]/admin/providers` — 服务者列表**（`admin/providers/page.tsx`）
`h1` "Providers"。`?applied={id}` 时成功 banner。**筛选条（GET 表单）：** 状态下拉 —— all / pending / docs_review / approved / rejected / suspended —— + "Apply"。"{N} 位服务者"行。**表格：** 服务者（头像 + 显示名链接 + 短 id）· 国家（md+）· 申请时间（日期）· 状态徽章（pending = 中性，docs_review = 警告，approved = 成功，rejected/suspended = 危险）。≤100 行。空 → "No providers"。**审批抽屉（`?id=`）：** 头部带服务者名字 + 关闭；定义列表（邮箱 / 国家 / 申请时间 / 状态 / 地址 / 品类）；简介块（如有）；**"文档检查"** —— 上传文档列表带类型 + 状态徽章，或"尚未上传文档"。**裁决表单**（仅未裁决时）：单选 —— **批准** / **退回** / **暂缓** / **拒绝**；可选**备注**文本框；**"Apply"**。已裁决 → "已记录裁决"。*（此抽屉的"批准"是直接打补丁；整页详情的"批准"会跑带门禁的自动批准 —— 见下。）*

**`/[locale]/admin/providers/[id]` — 服务者详情（合规工作台）**（`admin/providers/[id]/page.tsx`）*（未找到则 404）*
返回 → "Providers"。`?applied=1` 成功 banner；带上下文特定消息的错误 banner（`noteRequired`、`missingDoc`、`conditionsNotMet` —— "还不能批准 —— 背景调查、必需文档、ABN（AU）和 Stripe 收款必须全部就绪。用 Force approve 强制覆盖。"、`replayNoRow`、`replayFailed`、通用）。**头部卡片：** 头像（72px）+ 显示名 + 状态徽章；邮箱；国家 · 申请日期；品类；简介；适用时的拒绝/暂停原因 banner。**4 统计网格：** 预订（数 + "N 已完成"）· 终身营收（$ + "30d: $X"）· 评分（平均 + "N 条评价"）· 纠纷（数）。**"钱包"卡片：** Held vs Available 余额（币种）或"暂无钱包"。**"合规文档"卡片：** 每个文档行 —— 类型（大写）、文档编号、状态徽章、"open" 链接 → `/api/compliance/documents/{id}`、审核人备注 —— 各带一个行内**审核表单：** 一个"原因（拒绝时必填）"文本框 + **批准** / **拒绝** 按钮（写一条 `adminActions` 审计行；批准则重跑自动批准）。**"合规与验证"卡片：** 定义列表 —— 对 AU/持 ABN 者：**ABN**（+ active/inactive 徽章）和 **注册企业**；**背景调查**（状态、vendor、external ref、cleared/expires 日期、last error），failed/expired 时带 **"重新发起背景调查"** 按钮；**背景调查同意**（时间戳 · 版本 · IP，或"未给出"）。**"需关注的 webhook 事件"** 子段（条件）：孤立/失败合规 webhook 事件的死信列表（状态、vendor、external ref、收到日期、错误）各带 **"重放"** 按钮。**"近期预订"卡片：** ≤8 —— `B-xxxxxxxx`、排期日期 · 状态、价格。**"近期评价"卡片：** ≤5 —— 星级、日期、评论。**裁决表单（底部）：** "动作"单选（选项按状态条件出现）—— **批准**（重跑带门禁的自动批准 —— 不会橡皮图章）/ **Force approve（覆盖 —— 必填备注）** / **退回** / **暂缓** / **拒绝** / **暂停**（仅 approved 时）/ **恢复**（仅 suspended 时）；一个**备注**文本框；**"Apply"**。*（"批准"只有满足全部国家门禁才会推进，否则 `conditionsNotMet`；"Force approve" 必填备注 + 写一条 `provider.force_approve` 审计行带 `bypassedChecks: true`；force-approve 和 reject 也会给服务者发邮件。）*

**`/[locale]/admin/refunds` — 退款**（`admin/refunds/page.tsx`）
`h1` "Refunds"。`?applied={id}` 时成功 banner。**表格：** ID · 预订（短 id）· 顾客（名字）· 金额（+ 币种）· 原因（"纠纷裁决" / "自助"）· 状态徽章（queued = 警告，processing = 品牌，done = 成功，failed = 危险）· 操作单元格。≤200 行，最新优先。**queued** 行显示一个 **"处理"** 按钮（`RotateCcw`）把退款翻为 `processing`；其他行显示"—"。*（真实 Stripe 退款执行不在范围内。）* 空 → "refundEmpty"。

**`/[locale]/admin/payments` — 财务**（`admin/payments/page.tsx`）*（只读仪表盘）*
`h1` "Payments"。头部有两个**禁用**按钮："Export CSV" 和 "Export PDF"（`Download`）。**4 张卡 KPI 网格：** 流入（$ —— captured 支付之和）· 流出（$ —— paid 收款之和）· 平台费（$ —— inflow 的 `PLATFORM_FEE_PERCENT`%，默认 20%）· Chargebacks（退款记录数）。**"平台费"卡片：** 费率、"通过 `PLATFORM_FEE_PERCENT` 设置"、N 笔退款的总退款额。**"可疑活动"卡片：** "无"占位。

**`/[locale]/admin/reports` — Reports（评价审核）**（`admin/reports/page.tsx`）
*（这是侧栏里的 "Reports" = 用户举报的**评价**待审核，不是数据分析。）* `h1` "Reports" + 副标题。`?applied={id}` 时成功 banner。报告卡片列表（仅未解决，最新优先）：`Flag` 图标块；报告 id · 评价 id；"被举报评价 · {顾客名} · {评分}★"；被举报评论作为引用块（如有）；举报人名字；原因（Spam / Abusive / False / Off-topic / Other）；详情文本（如有）。**操作表单（3 按钮）：** **保留**（重新发布该评价）/ **删除**（评价状态 → `removed`）/ **警告用户**（主按钮 —— 保留评价，线下警告）。空 → "empty" 卡片。

**`/[locale]/admin/customers` — 顾客列表**（`admin/customers/page.tsx`）
`h1` "Customers"。行数行。**表格：** 顾客（头像 + 名字链接 + 邮箱）· 国家（md+）· 预订（数）· 消费（completed/released 上的终身额）。≤100，最新优先。空 → "No customers yet"。**详情抽屉（`?id=`）：** 头部带显示名 + 关闭；定义列表（邮箱 / 国家 / 注册日期 / 预订 / 消费）；一个 **"查看完整"** 链接 → `/admin/customers/{id}`；一条信息提示称重置密码 / 合并 / GDPR 删除等操作在后续批次上线。

**`/[locale]/admin/customers/[id]` — 顾客详情**（`admin/customers/[id]/page.tsx`）*（非顾客则 404）*
返回 → "Customers"。**头部卡片：** 头像（72px）+ 显示名 + 邮箱 + "注册于" 日期 · 国家。**4 统计网格：** 预订 · 消费（$）· 纠纷 · 家庭成员。**"预订"卡片：** ≤10 近期 —— 服务品类、排期日期 · 状态、价格；无则"—"。**"已给出的评价"卡片：** ≤5 已发布 —— 星级、日期、评论；无则"—"。**2 卡迷你网格：** 地址数 · 紧急联系人数。**信息提示：** 暂停/恢复/封禁 + 支付/设备/登录历史 后续上线。**3 个禁用按钮：** "Suspend" / "Resume" / "Ban"。

**`/[locale]/admin/bookings` — 预订**（`admin/bookings/page.tsx`）
`h1` "Bookings" + 副标题。**筛选 tab（`role=tablist`，`?filter=`）：** 全部 / 卡住 > 24h / 托管中 / 已放款 / 已取消。"{N} 行"行。预订行列表（flex 卡片，非表格）：卡住的预订带 `AlertTriangle` 警告块；`#xxxxxxxx` id；"顾客名 → 服务者名"；价格（币种 + 金额）；状态徽章（pending = 警告，confirmed/in_progress = 品牌，completed/released = 成功，cancelled = 中性，disputed = 危险）；"N 分钟前"（sm+）。≤100，最新优先。仅查看/监控 —— 其他后台页通过 `?id=…` 深链到这里，但还没有单条预订抽屉。无显式空状态消息。

**`/[locale]/admin/ai/conversations` — AI 对话**（`admin/ai/conversations/page.tsx`）
`h1` "AI conversations" + 副标题。**表格：** ID（短 id，链接）· 顾客（名字 / 邮箱前缀 / "(anonymous)"）· Locale（大写）· Msgs（数）· 状态 —— 徽章 **EMERGENCY**（危险，`ShieldAlert`）如触发了紧急，**RESOLVED**（成功，`Check`）如已关闭。≤100，最新优先。空 → "—"。**转录抽屉（`?id=`）：** 头部 `xxxxxxxx` + 关闭；"{用户标签} · {LOCALE}"；聊天气泡转录 —— 用户右对齐品牌色，助手左对齐中性，保留空白。只读审计。

**`/[locale]/admin/ai/kb` — AI 知识库**（`admin/ai/kb/page.tsx`）*（不在侧栏）*
`h1` "Knowledge base" + 一个 **"Add"** 按钮（`Plus`，`?add=1`）。成功 banner："saved"（`?saved=1`）、"deleted"（`?deleted=1`）。条目卡片列表（按品类再按排序分组）：问题（加粗）；徽章 —— 品类（Pricing / Policy / How-to / Safety）、locale（大写）、"OFF"（警告）如禁用；答案文本；一个 **删除** 按钮（`Trash2`，危险描边图标）。空 → "—" 卡片。**添加表单**（`?add=1`，品牌卡片）：**Category** 下拉（policy/pricing/how-to/safety）、**Language** 下拉（EN / ZH-CN / ZH-TW / JA / KO）、**Question** 输入框、**Answer** 文本框（5 行，带"变量"提示）、**"Save"**。*（保存/删除还要求 `role = admin`。）*

**`/[locale]/admin/settings` — 设置**（`admin/settings/page.tsx`）
`h1` "Settings"。`?saved=1` 时成功 banner。**一个表单**带各段（卡片）：**1. 费率** —— 只读：显示 `PLATFORM_FEE_PERCENT`% + 一条它是环境变量的说明。**2. 取消窗口** —— 可编辑数字输入框（小时，0–168，默认 24）—— *唯一持久化的设置*（`adminSettings`，key `cancellation.window_hours`；写一条 `auditLog` 行）。**3. 紧急关键词** —— 一个**只读**文本框，预填启用的 `ai_emergency_keywords`（逗号连接）+ 数量；提示称目前由 DB 管理。**4. 管理员** —— admin 用户列表（邮箱 + 名字徽章），≤20；无则"—"。**5. 审计日志** —— 最近 5 条（动作 · 时间戳）；无则"—"。**提交：** "Save" 主按钮（仅取消窗口持久化）。*（保存要求 `role = admin`。）*

---

## 七、公共 / 营销 / 工具页

**`/[locale]` — locale 根**（`[locale]/page.tsx`）—— 无 UI；服务端重定向到 `/[locale]/home`。

**`/[locale]/donate` — 捐款活动落地页**（`(public)/donate/page.tsx`）—— `force-dynamic`；无活跃活动则 `notFound()`；自带 SEO meta。
`Header` + 一个长营销页：
- **Hero**（径向渐变背景）：一个带绿点的 pill 徽章、加粗 36–44px 大标题带品牌高亮 span、18px 副标题、两个 CTA —— 主 **"立即捐款 →"**（锚点 `#donate`）+ 描边 **"看看钱用在哪"**（锚点 `#allocation`）—— 以及一行用 `·` 分隔的三条信任陈述。**`ProgressCard`**（桌面右列）："已筹" 加粗大号品牌金额 vs "目标"（右对齐）、一个 `ProgressBar`、"{X}% 完成" + "还剩 {N} 天"（默认 23）、一个 3 列统计网格：捐款人数 · 平均金额 · 社区数（默认 12）。实时数字来自 `getCampaignProgress`。
- **`ImpactStats`**：眉标 + h2，然后一个 2×2（移动）/ 4 列（桌面）网格的瓦片 —— 彩色 emoji 芯片（👵 / 🏠 / 📍 / 🤝）、大号 28px 数字（"8,640+"、"52,300"、"12"、"1,150"）、标签（服务长者 / 探访 / 城市 / 志愿者）。*硬编码 demo 值。*
- **`Stories`**：h3 + 3 列卡片网格 —— 彩色圆形头像带中文姓氏首字（陈/王/林）、名字 + 元信息、斜体证言引用、两个彩色标签芯片。*硬编码 demo 内容。*
- **`AllocationDonut`**（`#allocation`，带上下边框的 surfaced 背景）：左 = 眉标 + h2 + 三个图标块（💙 项目交付 / ⏳ … / 🌱 …）带标题 + 正文；右 = 一张白卡带 SVG 环形图（Stripe 风格分段、"95%" + 中心标签）、一个图例（每段彩色点 + 标签 + 加粗 %）、一条脚注。分配项来自 i18n。
- **捐款表单段**（`#donate`，max-w-3xl）：居中标题块（眉标 + h2 + 副标题），然后 **`DonateForm`**（client）—— **一次性 / 每月** 分段切换；**预设金额** 按钮 $25 / $50 / $100 / $250（移动 2 列 / 桌面 4 列，加粗大号，激活 = 品牌边框 + brand-soft 填充 + `aria-pressed`）；预设下方一行动态**提示**（如"$50 可以…"；> $50,000 时变红 + "超限"）；**自定义金额** 输入框（带标签、前导 `$` 装饰、`type=number`、min 1）；**捐款人字段** —— 姓名（必填）、邮箱（必填，带提示）、电话（可选，`type=tel`）—— 桌面端姓名/邮箱并排；一个**留言**文本框（3 行，可选）；一个 **"匿名捐款"** 复选框；**提交**（品牌、全宽、动态文案"捐款 $X" / "捐款 $X / 月" / "处理中…"，无效时禁用，提交时 `aria-busy` → POST 到 `/api/donate/checkout`，然后 `window.location.assign` 到 Stripe Checkout URL）。**状态：** "选择金额"校验提示；API 失败时红色 `role="alert"` 错误行带 ⚠；提交时禁用+变暗按钮。**支付页脚：** "由…处理支付"说明、一行支付商芯片（Stripe / PayPal / WeChat Pay / Alipay，变暗）、一条小注。

**`/[locale]/donate/success` — 捐款致谢**（`(public)/donate/success/page.tsx`）—— `force-dynamic`；`noindex, nofollow`。
`Header` + 居中 main（min 60vh）：一个 💙 emoji（5xl）、加粗 "Thank you" h1、一段按模式（`bodyOnce` vs `bodyMonthly`）选的正文，其中替换格式化金额（`$NN.NN`，来自 `findDonationBySessionId`，退化为"—"）和捐款人邮箱。单个品牌 CTA → `/`（首页）。

**`/[locale]/donate/cancel` — 捐款已取消**（`(public)/donate/cancel/page.tsx`）—— `noindex, nofollow`。
`Header` + 居中 main（min 60vh）：加粗 h1、一段次要色正文、单个品牌 CTA → `/donate`（重试）。静态。

**`/[locale]/help` — 帮助中心**（`(public)/help/page.tsx`）
`Header`（带国家 + 已登录首字母）+ main：h1 + 副标题；一个**搜索条**（`role="search"` GET 表单 → `/help?q=…`；一个大号 h-14 圆角输入框带占位 + aria-label，从 `?q` 预填；*后端搜索是未来的 —— 目前只是把 query 回传*）；**分类** h2 + 一个 2 列（移动）/ 3 列（sm+）网格的分类卡（约 100px 高，brand-soft 图标芯片 —— `Sparkles` / `Calendar` / `CreditCard` / `Shield` / `UserCircle` —— + 加粗标签 → `/help#{categoryId}`：入门 / 预订 / 支付 / 安全 / 账户）；**热门文章** h2 + 一个带边框的列表（行用细线分隔，每行约 72px：标题加粗 16px + 摘要 13px 次要色 + 尾随 `ChevronRight` → `/help/{slug}`；由静态 `HELP_ARTICLES` 数组驱动，每行带其 `category` 作为 `id` 锚点）；**联系卡片** —— 品牌边框、brand-soft、一个品牌圆形 `Phone` 图标、加粗标题 + 副标题、一个品牌 **CTA** → `/chat`。

**`/[locale]/help/[slug]` — 帮助文章**（`(public)/help/[slug]/page.tsx`）—— `generateStaticParams` 覆盖所有 `HELP_ARTICLES`；slug 未知则 `notFound()`。
`Header` 带 `back` + main：分类眉标（大写、品牌、tracked）；h1（按文章本地化）；"最后更新 {日期}"（次要色）；正文（一叠 17px leading-relaxed 段落 —— 还没有图片/列表）；一个 **"← 返回帮助"** 链接（品牌、48px）→ `/help`。

**`/[locale]/oops` — 通用错误落地页**（`[locale]/oops/page.tsx`）
`Header` + 居中 main：一个大号 warning-soft 圆圈带 `AlertTriangle`（56px）、h1、一段 ≤340px 宽次要色正文、两个按钮 —— 品牌 **"首页"** → `/home` + 描边 **"联系"** → `/help`。

**`/[locale]/error.tsx` — 路由错误边界**（client）—— 捕获 locale 子树的运行时错误，上报 Sentry。居中 main：大号 warning-soft 圆圈带 `AlertTriangle`（56px）、h1、≤340px 次要色正文、一个可选次要色 `ref: {error.digest}` 行；两个动作 —— 品牌 **"重试"**（调 `reset()`）+ 描边 **"首页"** → `/home`。

**`/[locale]/not-found.tsx` — 本地化 404** —— 独立全屏居中 main（min-h-dvh，无 Header）：`S3 EmptyBookings` 插画（220×150）、h1、一段 ≤320px 次要色提示、一个品牌 **"首页 →"** → `/home`、一个品牌文字链接 → `/help`（"Ask AI"）。

**`/[locale]/[...rest]` — catch-all**（`[locale]/[...rest]/page.tsx`）—— 无 UI；调 `notFound()`，使 locale 下任何未匹配路径渲染本地化 404 并返回正确的 404 状态。

**`/[locale]/dev/components` — 组件画廊**（`[locale]/dev/components/page.tsx`）—— *仅 dev 构建（生产环境 `notFound()`）。*
`Header` + main + 全局 AI 悬浮按钮。一个 storybook 风格展示：**Buttons**（Primary / Secondary / Ghost / Danger / Disabled；Small / Medium / Large）、**Inputs**（默认 + `invalid`）、**Status badges**（pending / confirmed / in-progress / completed / cancelled / refunded）、**Card**（`Card` + `CardTitle` + `CardBody`）、**Skeleton**（闪光块）、**Illustrations** 占位（`C1 GrandmaWang`、`C3 HelperMei`、`C9 AICompanion`、`S1 TeaTime`、`S5 PaymentSuccess`、`S7 NetworkError`）、以及一个带当前 `locale` 的 `<code>` 标签页脚行。

---

## 八、附录 —— 完整路由清单（75 个页面）

图例：🟢 完全打通 · 🟡 mock 数据 / demo 空操作 / 占位控件 · 🔁 含动态 `[param]` 段

### 公共 / 工具（14）
| 路由 | 备注 |
|---|---|
| `/[locale]` | 重定向 → `/home` |
| `/[locale]/auth/login` | 登录；Consumer/Provider tab；Google/Apple 🟡 惰性 |
| `/[locale]/auth/register` | 创建账号；Google/Apple 🟡 惰性 |
| `/[locale]/auth/verify` | 6 位邮箱验证码；状态 pending/resent/success/expired |
| `/[locale]/auth/forgot` | 请求密码重置验证码 |
| `/[locale]/auth/reset` | 输入验证码 + 新密码；状态 default/success/expired |
| `/[locale]/donate` | 捐款活动落地页；impact stats/stories 🟡 demo 数据 |
| `/[locale]/donate/success` | 致谢（noindex） |
| `/[locale]/donate/cancel` | 已取消（noindex） |
| `/[locale]/help` | 帮助中心；搜索 🟡 仅回传 |
| `/[locale]/help/[slug]` 🔁 | 帮助文章（静态生成） |
| `/[locale]/oops` | 通用错误落地页 |
| `/[locale]/dev/components` | 🟡 仅 dev 的组件画廊 |
| `/[locale]/[...rest]` 🔁 | catch-all → 本地化 404 |
| *（另：`error.tsx`、`not-found.tsx` —— 路由边界，不计入上面 14 个）* | |

### 顾客端（29）
| 路由 | 备注 |
|---|---|
| `/[locale]/home` | 仪表盘 |
| `/[locale]/search` | 统一搜索（服务者 / 服务 / 帮助） |
| `/[locale]/services` | 品类列表 |
| `/[locale]/services/[cat]` 🔁 | 按品类看服务者；筛选 pill 🟡 惰性 |
| `/[locale]/providers/[id]` 🔁 | 服务者详情 + 评价 |
| `/[locale]/bookings/new` | 4 步预订向导 |
| `/[locale]/bookings` | 预订列表（即将进行/历史/周期性） |
| `/[locale]/bookings/recurring` | 🟡 周期性订单（mock 数据） |
| `/[locale]/bookings/[id]` 🔁 | 预订详情 |
| `/[locale]/bookings/[id]/success` 🔁 | 支付成功；日历/.ics 🟡 惰性 |
| `/[locale]/bookings/[id]/feedback` 🔁 | 留下反馈（放款）；照片上传 🟡 禁用 |
| `/[locale]/bookings/[id]/dispute` 🔁 | 发起纠纷（multipart） |
| `/[locale]/pay/[bookingId]` 🔁 | 支付；银行卡表单 🟡 测试值预填 |
| `/[locale]/chat` | AI 助手 + 紧急视图 |
| `/[locale]/notifications` | 通知（全部/预订/AI/系统） |
| `/[locale]/profile` | 个人中心菜单 |
| `/[locale]/profile/edit` | 🟡 编辑资料（demo） |
| `/[locale]/profile/security` | 🟡 安全（demo）；2FA 惰性 |
| `/[locale]/profile/addresses` | 已保存地址 |
| `/[locale]/profile/addresses/new` | 添加地址 |
| `/[locale]/profile/payment` | 支付方式 |
| `/[locale]/profile/payment/new` | 🟡 添加卡（占位，无表单） |
| `/[locale]/profile/emergency` | 紧急联系人 |
| `/[locale]/profile/favourites` | 🟡 收藏（mock 数据） |
| `/[locale]/profile/notifications` | 🟡 通知偏好（demo） |
| `/[locale]/profile/family` | 家庭成员；邀请流程 🟡 待做 |
| `/[locale]/safety/report` | 报告安全事件；证据上传 🟡 禁用 |
| `/[locale]/settings/account` | 🟡 账户设置（demo） |
| `/[locale]/settings/privacy` | 隐私开关 🟡 装饰性；数据导出 🟢；删除账号 🟢 |

### 服务者端（14）
| 路由 | 备注 |
|---|---|
| `/[locale]/provider` | 工作台 / 首页 |
| `/[locale]/provider/register` | 5 步入驻向导（ABN / 文档 / 区域 / 可用时间 / Stripe + 同意） |
| `/[locale]/provider/onboarding-status` | 申请状态时间线 |
| `/[locale]/provider/compliance` | 上传 / 重新上传合规文档 |
| `/[locale]/provider/profile` | 🟡 公开档案编辑（保存 stub） |
| `/[locale]/provider/services` | 🟡 服务与价格（mock 数据，保存 stub） |
| `/[locale]/provider/availability` | 每周可用时间网格 + 模板 |
| `/[locale]/provider/blocked-times` | 一次性休息时间 |
| `/[locale]/provider/calendar` | 月历（以只读为主） |
| `/[locale]/provider/jobs` | 派单列表（今天/本周/历史） |
| `/[locale]/provider/jobs/[id]` 🔁 | 派单详情 + 生命周期操作（接受/拒绝/出发/完成） |
| `/[locale]/provider/earnings` | 收益 + 7 天趋势；CSV 导出 🟡 禁用 |
| `/[locale]/provider/payouts` | 🟡 收款设置与历史（mock 数据） |
| `/[locale]/provider/reviews` | 评价与评分 + 回复 |

### 后台管理（18）
| 路由 | 备注 |
|---|---|
| `/[locale]/admin/login` | 后台登录（邮箱 + 密码 + TOTP）；🟡 校验是 stub |
| `/[locale]/admin` | 概览 / 运营仪表盘 |
| `/[locale]/admin/analytics` | 数据分析（区间 tab、国家图表、5 个 KPI） |
| `/[locale]/admin/disputes` | 纠纷列表 + 裁决抽屉 |
| `/[locale]/admin/disputes/[id]` 🔁 | 纠纷详情（证据、邮件） |
| `/[locale]/admin/safety` | 事件报告列表 + 裁决抽屉 |
| `/[locale]/admin/safety/[id]` 🔁 | 事件详情（照片） |
| `/[locale]/admin/providers` | 服务者列表 + 审批抽屉 |
| `/[locale]/admin/providers/[id]` 🔁 | 服务者详情 / 合规工作台（带门禁批准、force-approve、文档审核、背调重发、webhook 死信） |
| `/[locale]/admin/refunds` | 退款列表（处理 queued） |
| `/[locale]/admin/payments` | 🟡 财务仪表盘（导出禁用） |
| `/[locale]/admin/reports` | 评价审核队列（保留 / 删除 / 警告） |
| `/[locale]/admin/customers` | 顾客列表 + 抽屉 |
| `/[locale]/admin/customers/[id]` 🔁 | 顾客详情；暂停/恢复/封禁 🟡 禁用 |
| `/[locale]/admin/bookings` | 预订监控（筛选 tab） |
| `/[locale]/admin/ai/conversations` | AI 聊天审计 + 转录抽屉 |
| `/[locale]/admin/ai/kb` | AI 知识库编辑器 *（不在侧栏）* |
| `/[locale]/admin/settings` | 平台设置（仅取消窗口持久化） |

**合计：75 个 `page.tsx` 路由**（14 公共 + 29 顾客 + 14 服务者 + 18 后台），另加 `error.tsx` / `not-found.tsx` 路由边界。
