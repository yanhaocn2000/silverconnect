# SilverConnect 新设计 UI 改造方案

> 来源设计：[docs/zh/silverconnet/project/](project/)（Claude Design handoff bundle）
> 权威入口：[SilverConnect Pages.html](project/SilverConnect%20Pages.html) + [tokens.css](project/tokens.css)
> 现存代码：[app/[locale]/](../../../app/[locale]/) 共 75 个 `page.tsx`，组件库在 [components/ui/](../../../components/ui/) 与 [components/layout/](../../../components/layout/)
> 制定时间：2026-05-14
> 验证命令以当前仓库为准：本项目使用 `package-lock.json` 与 `npm` scripts，非 `pnpm`。

---

## 0. 总体判断

新设计与现有 UI 的差异**不是局部调整，而是一次彻底的视觉系统替换**：

| 维度 | 现有 | 新设计 |
|------|------|--------|
| 品牌色 | 冷调蓝 `#1858C4` | 蓝绿 `#2E86AB`（来自 HTML 的 TWEAK_DEFAULTS） |
| 背景 | 纯白 `#FFFFFF` + 灰面 `#F8FAFC` | 米白 `#FBF7F2` + 奶油面 `#F6F1EA` |
| 字体 | 系统字体栈 | Plus Jakarta Sans + Noto Sans SC |
| 圆角 | 标准 Tailwind | `--radius-lg: 18px`、`--radius-pill: 999px` 更圆润 |
| 阴影 | 标准 | 三档暖色调阴影（带棕底） |
| 组件语汇 | 现代 SaaS | "长者友好"——大字号、大触控区、大间距、暖色 |

因此**底层 token 必须先换**，再逐页改造，否则后做的页面会和前做的页面冲突。

新设计共 **20+ 个 DCSection**、约 **80+ 个 artboard**，绝大多数 artboard 与现有 `app/[locale]/**/page.tsx` 是 1:1 对应关系。

---

## 1. Web 自适应手机端可行性评估

**结论：可行，推荐"单代码库 + 响应式断点"方案，不推荐为桌面/移动分别建两套页面。**

### 设计文件给出的信号

