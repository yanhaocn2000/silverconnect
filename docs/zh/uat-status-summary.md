# SilverConnect UAT 测试用例完成情况整理

> 源文档：`E:\Users\Downloads\UAT.md`（SilverConnect UAT Master Test Plan V6）
> 整理时间：2026-05-10

## 重要前提

源 UAT 文档是**测试计划/用例规格**，本身**不包含 PASS/FAIL 或 Done/Open 状态标记**——它只列出了 28 个用例的步骤和验收标准。所以下面表格中的「状态」列是基于**当前代码库实际功能存在性**做的快速判断，**不等于已通过 UAT**：

- ✅ **已实现** — 对应页面/组件/逻辑已在代码库中存在，可被实际测试
- ⚠️ **部分实现** — 主体功能存在但用例中的某个关键点缺失（如语言、角色、模式开关）
- ❌ **未实现** — 找不到对应代码，需要从 0 开始开发
- ❓ **需人工验证** — 代码存在但行为是否满足验收标准（语气、SLA、翻译质量等）必须人工评估

---

## 1. 多语言体验（Section 2）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **ML-001** | Landing Page 语言切换 | ⚠️ 部分实现 | `i18n/routing.ts` 已配置；`messages/` 仅有 `en.json` / `zh.json`，**Thai / Japanese 翻译缺失** |
| **ML-002** | 表单中途切换语言保留数据 | ❓ 需人工验证 | 需在浏览器实测：next-intl 路由切换时表单 state 是否丢失 |
| **ML-003** | 缺失翻译回退到英文 | ❓ 需人工验证 | next-intl 默认回退机制存在，但需检查是否会暴露 key |

---

## 2. 注册与登录（Section 3）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **SU-001** | 邮箱注册成功 | ✅ 已实现 | `app/[locale]/(public)/auth/register/page.tsx`、`auth/verify/page.tsx` |
| **SU-002** | 错误验证码处理 | ✅ 已实现 | 同上，需人工验证错误文案是否「温和、无技术术语」 |
| **SU-003** | 长者友好注册（Large Text Mode） | ❌ 未实现 | 代码库**未找到** `largeText / elderMode / fontScale` 任何相关实现 |

---

## 3. 通用账号 / 多角色（Section 4）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **UA-001** | 角色切换 Customer ↔ Provider | ⚠️ 部分实现 | 三套路由组 `(customer)` / `(provider)` / `(admin)` 存在，但**未找到角色切换器组件**（`switchRole` 等关键词无匹配） |
| **UA-002** | 未验证 Provider 拦截 | ✅ 已实现 | `provider/onboarding-status/page.tsx`、`provider/compliance/page.tsx` 存在 |

---

## 4. 客户预约（Section 5）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **CB-001** | 标准预约流程 | ✅ 已实现 | `bookings/new`、`pay/[bookingId]`、`bookings/[id]/success` 完整流程在 |
| **CB-002** | 长者友好预约 | ❌ 未实现 | 同 SU-003，缺 Elder-Friendly Mode 开关 |
| **CB-003** | 60s 不操作 AI 介入 | ❓ 需人工验证 | `AIFloatButton` 组件存在，但**未确认**是否有 inactivity 触发逻辑 |

---

## 5. Representative 流程（Section 6）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **RP-001** | Representative 代下单 | ❌ 未实现 | 代码库**未找到** Representative 角色概念；`profile/family/page.tsx` 存在但只是家人列表 |
| **RP-002** | 未关联长者下单被拒 | ❌ 未实现 | 同上，缺前置功能 |

---

## 6. Provider 流程（Section 7）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **PR-001** | 多语言 Provider 入驻 | ⚠️ 部分实现 | `provider/register`、`provider/onboarding-status` 存在；**日文翻译缺失** |
| **PR-002** | 误拒任务可撤销 | ❓ 需人工验证 | `provider/jobs/[id]/page.tsx` 存在；需实测是否有二次确认弹窗 |

---

