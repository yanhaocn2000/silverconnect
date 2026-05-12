# Vercel → VPS 迁移：交接报告

> ⚠️ **历史记录**。仓库已迁到 **`github.com/yanhaocn2000/silverconnect`**（账号 `yanhaocn2000@163.com`）—— 本文档里出现的 `lesliezhili/silverconnect-global` 那个旧仓库**已删除**，下面引用它的命令仅作历史记录，别照着跑。当前权威信息见根目录 [DEPLOYMENT.md](../../DEPLOYMENT.md)。

**日期**：2026-05-10
**状态**：可逆部分已完成；剩 4 步需要用户操作（key 轮换、分支 reorg、首次部署、cron 安装）
**完整方案**：[migrate-vercel-to-vps.md](migrate-vercel-to-vps.md)

---

## 1. 已完成（不可见的部分）

### 1.1 VPS 现状探查

SSH 进 `47.236.169.73` 实测：

| 项 | 实测值 |
|---|---|
| OS | Ubuntu 24.04.4 LTS |
| Node / npm / PM2 | v20.20.2 / 10.8.2 / 7.0.1 |
| nginx | 1.24.0，`silverconnect` site 已启用 |
| ufw | 22 / 80 / 443 全开 |
| swap | 4G ✓ |
| 内存 | 894MB total，剩 74MB —— **build 不能在 VPS 跑** |
| `/opt/silverconnect` | 散文件（rsync 来的，不是 git 仓库） |
| PM2 进程 | `silverconnect` online，跑 May 5 build |
| 站点 | `http://47.236.169.73/zh/home` → 200 |

### 1.2 VPS `.env.local` 修复

补齐了 3 个关键变量：

