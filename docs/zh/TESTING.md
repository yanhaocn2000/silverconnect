# 测试策略

## 测试金字塔

```
         /\
        /E2E\         e2e/*.spec.ts        (Playwright，关键流)
       /----\
      / Integ\        __tests__/...        (Jest + Supabase 测试 schema)
     /--------\
    /   Unit   \      __tests__/services/  (Jest，纯逻辑)
   /------------\
```

目标：

| 层 | 工具 | 阈值 |
|---|---|---|
| Unit + integration | Jest | 70% global（branches / functions / lines / statements）— `jest.config.js` `coverageThreshold` |
| API integration | Jest（+ 测试 DB） | 目标：每条 API 路由至少一个 happy + 一个 auth-fail；config 尚未强制 |
| E2E | Playwright（chromium / firefox / webkit / Mobile Chrome / Mobile Safari） | 标 `@critical` 的关键流必须过 |
| Lighthouse | `lighthouserc.json` URL `/`、`/services`、`/bookings`，每页 3 次 | Performance ≥ 0.9、Accessibility ≥ 0.9、Best Practices ≥ 0.85、SEO ≥ 0.9 |
| Load | k6（`k6/`） | 目标：booking 端点 100 RPS，p95 < 500 ms |

## 运行

```bash
npm test                     # 所有 unit/integration
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:critical    # 仅 @critical
npm run test:e2e:ui          # 交互
npm run test:performance     # 在跑着的 dev server 上跑 Lighthouse
```

配置：`jest.config.js`、`playwright.config.ts`、`lighthouserc.json`。

> **Playwright dev server**：`playwright.config.ts` 有 `webServer` 块（`command: 'npm run dev'`、`reuseExistingServer: !CI`），所以 `npm run test:e2e` 会在没有 dev server 时自动起一个在 `http://localhost:3000`。要对已部署实例跑，设 `PLAYWRIGHT_TEST_BASE_URL`。

## 现有 E2E 用例

| 文件 | 覆盖 | 状态 |
|---|---|---|
| `e2e/full-flow-ui.spec.ts` | 全流程 UI 走查（含截图快照 `e2e/full-flow-ui.spec.ts-snapshots/`）；import `_helpers/db.ts`，seed + 表单登录真账号 | 基本绿；1 个过时（`provider signup + email verify (UI)`，快照/选择器漂移）|
| `e2e/functional.spec.ts` | ~50 个冒烟：public/locale 路由、auth 页、profile/provider/admin 页面 load、auth guard、switcher | 绿；**13 个 `test.fixme(...)`** —— 引用 2026-04 mock 数据（`J-1042`/`D-2031`/`C-301`/`AI-501`）、旧的非-iron-session cookie、`demo@silverconnect.com`、已删的 GET-logout、或已变的向导字段，需对着 `_helpers/db.ts` fixture 重写 |
| `e2e/sprint1-smoke.spec.ts` | locale 路由、header chips、country-cookie 定价、booking 向导、help、紧急浮层、payment states | 部分过时：~13 个"已登录"/行为差异用例失败（fixture 凭证 + 页面行为漂移）—— **档 B 清理** |
| `e2e/a11y.spec.ts` | axe 无障碍扫描 ~28 个页面 | 23 绿；**5 个失败 = 真 "serious" 违规**：`/services/{cat}`、`/admin/disputes`、admin dispute drawer、`/admin/customers`、`/admin/analytics` —— 真 bug，单独提 |
| `e2e/smtp-e2e.spec.ts` | 经 SMTP 发真实验证邮件 | 需 SMTP 配置；否则 skip/过 |
| `e2e/donate.spec.ts` | 捐赠页渲染 + 金额切换 + checkout payload + amount=0 被拒（到 Stripe 跳转前）— 见 [e2e-new-features-2026-05.md §2](e2e-new-features-2026-05.md) | **4/4 绿** |
| `e2e/provider-compliance.spec.ts` | 服务者自动化合规：ABN 校验、背调授权、onboarding gating（需 `scripts/seed-e2e-provider.ts` + `PW_PROVIDER_EMAIL/PASSWORD`）— 见 [e2e-new-features-2026-05.md §1](e2e-new-features-2026-05.md) | **6/6 绿** |

> **2026-05-12 删除**（2026-04 死 spec，已被上面替代）：`uat-signin-flow.spec.ts`（假设有 sign-in *modal*，认证统一后没有了；硬编码 `localhost:3000`）、`booking-flow.spec.ts`（UI 重设计后选择器全过时；下单 happy path 已被 `full-flow-ui.spec.ts` + `scripts/smoke-full-flow.ts` 覆盖）、`critical-flows.spec.ts`（引用 `/dashboard/bookings`、Stripe Elements iframe、"Get Started" CTA —— 都不存在；3s/2s 性能阈值脆）。

