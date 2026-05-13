# 给 Claude Code agent 的指令:为本项目接入 code-review-graph

> 这份文档由用户发给你执行。请按顺序完成,每一步做完简短回报,出问题立即停下问用户。

## 你要做什么

为**当前项目**接入 [code-review-graph](https://github.com/tirth8205/code-review-graph) MCP 服务,让用户后续能用图谱做 review、查依赖、查 blast radius。

工具本身**已经在用户机器上全局装好了**,你**不要重新安装**——直接用现有二进制。

## 必读:Windows 上的关键 bug(已踩过)

**code-review-graph v2.3.x 在 Windows 上的默认 ignore 规则失效**,会把 `node_modules`、`dist`、`target` 等几万个文件全部索引,导致 build 跑几十分钟、DB 膨胀到 GB 级。

**根因**:`code_review_graph/incremental.py` 的 `_should_ignore` 用 `PurePosixPath(path).parts` 切分路径,Windows 上 `Path.relative_to(...)` 返回的字符串用 `\` 分隔,PosixPath 不识别,导致默认的 `node_modules/**`、`dist/**` 等规则全部匹配不到。

**绕过方法**:在项目根写一个 `.code-review-graphignore`,用 fnmatch 一星通配 `*\dir\*` 和 `*/dir/*` 双向各写一遍。详见步骤 3。

## 执行步骤

### 步骤 0:在 PowerShell 里设好几个变量,后面都复用

```powershell
# 项目根 — 假设你已 cd 到项目根。如果没有,先 cd
# 所有路径都用 / 分隔(避免 JSON 里 \ 被当作转义字符)
$REPO     = (pwd).Path -replace '\\','/'
$CRG_BIN  = ((Get-Command code-review-graph -ErrorAction Stop).Source) -replace '\\','/'
$UV_TOOLS = (uv tool dir) -replace '\\','/'
$CRG_PY   = "$UV_TOOLS/code-review-graph/Scripts/python.exe"

"REPO     = $REPO"
"CRG_BIN  = $CRG_BIN"
"UV_TOOLS = $UV_TOOLS"
"CRG_PY   = $CRG_PY"

# 健康检查 — 都必须存在,否则停下问用户
Test-Path $CRG_BIN   # → True
Test-Path $CRG_PY    # → True
```

如果任一为 False 或命令报错,**停下问用户**——可能工具没装,或者 uv tool 路径变了。

### 步骤 1:写最小 MCP 配置

让 init 显式知道 repo 在哪,避免被嵌套 .git 误导:

```powershell
& $CRG_BIN init --repo $REPO --no-skills --no-hooks --no-instructions -y
```

这会生成 `.mcp.json` 和 `.gitignore`(只追加 `.code-review-graph/` 一行,不会覆盖现有规则),不写 CLAUDE.md / hooks / skills。

**完成后立即用绝对路径覆盖 `.mcp.json`**(默认配置在 Windows 上不可靠,会被嵌套 `.git` 误导走错图谱):

```powershell
$mcp = @"
{
  "mcpServers": {
    "code-review-graph": {
      "command": "$CRG_BIN",
      "args": ["serve", "--repo", "$REPO"],
      "env": {
        "CRG_REPO_ROOT": "$REPO",
        "PYTHONUTF8": "1"
      },
      "type": "stdio"
    }
  }
}
"@
# 用 UTF-8 无 BOM 写入(PS 5.1 的 Set-Content -Encoding utf8 会带 BOM,JSON parser 可能不接受)
[System.IO.File]::WriteAllText("$REPO/.mcp.json", $mcp, (New-Object System.Text.UTF8Encoding $false))
Get-Content "$REPO/.mcp.json"
```

### 步骤 2:写 `.code-review-graphignore`

下面这份用 here-string 写到项目根。如果项目里有特殊目录要排除,按相同格式 `*\<名字>\*` + `*/<名字>/*` 双向各加一行(单向写在 Windows 上会漏)。

```powershell
$ignore = @'
# 依赖 / 构建产物
*\node_modules\*
*/node_modules/*
*\dist\*
*/dist/*
*\target\*
*/target/*
*\build\*
*/build/*
*\out\*
*/out/*

# 嵌套 git / IDE
*\.git\*
*/.git/*
*\.idea\*
*/.idea/*
*\.vscode\*
*/.vscode/*

# 通用噪声
*.min.js
*.min.css
*.map
*.bcmap
'@
[System.IO.File]::WriteAllText("$REPO/.code-review-graphignore", $ignore, (New-Object System.Text.UTF8Encoding $false))
```

**项目特定建议**(看你项目实际情况追加):
- Java/Spring 项目:`src/main/resources/static/` 经常装捆绑的第三方 JS/CSS,如果是,加 `*\static\*` + `*/static/*`(或更精确的路径)
- 前端项目:常见的 `coverage/`、`.next/`、`.nuxt/`、`storybook-static/`、`.turbo/`、`.parcel-cache/`
- monorepo:确认 `*\node_modules\*`/`*/node_modules/*` 这种**穿透式**规则覆盖了所有子包(它们已经在模板里)
- 代码生成产物:Maven 的 `generated-sources/`、Go 的 `*.pb.go`、Protocol Buffers 的 `*_pb2.py`、Rust 的 `OUT_DIR` 等

### 步骤 3:干跑验证文件数(关键,必做)

避免再踩"40000 文件白跑半小时"的坑。把脚本写到 temp,用工具自带的 Python 跑(系统 Python 没有 tree-sitter binding):

```powershell
# Python 的 Path() 在 Windows 上接受 / 分隔,所以下面所有路径都直接用 $REPO/$UV_TOOLS 原样插
$dryrun = @"
import sys
sys.path.insert(0, r'$UV_TOOLS/code-review-graph/Lib/site-packages')
from pathlib import Path
from code_review_graph.incremental import _load_ignore_patterns, _should_ignore
from code_review_graph.parser import CodeParser

REPO = Path(r'$REPO')
patterns = _load_ignore_patterns(REPO)
parser = CodeParser()
kept = ignored = no_lang = 0
buckets = {}
for p in REPO.rglob('*'):
    if not p.is_file(): continue
    rel = str(p.relative_to(REPO))
    if _should_ignore(rel, patterns):
        ignored += 1; continue
    try:
        if parser.detect_language(p) is None:
            no_lang += 1; continue
    except Exception:
        no_lang += 1; continue
    kept += 1
    seg = rel.replace('\\','/').split('/')[0]
    buckets[seg] = buckets.get(seg, 0) + 1

print(f'KEPT (will be parsed): {kept}')
print(f'IGNORED:               {ignored}')
print(f'NO LANG:               {no_lang}')
print('Top dirs of kept:')
for d, c in sorted(buckets.items(), key=lambda x: -x[1])[:10]:
    print(f'  {c:>5} {d}')
"@
[System.IO.File]::WriteAllText("$env:TEMP\dryrun_crg.py", $dryrun, (New-Object System.Text.UTF8Encoding $false))
& $CRG_PY "$env:TEMP\dryrun_crg.py"
```

**判定标准**(先看输出再决定):
- `KEPT < 5000` → 健康,可以直接 build
- `5000 ≤ KEPT < 15000` → 可以,build 可能要 5-15 分钟
- `KEPT ≥ 15000` → **停**。.code-review-graphignore 不够严,继续 build 会浪费时间。检查 "Top dirs of kept" 找出大头,补 ignore 再来一次干跑
- "Top dirs of kept" 出现 `node_modules`、`dist`、`vendor`、`target`、`build` 等任意一个 → **停**,ignore 没匹配上,**修 ignore 别 build**

### 步骤 4:Build(分两段)

第一段:不带后处理的快速 build,出可用图:

```powershell
& $CRG_BIN build --repo $REPO --skip-postprocess
```

观察末行类似 `Full build: X files, Y nodes, Z edges (postprocess=none)`,记下数字。`X` 应**和步骤 3 的 KEPT 接近**(差 ±20% 内正常,差距大说明 ignore 与实际解析行为不一致)。

第二段:补后处理(FTS / 社区 / flow):

```powershell
& $CRG_BIN postprocess --repo $REPO
```

**异常停车信号**(出现任意一个就停下问用户,**不要硬等**):
- build 在 `Schema migrations complete` 之后超过 5 分钟没看到 `Progress:` → 卡死了
- DB 文件 `<repo>/.code-review-graph/graph.db` 超过 500 MB 而 KEPT < 5000 → ignore 没生效或解析爆炸
- postprocess 超过 30 分钟没出 `Post-processing:` 总结行 → 边数太多,**Ctrl+C 停下**。`postprocess` 命令本身没有 skip 选项,降级方案是删 `.code-review-graph/graph.db*` 三个文件,改成 `& $CRG_BIN build --repo $REPO --skip-flows`(只跳过社区/flow,保留 FTS),用户能用 callers/blast-radius/搜索,只是没社区聚类
- 看到任何 Python traceback → 立即停下贴给用户

**重新跑**:如果 build 失败或被中断,稳妥做法是先删 `<repo>/.code-review-graph/graph.db*` 三个文件(graph.db / graph.db-shm / graph.db-wal)再重跑——半成品 DB 可能让后续命令报奇怪的错。

### 步骤 5:验证

```powershell
& $CRG_BIN status --repo $REPO
```

应输出 `Nodes: ...`、`Edges: ...`、`Files: ...`、`Languages: ...`。两条质量校验:
1. **Files 数应和步骤 3 的 KEPT 接近**(差 ±20% 内),否则说明 ignore 与真实解析行为不一致
2. **Languages 列表里不应出现项目根本不用的语言**——比如纯 Java 项目里冒出 `php`/`go`/`c`/`cpp`,通常是第三方/捆绑代码混进来了,回头补 ignore

### 步骤 6:报告给用户

按这个格式:

```
✅ code-review-graph 接入完成
- 索引文件: <Files>
- 节点 / 边 : <Nodes> / <Edges>
- graph.db: <repo>/.code-review-graph/graph.db, <Z> MB
- build 总耗时: <T> 分钟(parse <T1> + postprocess <T2>)
- Languages: <list>

下一步:**完全重启 Claude Code**(关掉所有窗口再开),在项目根目录打开新会话。
新会话里用户问图谱相关问题时,你将能调用 code-review-graph MCP 工具回答。
```

## 不要做的事

- ❌ 不要 `git commit` 任何东西。`.mcp.json` 和 `.code-review-graphignore` 是**本地配置**,只在本机生效
- ❌ 不要 `git push`
- ❌ 不要 `git init`(会被项目自己已有的 .git 或父目录的 .git 误识别成根)
- ❌ 不要修改用户的全局 `~/.claude.json` 或 `~/.claude/settings.json`,只动当前项目的 `.mcp.json`
- ❌ 不要尝试装 `pipx`、重装 `uv`、升级 `code-review-graph`,工具版本就用现有的
- ❌ build 过程中不要中断,**除非**出现上面说的"异常停车信号"
- ❌ 不要给项目里写 CLAUDE.md / 注入新的 hooks / 添加 skills 文件(`init` 命令的 `--no-*` 参数就是为了避免这些;如果你看到这些文件被生成,说明命令参数错了,需要回滚)
- ❌ 不要把 `.code-review-graph/`(图谱数据目录)的内容贴给用户,体积很大且无意义

## 参考:已验证项目的对照数据

为校验你的结果是否合理,这里给一个已成功接入项目的数据(中等规模 Spring Boot + Vue 单仓):

| 项 | 数值 |
|---|---|
| 索引文件 | 2,734 |
| 节点 / 边 | 31,138 / 137,336 |
| graph.db | ~190 MB |
| build 时间(parse-only) | 2 分 35 秒 |
| postprocess 时间 | 6 分 30 秒 |

**判断你项目的合理范围**:
- 文件数差一个量级是正常的(几百到上万都可能)
- 但 节点/边 比例和 build 时间应在同一量级:每千文件解析约 1 分钟、postprocess 时长 2-3 倍于 parse
- 如果你的 build 时间是上面的 5 倍以上,几乎肯定是 ignore 没做好,回去检查