设计稿对**外壳级页面**（登录/注册/顾客首页/服务者工作台/后台/捐款落地/404）显式给出 `desktop` 与 `mobile` 两个变体，源码用同一个组件 + `desktop` boolean prop 切换（见 [pages.jsx:41](project/pages.jsx#L41)、[pages.jsx:155](project/pages.jsx#L155)）。差异点集中在：

- 栅格列数：`gridTemplateColumns: desktop ? "repeat(5, 1fr)" : "1fr 1fr"`
- 字号/内边距倍数：`fontSize: desktop ? 36 : 30`、`padding: desktop ? "32px 36px" : "24px 22px"`
- 底部 Tab / FAB / SOS：`{!desktop && <BottomTabBar />}`、`{!desktop && <fab-ai />}`
- StatusBar：桌面端不渲染

对**内部业务页**（搜索结果、预订向导、个人中心、服务者派单等）设计稿**只给了 390×844 移动端**——这些页面在桌面端用"居中容器 + 最大宽度"即可，业务上也没有桌面专属布局。

### 推荐实现方式

1. **以移动端布局为基准设计**——所有页面默认按 390 宽渲染。
2. **用 Tailwind 断点 `md:` (≥768px) / `lg:` (≥1024px) 渐进增强**：
   - 外壳页：`md:` 切换为多列网格 + 大字号 + 桌面 Header（隐藏底部 Tab、隐藏 FAB/SOS、显示顶部菜单）
   - 内页：`md:max-w-[640px] md:mx-auto` 居中即可，不另外做桌面版面
3. **底部 Tab / SOS / 问 AI FAB 用 `md:hidden`**，桌面端把这些动作迁移到顶部 Header。
4. **viewport meta** 已正确（[layout.tsx](../../../app/[locale]/layout.tsx)），CSS 用 `clamp()` / `min()` 控制流体字号，避免硬编码 px。
5. **不引入新的 UA sniff 或 useIsMobile hook**——纯 CSS 断点即可，SSR 友好。

### 风险

- Plus Jakarta Sans + Noto Sans SC 是 Google Fonts，需在根布局 [app/layout.tsx](../../../app/layout.tsx) 用 `next/font/google` 自托管，避免外网依赖（Next 会自托管字体文件，浏览器不请求 Google）。`app/[locale]/layout.tsx` 只负责 locale provider、跳转辅助与全局浮层。
- 旧组件（`Button`/`Card`/`Input`）的 className 假设了旧 token，换 token 后需要同步重写默认样式。

---

## 2. 改造阶段划分（10 个阶段，逐页验证）

> 工作流：**每阶段做完 → `npm run typecheck` + `npm run build` + 本地 `npm run dev` 在浏览器走一遍 → 截图对照设计稿 → 自评审发现问题立即修复 → 全过再进入下一阶段。**

当前路由口径：75 个 `page.tsx` = public 10 + customer 29 + provider 14 + admin 18 + locale 根/兜底/错误辅助 4。下方 Phase 标题中的“路由页”按真实 `page.tsx` 计数；括号内另列设计屏/状态数，避免把单一路由里的多步骤向导误算成多个页面。

本地验证前置：`npm run build` 会在收集页面数据时加载 auth/db 相关模块，本地必须有至少 32 字符的 `SESSION_SECRET`，并提供 `DATABASE_URL`（可按 [.env.local.example](../../../.env.local.example) 填入本地开发库）。生产/部署环境变量仍以根目录 [DEPLOYMENT.md](../../../DEPLOYMENT.md) 为准，不把真实密钥写入仓库。

### Phase 0｜设计系统底座（前置，必须最先做）

1. 把 [tokens.css](project/tokens.css) 的 CSS 变量合并进 [app/globals.css](../../../app/globals.css)，覆盖旧的 `--brand-primary` 等
2. 更新 [tailwind.config.ts](../../../tailwind.config.ts)：`colors.brand`、`borderRadius`、`fontFamily`、`boxShadow` 全部指向新变量
3. 接入 Plus Jakarta Sans + Noto Sans SC（`next/font/google`，display swap）
4. 改写 [components/ui/](../../../components/ui/) 的 Button / Card / Input / Badge / Modal，对照 tokens.css `.btn`/`.card`/`.input`/`.chip` 的样式
5. 新增 [components/ui/](../../../components/ui/) 缺失原子：`Chip`、`Banner`、`StatBadge`（`.sbadge`）、`SearchBar`（`.search`）、`CategoryTile`（`.cat-tile`）、`ProviderCard`（`.pcard`）、`DottedCTA`（`.dotted-cta`）
6. **验收**：`/[locale]/dev/components` 页面看到新原子全部生效；旧蓝色完全消失

### Phase 1｜公共外壳与认证（6 个路由页）

[app/[locale]/(public)/auth/](<../../../app/[locale]/(public)/auth/>) 下：login / register / verify / forgot / reset，外加 [oops/page.tsx](../../../app/[locale]/oops/page.tsx) 404。

参考：[pages.jsx](project/pages.jsx) 中的 `LoginPage` / `SignupPage` / `VerifyEmailPage` / `ForgotPasswordPage` / `ResetPasswordPage` / `Error404Page`。

要点：无导航、右上角主题切换、居中 AuthCard、桌面/移动同组件 + 断点。

### Phase 2｜顾客外壳（Header + 底部 Tab + FAB + SOS）

改造 [components/layout/Header.tsx](../../../components/layout/Header.tsx)、[BottomTabBar.tsx](../../../components/layout/BottomTabBar.tsx)、[AIFloatButton.tsx](../../../components/layout/AIFloatButton.tsx)、[EmergencyOverlay.tsx](../../../components/layout/EmergencyOverlay.tsx)。

参考：[customer-pages.jsx](project/customer-pages.jsx) 的 `BottomTabBar`、[tokens.css](project/tokens.css#L255-L285) 的 `.tabbar` / `.tab-pill`、[pages.jsx](project/pages.jsx) 的 `AppHeader`、捐款 pill、`.fab-ai` / `.sos`。

桌面端 (`md:`) 隐藏底部 Tab/FAB/SOS，菜单上移到 Header 右侧（用 [DesktopNav.tsx](../../../components/layout/DesktopNav.tsx) 承载）。

### Phase 3｜顾客首页 + 发现/找服务（5 个路由页）

- [home/page.tsx](<../../../app/[locale]/(customer)/home/page.tsx>)
- [search/page.tsx](<../../../app/[locale]/(customer)/search/page.tsx>)
- [services/page.tsx](<../../../app/[locale]/(customer)/services/page.tsx>)
- [services/[cat]/page.tsx](<../../../app/[locale]/(customer)/services/[cat]/page.tsx>)
- [providers/[id]/page.tsx](<../../../app/[locale]/(customer)/providers/[id]/page.tsx>)

设计参考：`CustomerHome` / `SearchPage` / `ServicesList` / `CategoryPage` / `ProviderDetail`。

首页是唯一另有桌面变体的内页，按 `desktop` prop 的 5 列 vs 2 列网格落断点。

### Phase 4｜顾客预订流程（4 个路由页 / 7 个设计屏）

bookings/new（单路由承载向导 4 步）、bookings、bookings/[id]、bookings/recurring。

设计参考：`BookStep1..4` / `BookingsList` / `BookingDetail` / `RecurringPage`。

### Phase 5｜顾客支付、反馈、纠纷、聊天、通知（6 个路由页）

pay/[bookingId]、bookings/[id]/success、bookings/[id]/feedback、bookings/[id]/dispute、chat、notifications。

设计参考：`PaymentPage` / `PaymentSuccess` / `FeedbackPage` / `DisputePage` / `ChatPage` + `ChatEmergency` SOS 态 / `NotificationsPage`。

### Phase 6｜顾客个人中心 + 安全设置（14 个路由页）

profile/* 全部（11 个路由页）+ safety/report + settings/account + settings/privacy。

设计参考：`ProfileMenu` / `ProfileEdit` / `SecurityPage` / `AddressesPage` / `AddressNewPage` / `PaymentMethodsPage` / `AddCardPage` / `EmergencyContactsPage` / `FavouritesPage` / `NotifPrefsPage` / `FamilyPage` / `SafetyReportPage` / `AccountSettings` / `PrivacyPage`。

### Phase 7｜服务者外壳 + 工作台 + 入驻（4 个路由页 / 8 个设计屏）

provider/page、provider/register（单路由承载 5 步向导）、onboarding-status、compliance。

设计参考：`ProviderWorkbench`（含审核中 banner 态）+ `OnboardStep1..5` + `StatusTimeline` + `CompliancePage`。

改造 [ProviderBottomTabBar.tsx](../../../components/layout/ProviderBottomTabBar.tsx)。

### Phase 8｜服务者派单/日程/收益/档案（10 个路由页 / 12 个设计屏）

jobs、jobs/[id]（3 态：confirmed / enroute / completed，用 query 或路由参数）、calendar、availability、blocked-times、earnings、payouts、profile、services、reviews。

设计参考：`JobsListPage` / `JobDetailPage` / `CalendarPage` / `AvailabilityPage` / `TimeOffPage` / `EarningsPage` / `PayoutsPage` / `PublicProfilePage` / `ServicesPricesPage` / `ReviewReplyPage`。

### Phase 9｜后台（18 个路由页）

改造 [AdminShell.tsx](../../../components/layout/AdminShell.tsx)（顶栏 + 左侧栏 + 内容区 + 右滑入式 drawer）+ 全部 `(admin)/admin/**` 页面。

设计参考：[admin-pages.jsx](project/admin-pages.jsx) 全部组件。

后台**优先桌面端布局** ≥1440，移动端做最低限度可读性即可（不展开抽屉、表格滚动）。

### Phase 10｜公共/营销页（5 个路由页，捐款 + 帮助）

donate（落地 + success + cancel）、help、help/[slug]。

设计参考：[marketing-pages.jsx](project/marketing-pages.jsx) 的 `DonateLandingPage` / `DonateThankYouPage` / `HelpCenterPage` / `HelpArticlePage`。

---

## 3. 每阶段验证清单（循环评审 checklist）

- [ ] `npm run typecheck` 0 错
- [ ] `npm run build` 通过
- [ ] `npm run dev` 起服务，浏览器 390×844 (手机) + 1280×800 (桌面) 各走一遍
- [ ] 对照设计稿 artboard 截图比对：色值、圆角、字号、间距
- [ ] 5 个 locale (`en` / `zh-CN` / `zh-TW` / `ja` / `ko`) 文案 key 齐全（[AGENTS.md i18n 规则](../../../AGENTS.md)）
- [ ] 暗色主题 `data-theme="dark"` 切换正常
- [ ] 无控制台 hydration 警告 / 无 404 资源
- [ ] 自评审：senior engineer 看会不会说 overcomplicated → 不会
- [ ] 发现问题 → 立即修复 → 重跑上述清单 → 全过才进下一 Phase

---

## 4. 不在本次范围

- 后端 API / 数据模型变更（设计稿没要求）
- 国际化 key 重命名（沿用现有 namespace）
- 路由结构调整（沿用现有 `(customer)/(provider)/(admin)/(public)` 分组）
- 测试覆盖率提升（按现状跟进）

---

## 5. 已锁定的关键决策

- **品牌色 = `#2E86AB`（蓝绿）**：来自设计稿 `SilverConnect Pages.html` 的 `TWEAK_DEFAULTS.brand`（JS 注入到 `--brand`，会覆盖 tokens.css 中的橘红兜底）。Tweaks 面板的其他 3 色（`#E96A4A` / `#D5453E` / `#3D8A5C`）作为可切换主题保留实现能力，但不作为默认。
- **字体 = Plus Jakarta Sans + Noto Sans SC**：用 `next/font/google` 自托管，避免外网依赖（生产部署在国内 VPS）。
- **响应式策略 = 单代码库 + Tailwind 断点**：移动端为基准，`md:` 渐进增强，不做"桌面专属页面"。
- **改造顺序 = Phase 0 设计系统底座先行**，之后按 Phase 1→10 串行，每 Phase 完结一次循环评审 checklist。

后续若用户对上述任一条有异议，回到本节修订再继续。