> **2026-05 新功能**：ABN/背调合规、公开捐赠流程、明/暗主题、5 语言 i18n + AU/US/CA 区域、统一认证 tab/短链。完整测试方案：[e2e-new-features-2026-05.md](e2e-new-features-2026-05.md)。`donate.spec.ts` / `provider-compliance.spec.ts` 覆盖了一部分；其余（Stripe 托管页流程、webhook 幂等、job gate、主题视觉回归、locale 冒烟、角色 tab）仍是手工或未实现——见该文档 §7。

### 已知测试债（截至 2026-05-12）

非新功能的 spec 部分落后于 app，修的优先级：
1. **`a11y.spec.ts` × 5 —— 真无障碍 bug**（`/services/{cat}` + 4 个 admin 页，axe "serious"）。改页面 markup，不是测试问题。
2. **`sprint1-smoke.spec.ts` × ~13** —— "已登录" auth-guard / payment-state / booking-wizard 用例的 fixture 凭证和行为假设过时，对着 `_helpers/db.ts` 重写（参考 `full-flow-ui.spec.ts`）。
3. **`functional.spec.ts` × 13 `test.fixme`** —— 对着 seeded fixture 重写（真账号表单登录、真 seeded 的 dispute/conversation/booking id）。
4. **`full-flow-ui.spec.ts` × 1** —— `provider signup + email verify (UI)`：更新注册流选择器（现在是 `/auth/register` customer-only → `/provider/register` 提升），确认 UI 无误后 `--update-snapshots`。
5. **`@critical` 标签**：`npm run test:e2e:critical` 跑 `playwright test --grep @critical`，但 **当前没有任何用例打 `@critical`**（2026-05-12 核实）——匹配零条。把每个 PR 必过的用例（先 `donate.spec.ts` + `provider-compliance.spec.ts` + `full-flow-ui.spec.ts` 的绿色核心）打标，再在 CI 里依赖这道闸。

## 用例编写

### Unit（lib/）
```ts
import { calculatePrice } from '@/lib/pricing'
test('AU price includes 10% GST', () => {
  expect(calculatePrice({ base: 100, countryCode: 'AU' }).total).toBeCloseTo(110)
})
```

### Integration（API 路由）
- 用专门的 Supabase 测试项目，或事务回滚封装。
- 用 `npm run db:seed` 种服务目录数据；需要 demo 服务者时再跑 `npm run db:seed:providers`，然后直接 invoke route handler。

### E2E
- 用 `e2e/` 中的 Playwright fixtures。优先 `data-testid` 选择器，避免文案漂移。
- 每个用例前清空 + 种数据，避免顺序依赖。

## CI 闸门

PR 必须通过：
1. `npm run lint`
2. `npm test`
3. `npm run test:e2e:critical` *（一旦给用例加上 `@critical` 标，目前是 no-op）*
4. `npm run build`

见 [CI_CD.md](../CI_CD.md)。

## 手工 / UAT

- 部署站上的三角色（customer / provider / admin）走查：[E2E_SERVER_GUIDE.md](../E2E_SERVER_GUIDE.md) —— 含 §3A 2026-05 新功能。
- 完整可执行 E2E 设计（23 步主链路 + 旁支 A–E）：[E2E_FULL_FLOW.md](../E2E_FULL_FLOW.md)。
- 新功能测试方案（合规 / 捐赠 / 主题 / i18n / 认证）：[e2e-new-features-2026-05.md](e2e-new-features-2026-05.md)。
- 旧版终端用户手册：[../archive/legacy-2026-04/MANUAL_TESTING_GUIDE.md](../archive/legacy-2026-04/MANUAL_TESTING_GUIDE.md)（2026-04，已归档 —— 被 `E2E_SERVER_GUIDE.md` 取代）。UAT 日志落 `uat-test-results.log`。
- `TESTING_AND_DEPLOYMENT_GUIDE.md` 在 `docs/archive/deploy-2026-05-pre-vps/`，是历史文档（讲 Vercel-as-primary），不要照做。

## 测试数据卫生

- 永不把真实 PII 写入 fixture。
- Stripe：仅测试 key（`pk_test_`、`sk_test_`）。
- Supabase：`test` 与 `dev` 用各自项目；绝不对 `prod` 跑测试。
