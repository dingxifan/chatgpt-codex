# Desktop Bridge 环境基线与执行记录

日期：2026-10-06，America/New_York。范围：核实仓库、目录、中央路由和既有运行配置；修正文档中的当前路径。未修改 execution profile、sandbox、审批设置或 Bridge 派发逻辑。

## 唯一维护关系

| 项目 | 核实值 |
| --- | --- |
| Canonical repo | `dingxifan/chatgpt-codex` |
| origin fetch / push | `https://github.com/dingxifan/chatgpt-codex.git` |
| Canonical workspace / Git 根 | `E:\tools\codex-from-chatgpt` |
| 默认分支 | `main` |
| 本轮开始 HEAD / 远端 main | `de39bfc31b045cd3a8d1ab347dd3de8bb09112e2`，开始时 Git 干净 |
| Codex Desktop 项目 | `Codex Bridge Codex`，API 返回路径与 canonical workspace 精确一致 |
| Windows hostname | `DESKTOP-6CNV6UL` |
| 中央 Route ID / Computer | `codex-from-chatgpt` / `DESKTOP_6CNV6UL` |
| Bridge namespace | `Codex_Bridge___DESKTOP_6CNV6UL` |
| 当前连接身份 | 工具目录暴露 Desktop connector，规范化工具前缀 `mcp__codex_apps__codex_bridge___desktop_6cnv6ul__codex_bridge_desktop_6cnv6ul_` |

中央路由唯一权威仍是 [GitHub main/config/CODEX_WORKSPACE_ROUTING.md](https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md)。Route 1 已由 [PR #4](https://github.com/dingxifan/chatgpt-codex/pull/4) 修正并合并；本轮实际 GET 返回 HTTP 200，完整内容与本地表一致，无需再次改路由。每次新派发仍重新读取，本文不替代中央表。

`E:\tools` 实际有 `codex-from-chatgpt` 和 `tunnel-client` 两个目录；后者是所用 Tunnel 客户端，保留。旧维护路径已不存在。Bridge 上游 `joseanu/codex-from-chatgpt` 仅是源码来源，保留 SOURCE.md、包元数据和原始许可，不将其作为本机维护 origin。

## 当前服务与配置

| 项目 | 核实值 |
| --- | --- |
| 实际 Bridge 运行目录 | `C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261001` |
| 实际入口 / MCP URL | 运行目录下 `dist\src\index.js` / `http://127.0.0.1:8787/mcp` |
| 启动入口 | 运行目录下 `start-environment.ps1`，从有效 Codex Desktop 上下文运行 |
| artifact 根 | `C:\Users\Administrator\.codex-agent-mcp\runtime-feasibility-20261001\handoff` |
| Tunnel alias / ID | `codex-bridge` / `tunnel_6ac08c4ec9a4819181465c316b0dec5b` |
| Tunnel profile | `C:\Users\Administrator\AppData\Roaming\tunnel-client\codex-bridge.yaml`，目标为上述 8787 MCP URL |
| 仓库本地安装配置 | `.local/bridge.json`：workspaceRoots 仅含 canonical workspace；port 为 `18787`，本轮无该端口监听 |

仓库本地安装配置与实际 8787 服务是不同的安装副本，不能把 `.local/bridge.json` 当作运行中的服务配置。运行脚本既有 allowlist 包含 `E:\tools`，目标还须是 Desktop API 暴露的项目；本轮已核实精确项目路径，未扩大或重设 allowlist。维护仓库不等于运行副本；保留 runtime-source.json 中的历史 source workspace 和提交来源，不伪称重新部署或重写来源事实。

本轮检查运行脚本、Tunnel profile、全局 config.toml 和本地／已安装 codex-dispatch 文件，未发现旧维护路径仍被这些配置使用。不删除历史材料、同步 Project sources 或旧凭据，也不重启服务。

## 验证命令与结果

以下 Git 与文件命令从 `E:\tools\codex-from-chatgpt` 执行。

| 命令或观察 | 实际结果 |
| --- | --- |
| `Get-ChildItem E:\tools -Force` | 两个上述目录；旧维护目录不存在 |
| `git rev-parse --show-toplevel`；`git remote -v` | Git 根与 origin fetch/push 均为上述 canonical 值 |
| `git branch --show-current`；`git rev-parse HEAD`；`git status --short --branch` | 初始 main，HEAD 如上，无改动 |
| `git ls-remote origin HEAD refs/heads/main`；`git fetch origin` | 远端默认 main，开始 SHA 与本地一致 |
| `list_projects` | `Codex Bridge Codex` 的主路径精确匹配 canonical workspace |
| `Invoke-WebRequest https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md` | HTTP 200；完整内容按 LF 规范化后与本地一致 |
| `Get-NetTCPConnection -State Listen`；按 OwningProcess 查询进程身份 | 8787 所属进程使用上述独立运行目录；18787 未监听 |
| `Invoke-RestMethod http://127.0.0.1:8787/healthz` | `ok=true` |
| `Invoke-RestMethod http://127.0.0.1:8787/readyz` | `ready=true`，`desktop_connected=true` |
| `& E:\tools\tunnel-client\tunnel-client.exe runtimes status codex-bridge --json` | `runtime_state=ready`，`healthy=true`，`stale=false`，Tunnel ID 与既有 profile 一致 |
| MCP initialize + tools/list（只读） | 仅 artifact_put、codex_start、codex_get；codex_start 入参仍为 workspace、prompt；与当前 Desktop connector 工具目录一致 |
| `node --check scripts/Test-Bridge.mjs` | PASS |
| `node scripts/Test-Bridge.mjs --url http://127.0.0.1:8787` | PASS：健康、桌面就绪、协议探测降级、初始化、三个工具及真实 artifact 写入／读回 |
| `git diff --check` | PASS |

验证 artifact 保留在 `C:\Users\Administrator\.codex-agent-mcp\runtime-feasibility-20261001\handoff\installation-check-79d2535d-64c3-45b7-bd40-9557a563ee2d.txt`。此脚本会写测试文件；本轮未调用 codex_start 或 codex_get，未执行新的工程派发或回传测试，不把本地通道验证报告成 ChatGPT 端到端验收。

## 本轮变更与交付

- 新建本基线，并在 README 和 Desktop 安装记录中链接。
- 更正 Desktop 安装记录的维护位置及 Test-Bridge 命令；2026-10-04 的版本／验收结果明确标为历史快照。
- 中央迁移验证记录的旧维护目录明确标为已停用历史，保留原提交与测试事实。
- Test-Bridge 的 MCP 客户端名称改为 `codex-from-chatgpt-verification`；仅清理旧标识，不改变工具或测试行为。
- 使用 `fix/desktop-environment-baseline-20261006` 分支，经 PR 合并 main；不直接推 main。PR、最终 merge SHA 及合并后本地／远端 SHA、干净状态的实际结果由交付报告记录，本文不预先声称这些发布步骤已完成。

合并后复核命令：`git fetch origin`、`git switch main`、`git merge --ff-only origin/main`、`git rev-parse HEAD`、`git ls-remote origin refs/heads/main`、`git status --porcelain`，以及再次读取 canonical raw URL 比较中央表全文。运行状态是本次快照，未来维护时应重新核实。