| 变量 | 改动 | 为什么 |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` → `http://47.236.169.73` | 客户端 link 不再指 localhost |
| `SESSION_COOKIE_SECURE` | 缺失 → `false` | HTTP 部署下 iron-session cookie 否则写不进浏览器，登录立刻失败（[lib/auth/session.ts:38](../../lib/auth/session.ts#L38)） |
| `CRON_SECRET` | 缺失 → 64 hex（密码学随机） | `app/api/cron/*` 三个端点鉴权 |

- 备份在 VPS：`/opt/silverconnect/.env.local.bak.current`
- PM2 已 reload，`SESSION_COOKIE_SECURE` 已生效
- `NEXT_PUBLIC_APP_URL` 是 build-time 烘进 client bundle 的，**当前 PM2 跑的 May 5 build 里还是旧值**。下次部署 rebuild 后才生效

### 1.3 GitHub Actions workflow 重写

- 文件：[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)
- 触发：`push to main` + `workflow_dispatch`
- 流程：
  1. runner 上 checkout + Node 20 + `npm ci`
  2. SCP 拉 VPS `.env.local` 到 runner（runner 是 ephemeral，跑完销毁）
  3. `npm run build`
  4. tar 打包 `.next` + `public` + `package.json` + `package-lock.json` + 必要源码
  5. SCP tar 到 VPS `/tmp/sc-deploy.tar.gz`
  6. SSH 解压 + `npm ci --omit=dev` + `pm2 reload silverconnect --update-env`
  7. 健康检查（curl `/zh/home`），非 200 自动回滚到 `.next.prev`
  8. `if: always()` 删 runner 上的 `.env.local` 和 SSH key

只需要一个新 GitHub Secret：`VPS_SSH_KEY`（其余 host/user/path 硬编码在 workflow `env`）。

### 1.4 方案文档更新

[docs/zh/migrate-vercel-to-vps.md](migrate-vercel-to-vps.md) 已同步实际实现，包含：
- 架构图（VPS 主站 + Vercel 仅承担将来支付页 §3.3）
- 风险 & 已知坑（cookie secure / Supabase IP 白名单 / 内存等）
- 回滚方案

### 1.5 安全清理

- 你贴在聊天里的 RSA 私钥**已写到本地 `%TEMP%\sc-deploy\id_rsa`** 用于 SSH，部署完已删
- **但这把 key 仍然泄露**：聊天 transcript、Anthropic 服务端日志、本地 Claude Code session 记录里都有
- VPS `~/.ssh/authorized_keys` 里这把 key 还没撤销 —— 见 §3

---

## 2. 当前 VPS 状态

```
http://47.236.169.73/zh/home  →  200 (May 5 build, 旧版本)
```

仍然是 5 天前的代码，但站点活着。等下面 §3-§5 走完就切到最新 `feat/ui-rebuild` 代码。

---

## 3. 🟡 你需要做：轮换 SSH Key

**为什么必须做**：那把 RSA key 在聊天 transcript 里曝光过。即便是测试服，VPS 上 `.env.local` 现在装着生产 Supabase 凭证（`ukgolkaejlfhcqhudmve`）+ `SESSION_SECRET` + `GLM_API_KEY` 等，被人 SSH 上去 `cat .env.local` 就全拿走。

### 3.1 本机生成新 key（Windows PowerShell）

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\silverconnect-deploy" -N '""' -C "silverconnect deploy 2026-05-10"
icacls "$env:USERPROFILE\.ssh\silverconnect-deploy" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

### 3.2 把新公钥推到 VPS，删旧 RSA key

用旧 key 还能登（部署期我用的就是它）：

```powershell
# 把新公钥推上去
$pub = Get-Content "$env:USERPROFILE\.ssh\silverconnect-deploy.pub"
ssh root@47.236.169.73 "echo '$pub' >> ~/.ssh/authorized_keys"

# 验证新 key 能登
ssh -i "$env:USERPROFILE\.ssh\silverconnect-deploy" root@47.236.169.73 "whoami"
# 输出 root 即可

# 删掉旧 RSA key 那行（VPS 上找到 type ssh-rsa 的行删掉）
ssh -i "$env:USERPROFILE\.ssh\silverconnect-deploy" root@47.236.169.73 "sed -i '/ssh-rsa /d' ~/.ssh/authorized_keys && wc -l ~/.ssh/authorized_keys"

# 确认旧 key 失效
ssh -i "<旧 RSA key 路径>" root@47.236.169.73 "echo should fail"
# Permission denied (publickey) 就对了
```

> 如果 `~/.ssh/authorized_keys` 里有多行 `ssh-rsa`，先列出来看清楚再删：
> `ssh -i ... root@47.236.169.73 "grep -n ssh-rsa ~/.ssh/authorized_keys"`

### 3.3 把新私钥写入 GitHub Secret

```powershell
gh secret set VPS_SSH_KEY < "$env:USERPROFILE\.ssh\silverconnect-deploy"
gh secret list  # 验证 VPS_SSH_KEY 在列
```

或者打开 https://github.com/lesliezhili/silverconnect-global/settings/secrets/actions 手动粘贴。

---

## 4. 🟡 你需要做：分支 Reorg

按你 memory 里的计划：`main → legacy-old`，`feat/ui-rebuild → main`。

**这步是破坏性的**：会改写 GitHub 上 `main` 的提交历史，所有本地 clone 该仓库的人下次 pull 会冲突。如果只有你一个人在改，无所谓；如果团队里别人也在改，先通知。

### 4.1 GitHub 上重命名

```powershell
# 在仓库根目录
gh api -X POST /repos/lesliezhili/silverconnect-global/branches/main/rename -f new_name=legacy-old
gh api -X POST /repos/lesliezhili/silverconnect-global/branches/feat/ui-rebuild/rename -f new_name=main
```

也可以在 GitHub UI: Settings → Branches → 改默认分支前后操作。

> GitHub 的 rename API 会自动：
> - 更新所有 PR 的 base/head
> - 设置 redirect（旧分支名引用还能跳转）
> - 更新默认分支指针

### 4.2 本地同步

```powershell
git fetch origin --prune
git branch -m feat/ui-rebuild main 2>$null  # 已经在 feat/ui-rebuild 上则改名为 main
git branch --set-upstream-to=origin/main main
git remote set-head origin --auto
```

### 4.3 触发首次部署

分支 reorg 完成的瞬间不会自动触发 deploy（因为 push 事件没产生）。手动触发：

```powershell
gh workflow run "Deploy to VPS" --ref main
gh run watch
```

或者随便 commit 一个空提交：

```powershell
git commit --allow-empty -m "chore: trigger first VPS deploy"
git push origin main
```

### 4.4 验证

```powershell
gh run list --workflow="Deploy to VPS" --limit 3
# Build → SCP → reload 一气呵成 ~3-5 分钟

# 部署完后开浏览器
start http://47.236.169.73/zh/home
```

如果 workflow 失败：
- `gh run view <id> --log-failed` 看具体哪步炸
- VPS 上 `pm2 logs silverconnect --lines 50` 看 next 是否起来
- 自动回滚到 `.next.prev` 应该已生效，站点依然是 May 5 build

---

## 5. 🟡 你需要做：装 Cron 任务（可推迟）

`app/api/cron/*` 三个端点之前由 Vercel Cron 调度（虽然 `vercel.json.crons` 是空的，但代码里有路由）。VPS 上要补 systemd / crontab。

### 5.1 在 VPS 装封装脚本

```bash
ssh -i ~/.ssh/silverconnect-deploy root@47.236.169.73

cat > /opt/silverconnect/cron-call.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
# Read CRON_SECRET from .env.local
export $(grep '^CRON_SECRET=' /opt/silverconnect/.env.local | xargs)
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000$1" > /dev/null
EOF

chmod 700 /opt/silverconnect/cron-call.sh
chown root:root /opt/silverconnect/cron-call.sh
```

### 5.2 写 `/etc/cron.d/silverconnect`

```bash
cat > /etc/cron.d/silverconnect <<'EOF'
# SilverConnect cron tasks (replaces Vercel Cron)
# Format: m h dom mon dow user command
*/15 * * * * root /opt/silverconnect/cron-call.sh /api/cron/cancel-stale
0    * * * * root /opt/silverconnect/cron-call.sh /api/cron/recurring-bookings
*/30 * * * * root /opt/silverconnect/cron-call.sh /api/cron/sla-disputes
EOF
chmod 644 /etc/cron.d/silverconnect

# 验证
systemctl restart cron
grep CRON /var/log/syslog | tail -5
```

频率是建议值，落地前看每个 route handler 实际是否幂等。

---

## 6. 🟡 你需要做：Vercel 项目处理

按方案 §3.3，Vercel 项目**保留**用于将来 Stripe HTTPS webhook + 支付页：

1. 登 https://vercel.com/yanhaoau-1392s-projects
2. 项目 `silverconnect-one`（或你看到的那个） → Settings → General → Project Name 改成 `silverconnect-pay`，避免误访问
3. Settings → Deployment Protection → 给生产域名加 Password Protection（防客户误登）
4. （**暂不动**）Stripe webhook URL 等 `app/api/stripe/webhook` 真接入时再切

旧 Vercel URL 可以加根路径重定向到 VPS（Settings → Redirects），但不是必要的。

---

## 7. 风险 / 注意

| 项 | 说明 |
|---|---|
| **当前那把 RSA key 还活着** | §3 没做完之前任何看过 transcript 的人都能登 VPS。优先级最高 |
| 内存紧张 | VPS 894MB，build 时 Node 容易 OOM，所以现在 build 都在 GitHub runner 跑。VPS 只跑 next start（几十 MB） |
| 浏览器对 HTTP-only 的限制 | 长期建议绑域名 + Let's Encrypt。`SESSION_COOKIE_SECURE=false` 是临时方案，HTTP session 易被网络嗅探 |
| Vercel 与 VPS 代码漂移 | Vercel 不再自动同步主线，等真正接 Stripe 时再补 [.github/workflows/deploy-vercel-pay.yml](../../.github/workflows/deploy-vercel-pay.yml)（方案 §3.3 已起草） |
| 分支 reorg 通知协作者 | 如果有别人 clone 仓库，他们 pull 会因 history 改写报错。让他们 `git fetch && git reset --hard origin/main` |

---

## 8. 自评审记录（iterative-review skill）

| 阶段 | 产出 | 评审结果 |
|---|---|---|
| 1 | VPS env 修复 | ✅ 通过；修复 1 项（CRON_SECRET 改用密码学随机源）；备份文件因 heredoc 转义损坏 → 重建 post-change 备份 |
| 2 | deploy.yml | ✅ 通过；修复 1 项（删除冗余 tar fallback） |
| 3 | cron 配置 | 推迟到 §5（VPS 改动需用户授权） |
| 4 | 文档同步 | ✅ 通过 |
| 5 | 分支 reorg + 首次部署 | 推迟到 §3-§4（破坏性，需用户授权） |

---

## 9. 你醒来后建议执行顺序

1. 先扫一眼这份报告（5 分钟）
2. 做 §3 轮换 key —— **优先级最高**（30 秒生成 + 30 秒推上去）
3. 做 §4 分支 reorg + 首次部署 —— 看 `gh run watch` 验证（5 分钟）
4. 浏览器开 `http://47.236.169.73/zh/home` 抽检几个页面
5. 做 §5 cron（可推迟，不影响主站功能）
6. 做 §6 Vercel rename（可推迟）

中间任何一步出问题，方案 §5（[migrate-vercel-to-vps.md](migrate-vercel-to-vps.md#5-回滚方案)）有回滚指南；workflow 也有自动 `.next.prev` 回滚。

---

## 10. 部署通道决策

**2026-05-10 决议**：从 GitHub Actions push-to-deploy **切换到本地 PowerShell 直推**。

### 起因

- `feat/ui-rebuild → main` reorg 后首次 push 触发的 workflow 在 24s 挂掉（exit 255，run #3，commit 17f48c36）
- 几乎肯定是 `VPS_SSH_KEY` secret 粘贴格式问题（缺首尾标记 / Windows 换行符）
- 没本地 `gh auth`，失败排查得绕 web UI；secret 错了再粘一次又是同样格式风险

### 决策

| 维度 | 本地直推（采用） | GitHub CI/CD |
|---|---|---|
| Secret 管理 | 无（脚本读本地 `~\.ssh\silverconnect-deploy`） | `VPS_SSH_KEY` secret |
| 失败排查 | 本地 stdout 直接看 | Actions log（要 web UI 或 gh CLI） |
| 触发方式 | `.\scripts\deploy.ps1` 主动跑 | push 自动 |
| Build 环境 | Windows 本机（非纯净） | Ubuntu runner（每次干净） |
| 适用阶段 | 单人测试服 + 反复迭代 | 多人 / 生产上线 |

测试期单人 + 频繁调试，本地通路省 GitHub 那道环。多人或上线前再切回 CI/CD（把 `on: push` 加回 [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) + 修好 secret 即可）。

### 日常用法

```powershell
# 全量
.\scripts\deploy.ps1

# 跳过 build（重推已构建的 .next）
.\scripts\deploy.ps1 -SkipBuild

# 只 build + tar，不推 VPS
.\scripts\deploy.ps1 -DryRun

# 自定义 SSH key
$env:SC_DEPLOY_KEY = 'C:\path\to\key'
.\scripts\deploy.ps1
# 或
.\scripts\deploy.ps1 -KeyPath 'C:\path\to\key'
```

脚本逻辑 = workflow 同款：拉 VPS `.env.local` → `npm ci` → `npm run build` → tar → SCP → 远端 `.next.prev` 备份 + 解压 + `npm ci --omit=dev` + `pm2 reload` + 健康检查 + 失败回滚。

### Workflow 现状

[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) `on:` 改为只 `workflow_dispatch`。push 不再触发。手动触发仍可用（前提是 `VPS_SSH_KEY` secret 修对），作为备份通路。

---

*报告生成时间：2026-05-10*