## 7. 紧急管理（Section 8）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **EM-001** | SOS 紧急触发 | ✅ 已实现 | `components/layout/EmergencyOverlay.tsx`、`profile/emergency/page.tsx`、`safety/report/page.tsx` 都在 |
| **EM-002** | 离线 SOS（缓存 + 同步） | ❓ 需人工验证 | 未找到明显的 Service Worker / 离线缓存策略，需确认 |

---

## 8. AI Admin & 价值观（Section 9）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **AI-001** | 富有同情心的支持回复 | ❓ 需人工验证 | `lib/ai/glm.ts` + `admin/ai/conversations` + `AIFloatButton` 存在；prompt tone 必须人工审 |
| **AI-002** | 攻击性语言处理 | ❓ 需人工验证 | `admin/safety/page.tsx`、`safety/report` 存在；需验证 AI 边界设定与日志记录 |

---

## 9. 长者友好（Section 10）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **EF-001** | Large Text 全局生效 | ❌ 未实现 | **整套 Large Text Mode 未在代码库实现** |
| **EF-002** | 切换语言时保留无障碍设置 | ❌ 未实现 | 前置功能缺失 |

---

## 10. 财务与捐款（Section 11）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **FN-001** | 捐款成功流程 | ❌ 未实现 | 代码库**没有 `/donate` 路由**；今天刚做的 `demo/donate-demo.html` 仅是独立 demo，未集成 |
| **FN-002** | 失败支付优雅恢复 | ❌ 未实现 | 同上 |

---

## 11. 安全 / 性能 / 合规（Section 12）

| 用例 | 标题 | 状态 | 依据 / 缺口 |
| --- | --- | --- | --- |
| **SP-001** | 会话超时保护 | ❓ 需人工验证 | Auth 体系存在，需确认 session timeout 配置 |
| **SP-002** | 5000 并发负载测试 | ❌ 未实现 | 需要专门跑负载测试（k6 / Artillery），代码库无相关脚本 |

---

## 总览

| 状态 | 数量 | 用例 |
| --- | --- | --- |
| ✅ 已实现 | **5** | SU-001, SU-002, UA-002, CB-001, EM-001 |
| ⚠️ 部分实现 | **3** | ML-001, UA-001, PR-001 |
| ❓ 需人工验证 | **9** | ML-002, ML-003, CB-003, PR-002, EM-002, AI-001, AI-002, SP-001, FN-002* |
| ❌ 未实现 | **8** | SU-003, CB-002, RP-001, RP-002, EF-001, EF-002, FN-001, SP-002 |

> 注：FN-002 实际归类为 ❌（依赖 FN-001），合计 ❌ 应为 **8 项**，❓ 为 **8 项**。

---

## 建议优先级（按业务影响）

1. **P0 — 阻塞 UAT 的功能缺口**（必须做）
   - 捐款流程 `FN-001 / FN-002`：业务关键，且非营利属性核心
   - Large Text Mode `SU-003 / CB-002 / EF-001 / EF-002`：长者友好是产品定位的核心承诺
   - Representative 角色 `RP-001 / RP-002`：多角色是 V6 标题里强调的卖点

2. **P1 — 翻译补齐**
   - `messages/` 增加 `th.json`、`ja.json`，或先按 ML-003 做好缺失翻译的回退体验

3. **P2 — 验证类用例**
   - 9 个 ❓ 项需要在浏览器/真机实测，建议组织一次集中 UAT 跑测

4. **P3 — 性能负载**
   - SP-002 需要在 staging 上接 k6 脚本，可在 P0/P1 完成后再排

---

## 重要免责

- 本表的「✅ 已实现」**仅代表代码路径存在**，不代表通过验收标准（语气、SLA、UX 都需人工实测）。
- 「❌ 未实现」是基于 grep / 文件路径搜索结论，若功能藏在非常规命名下可能误判。
- UAT 通过状态请以实际测试执行结果为准——本文档只是「实施差距分析」。
