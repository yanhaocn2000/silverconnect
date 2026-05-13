# 登录入口改造方案

> ⚠️ **2026-05-12 起部分作废**：本文「消费者 / 服务者两个 Tab」的设计已被「身份合一」方案取代——一次注册即同时拥有消费者和服务者能力，登录页不再区分角色（`AuthRoleTabs` 组件、`?role=provider` 入口、登录后按 `role` 跳 `/provider` 均已移除）。服务者入口改为登录后从导航栏「服务者模式」进入 `/provider`。详见 `~/.claude/plans/luminous-roaming-squid.md` / 提交记录。本文「短链接 `/login`」「视觉区分 admin 登录」等与角色无关的部分仍有效。
>
> 反馈：三种角色登录页"长得完全一样"；登录链接在手机上不好输入。
> 目标：让用户在手机上**不用打长 URL** 也能进对的登录页，并且看一眼就知道自己在哪。

---

## 1. 现状

| 角色 | 路径 | 入口区分 |
|------|------|----------|
| 消费者 (consumer) | `/<locale>/auth/login` | 无 |
| 服务提供者 (provider) | `/<locale>/auth/login` | 无（与 consumer 共用，登录后按 `user.role` 分流） |
| 管理员 (admin) | `/<locale>/admin/login` | 视觉已区分，多 TOTP 字段 |

代码位置：
- [app/[locale]/(public)/auth/login/page.tsx](../../app/%5Blocale%5D/%28public%29/auth/login/page.tsx)
- [app/[locale]/(admin)/admin/login/page.tsx](../../app/%5Blocale%5D/%28admin%29/admin/login/page.tsx)

i18n 路由配置（[i18n/routing.ts](../../i18n/routing.ts)）：`locales: ["en", "zh"]`、`defaultLocale: "en"`、`localePrefix: "always"`——意味着所有页面 URL 都强制带 locale 前缀，目前**没有**自定义 `middleware.ts`，next-intl 自带的 middleware 在处理。

**两个真问题**：

1. **视觉无区分**：consumer 和 provider 进同一个页面，看不到"我是谁"的暗示，provider 第一次用会怀疑走错了。
2. **链接难输入**：`https://<domain>/en/auth/login` 段数多、易打错，手机上打一遍要十几秒。

---

## 2. 设计原则

- **只动 UI 入口，不动认证逻辑**：登录后端、role 分流、TOTP 全部保留。
- **角色显式选择 > URL 区分**：手机用户不应该靠记路径区分角色。
- **短链优先 > 二维码兜底**：先把入口缩到一段好记的，再用二维码消灭"输入"这一步。

---

## 3. 方案

### 3.1 统一入口 + 角色 Tab（核心）

把 `/auth/login` 改成一个**带 Tab 的统一登录页**：

```
┌─────────────────────────────┐
│  SilverConnect              │
│                             │
│  [ 我是用户 ] [ 我是服务者 ] │  ← Tab，URL 同步 ?role=
│                             │
│  邮箱 ___________           │
│  密码 ___________           │
│  [ 登录 ]                   │
│                             │
│  没账号？注册 →             │
└─────────────────────────────┘
```

> **注意**：不在此页面放"管理员入口"链接——admin 入口要保持隐蔽（见第 5 节）。

**实现细节**：

- Tab 通过 `?role=consumer|provider` 切换，**不影响后端逻辑**——后端依旧按 `user.role` 分流，Tab 只是 UI 层暗示 + 注册跳转的预设。
- **默认 Tab 是 consumer**：`/auth/login`（无 query）= `/auth/login?role=consumer`，因为消费者是绝大多数用户。
- Tab 选中态影响：
  - 标题文案（"欢迎回来" vs "服务者登录"）
  - 主色/图标（consumer 默认色，provider 用 brand-secondary 或加图标徽章）
  - "没账号？注册"链接：consumer → `/auth/register`，provider → `/auth/register?role=provider`
- **若登录用户的 role 与 Tab 不一致**：不报错，按真实 role 跳转（与现状一致）。Tab 只是入口视觉。

**为什么不做三个独立页面**：
- consumer/provider 字段完全相同，三页是重复代码。
- admin 字段不同（TOTP）+ 风险等级不同，独立页是合理的，保持现状。

### 3.2 短链 + 重定向（解决"难输入"）

目标短链：

| 短链 | 目标（locale 由 next-intl 决定） |
|------|----------------------------------|
| `/login` | `/auth/login` |
| `/admin` | `/admin/login`（未登录时） |
| `/p` | `/auth/login?role=provider`（可选） |

**实现要点**（关键，因为 `localePrefix: "always"`）：

- 项目目前**没有**自定义 `middleware.ts`，只有 next-intl 自带的。需要新建一个项目根的 `middleware.ts`，**先**做短链重写到 `/auth/login`、`/admin/login`，**再**调用 next-intl middleware 让它补 locale 前缀。顺序反了会被 next-intl 直接 404。
- 也可以用 `next.config.ts` 的 `redirects()`，但 redirects 是 308 跳转、客户端会看到 URL 变化两次；middleware 的 rewrite 只跳一次，体验更好。**推荐 middleware**。
- locale 选择：让 next-intl middleware 按它默认策略（cookie `NEXT_LOCALE` → `Accept-Language` → `defaultLocale=en`）决定，不要硬编码。
- ⚠️ 实施前必须读 `node_modules/next/dist/docs/`（项目 [AGENTS.md](../../AGENTS.md) 的强制要求）和 `node_modules/next-intl` 关于 middleware 组合的最新文档，确认 API 没变。

效果：手机用户输入 `域名/login`（路径 6 字符）即可，比 `域名/en/auth/login`（路径 14 字符）短约 57%，且无需关心 locale。

### 3.3 登录页二维码（彻底消灭"输入"）

桌面端 marketing/落地页放一个"扫码登录"按钮，弹出 QR 指向 `域名/login`，手机扫码直达登录页。

- 纯前端工作，用 `qrcode` 这种小库即可，不需要后端配合。
- 不放在已登录区域（管理后台等），那里没意义。

### 3.4 PWA 安装提示（长期）

登录后第一次进 home，提示"添加到主屏幕"。装上之后用户根本不用再输入 URL——点图标即可。这个不在本次范围，但建议同期排上。

---

## 4. 实施顺序

1. **短链 middleware**（`/login` → `/auth/login`，组合 next-intl）— 1-2 小时，立刻解决最痛的输入问题。
2. **Tab 化 `/auth/login`** — 半天，解决视觉无区分。
   - 新增 client 组件 `AuthRoleTabs`，URL 同步 query。
   - 注册链接根据 Tab 拼 `?role=`。
3. **桌面 QR 浮层** — 1-2 小时，可选。
4. **PWA / `manifest.json`** — 单独排期，不阻塞本次。

---

## 5. 不做的事

- ❌ 拆三个独立登录页：consumer/provider 字段一样，没必要。
- ❌ 改后端登录逻辑或 role 分流：现有逻辑没问题，问题在入口而非鉴权。
- ❌ 给 admin 也做短链 `/a` 或在 consumer 登录页放 admin 入口链接：admin 入口越隐蔽越好，反而不该让它好猜。
- ❌ 把 admin 合并进 Tab：admin 风险等级、字段（TOTP）、IP 限制都不同，混在一起会拖低普通用户体验也增加误操作风险。

---

## 6. 验收标准

- [ ] 手机浏览器输入 `域名/login` 能直达登录页，并按 next-intl 策略保留 locale。
- [ ] 登录页顶部有 Tab，consumer/provider 切换时标题与注册链接同步变化。
- [ ] 切 Tab 不会丢失已输入的邮箱（query 切换不刷整页）。
- [ ] 既有登录流程（邮箱密码、role 分流、未验证邮箱跳转）全部不变。
- [ ] admin 登录页与流程**完全不动**，且统一登录页**不出现** admin 入口链接。
