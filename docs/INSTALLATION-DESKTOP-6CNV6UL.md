# DESKTOP-6CNV6UL 安装配置记录

记录日期：2026-10-04，America/New_York。本文记录这台 Windows 电脑的实际 Bridge 安装位置、当前账号连接、启动方法和验证边界，供维护本机及配置第二台电脑时参考。

本机已恢复 Bridge 和 Tunnel，远端 `artifact_put` 已成功写入本机并通过读回校验。尚未执行 `codex_start`、目标项目任务执行和原 ChatGPT 会话回传测试，因此不能将整个派发流程标为全部完成。

## 验证状态

| 阶段 | 状态 | 证据和边界 |
| --- | --- | --- |
| PREPARED | 已具备 | 复用已有安装和构建产物；本轮没有重新安装依赖或更新 Skill |
| LOCAL_READY | 已验证 | 健康、桌面就绪、协议探测降级、MCP 初始化、三个工具、真实 artifact 写入和读回通过 |
| CHATGPT_CONNECTED | 通道已验证 | 当前账号连接的远端 artifact_put 成功落到本机；连接已改为含电脑名的名称 |
| 新会话工具定义核验 | 待完成 | 已操作 Refresh tools；尚未在新 ChatGPT 会话独立核验全部定义与 Skill 实际版本 |
| END_TO_END_VERIFIED | 待完成 | 尚未派发只读工程任务，也未验证执行和结果回传 |

这些是本次安装记录的事实，不是新的运行状态数据库或任务生命周期。

## 路由关系

```text
ChatGPT 中的 codex-dispatch Skill 组织交接指令
  → 选择 Codex Bridge - DESKTOP-6CNV6UL MCP 连接
  → 连接绑定的 Tunnel ID
  → 本机 tunnel-client
  → http://127.0.0.1:8787/mcp
  → 本机 Bridge
  → 当前 Codex 桌面的 App Tools
  → codex_start 指定的本地 workspace
```

Skill 规定交接格式和执行规则，不选择电脑。MCP 服务提供 `artifact_put`、`codex_start`、`codex_get` 三个工具；ChatGPT 连接绑定的 Tunnel 决定请求进入哪台电脑。`artifact_put` 在本机存储文本；只有 `codex_start` 才会创建工程任务。

第二台电脑可以使用相同 Skill 和相同 Bridge 程序，但应使用独立 Tunnel ID 和含电脑名的 MCP 连接名称。两台电脑各自使用 `127.0.0.1:8787` 不发生跨机器端口冲突。不要将本机 Tunnel ID 同时用于另一台电脑；本机 Bridge 的 MCP 会话保存在本进程内，不应把两个独立实例当作同一执行目标。

## 安装位置与版本

| 项目 | 本机实际值 |
| --- | --- |
| 电脑名 | `DESKTOP-6CNV6UL` |
| 安装仓库 | `E:\tools\codex-dispatch-kit` |
| 仓库远端 | `https://github.com/dingxifan/chatgpt-codex.git` |
| 本轮记录前仓库 HEAD | `b6e53491aff8b29d5ff1fa0175fbf1f1bec49197` |
| 实际运行目录 | `C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261001` |
| Bridge 入口 | 运行目录中的 `dist\src\index.js` |
| Bridge MCP 版本 | `0.3.1` |
| Node | `C:\Program Files\nodejs\node.exe`，`v24.19.0` |
| Tunnel 客户端 | `E:\tools\tunnel-client\tunnel-client.exe`，`0.0.14+0f870e50a973fa820d4c409000059e181e8d242b` |
| App Tools 适配器 | `C:\Users\Administrator\.codex\plugins\cache\openai-bundled\codex-app-tools\0.1.5\server.mjs` |
| 仓库 Skill 安装包版本 | `0.1.9`；本轮未重新安装，不能据此推定所有已打开会话加载的版本 |

运行目录的 `runtime-source.json` 记录基础源码提交 `20aae685ca8e7e8068871fb3b50c4fc2775081be`，并记录 `1b2bd3b1816f0d2669b8daef8ec9a136490f003e` 的协议探测降级补丁及 `74dbecc550e8b72d9192ea8d703f2d88196a1735` 的派发前 LINT 补丁。该目录是既有运行副本，不等于仓库当前 HEAD 的完整重新部署。

## 本地配置与账号绑定

| 配置 | 当前值 |
| --- | --- |
| Bridge 地址 | `127.0.0.1:8787` |
| MCP URL | `http://127.0.0.1:8787/mcp` |
| Tunnel alias 和 profile | `codex-bridge` |
| Tunnel 配置文件 | `C:\Users\Administrator\AppData\Roaming\tunnel-client\codex-bridge.yaml` |
| 当前 Tunnel ID | `tunnel_6ac08c4ec9a4819181465c316b0dec5b` |
| 当前 Platform 组织 | `org-UbCcd7M06t5Ulf1rUJpTLQtE` |
| Tunnel 关联的 ChatGPT workspace | `36f71485-599b-4ca7-905c-f0742e145596` |
| ChatGPT MCP 连接名称 | `Codex Bridge - DESKTOP-6CNV6UL` |
| ChatGPT MCP app ID | `asdk_app_6ac08f9b6f048191ab5fe6e1a1016e27` |
| 密钥引用 | `file:C:\Users\Administrator\AppData\Roaming\tunnel-client\secrets\codex-bridge-current-runtime.key` |

密钥由用户在当前组织创建，名称为 `Codex Bridge-Dev`，保存到上面的本机凭据文件。本文不包含密钥内容；文件只授予当前 Windows 用户和 SYSTEM 访问权限。运行 profile 存储的是 `file:` 引用，不应将密钥正文、Codex 桌面 pipe、thread 上下文值或会话令牌写入 Git。

当前 Tunnel 配置经实际检查包含正确的 Tunnel ID、MCP URL 和新密钥文件引用；`control_plane.organization_id` 未写入生成的 profile。启动命令传入 `--organization-id`，新密钥属于当前组织，远端验证已通过。不要把未写入的字段描述成已持久化。

## Bridge 运行参数

`start-bridge.ps1` 目前设置：

- `HOST=127.0.0.1`，`PORT=8787`，`CODEX_RPC_TIMEOUT_MS=60000`。
- `CODEX_WORKSPACE_ROOTS` 为 `E:\projects`、`E:\tools`、`E:\codex-bridge-lab`、`E:\Codex project\HACT Rebuild`。这是本机既有允许根目录；本轮没有扩大它们。
- `CODEX_AGENT_HANDOFF_ROOT=C:\Users\Administrator\.codex-agent-mcp\runtime-feasibility-20261001\handoff`。虽然 Bridge 运行目录名称不同，实际 artifact 根目录是这里。
- 使用前述 App Tools 适配器，继承当前桌面注入的 `CODEX_APP_TOOLS_PIPE_PATH`、`CODEX_MCP_NODE_PATH`、`CODEX_THREAD_ID`；仅检查这些值是否存在，不保存或重放它们。

目标项目仍需出现在当前桌面 `list_projects` 返回的本地项目路径中；允许根目录不等于已完成项目注册或已验证 dispatch。本次没有验证 file-extract 工程任务。

## 本机启动与检查

在有效的 Codex 桌面会话中执行既有启动脚本：

```powershell
& 'C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261001\start-environment.ps1'
```

脚本会启动或核对 Bridge 进程身份，确认 `/readyz`，再启动或检查 `codex-bridge` Tunnel。应看到 `process_running=true`、`healthy=true`、`ready=true`、`stale=false` 和 `bridge_environment=ready`。

```powershell
& 'E:\tools\tunnel-client\tunnel-client.exe' runtimes status codex-bridge --json
& 'C:\Program Files\nodejs\node.exe' 'E:\tools\codex-dispatch-kit\scripts\Test-Bridge.mjs' --url http://127.0.0.1:8787
```

第一个命令查询本地运行状态。第二个命令会写入一个验证 artifact 并核对内容和摘要，不调用 `codex_start` 或 `codex_get`，因此不是纯只读检查。不要把它的通过结果当作工程任务执行和回传证明。

当前安装没有新增开机服务、定时任务或自动重启程序。桌面上下文失效后，应从新的有效 Codex 桌面上下文重新建立 Bridge；先核对现有进程身份，不盲目终止或复用未知的 8787 监听者。现有运行脚本设置的 App Tools 路径是固定版本；升级后如文件不存在，应核对实际安装路径。

## 修复原因与变更

最初只读检查时，Bridge 和 Tunnel 均未运行。本机旧配置指向 `tunnel_6ab0c39621c08191a1e7117c845a38ca`，使用旧组织的 `codex-bridge-runtime.key`；当前 ChatGPT MCP 连接却指向上表中的新 Tunnel。

恢复旧服务后，当前远端工具仍返回 429。尝试将旧 Tunnel 接入当前 ChatGPT 账号时得到访问拒绝；用旧密钥和当前组织头访问新 Tunnel，得到 401 `mismatched_organization`。这证明当时本机凭据和当前连接不属于同一组织。没有找到原始 404 请求的完整 URL、方法和响应体，因此不能将后续证据追溯为原始 404 的唯一已确认原因，也不能断言两台电脑同时登录账号本身造成冲突。

本次修复完成以下必要变更：

1. 用户创建并保存当前组织的运行密钥。
2. 停止本机已确认的旧 `codex-bridge` Tunnel，使用同一 alias/profile 连接当前组织的 Tunnel，并保留 Bridge 运行进程。
3. 更新运行目录中的 `start-environment.ps1`，替换 Tunnel ID 和密钥文件引用，并传入当前组织 ID，避免下次启动重新连接旧目标。
4. 将既有 ChatGPT 连接重命名为 `Codex Bridge - DESKTOP-6CNV6UL`，操作 Refresh tools。未创建替代连接；此前创建尝试被拒绝。

未修改 Bridge 核心源码、全局 Codex 设置或 file-extract 仓库，也未启动 XLSX POC。

旧 `codex-bridge.yaml`、`start-environment.ps1` 和 `aliases.yaml` 的配置备份保存在本轮会话工作目录下的 `work\bridge-config-before-account-switch`：

```text
C:\Users\Administrator\Documents\Codex\2026-10-04\referenced-chatgpt-conversation-this-is-an\work\bridge-config-before-account-switch
```

旧密钥未删除。恢复旧配置只能用于旧账号对应的环境，不能解决当前账号的连接；不要把回退操作当作通用修复步骤。

## 验证证据与日志位置

本轮本地 `Test-Bridge.mjs` 验证通过；随后当前远端 MCP `artifact_put` 返回并实际写入：

```text
文件：C:\Users\Administrator\.codex-agent-mcp\runtime-feasibility-20261001\handoff\bridge-repair-verified-20261004.txt
大小：87 bytes
SHA-256：2dd2a202a56942ec8dfd6142b1c20d867fa9f85241824f94983af1e04fdacd51
```

本机 `Get-FileHash` 读回摘要与远端返回值一致。随后本地状态再次确认 running、healthy、ready，且不 stale。

| 日志或记录 | 路径 |
| --- | --- |
| Bridge 标准错误和输出 | 运行目录的 `logs\bridge.stderr.log`、`logs\bridge.stdout.log` |
| Bridge 进程身份 | 运行目录的 `data\process.json` |
| Tunnel 日志 | `C:\Users\Administrator\.local\state\tunnel-client\logs\codex-bridge.log` |
| Tunnel 本地运行记录 | `C:\Users\Administrator\.local\state\tunnel-client\processes.yaml`、`aliases.yaml` |

PID 和桌面会话上下文会变化；维护时实时核对，不把本文中的运行状态当作未来持续在线保证。

## 第二台电脑配置方法

沿用 [安装流程](../INSTALL.md) 和 [ChatGPT 连接说明](CONNECT-CHATGPT.md)，使用第二台电脑自己的实际路径。

1. 在当前 ChatGPT 账号对应的 Platform 组织创建第二台电脑独立的 Tunnel，并关联正确 ChatGPT workspace。
2. 为第二台电脑保存本机运行密钥，设置 Tunnels Read 和 Use。不要复制旧账号凭据，也不要共用本机 Tunnel ID。
3. 从第二台电脑有效 Codex 桌面上下文启动 Bridge，核对健康、就绪和目标本地项目。
4. 配置该电脑的 tunnel-client，使它自己的 profile、启动脚本中的 Tunnel ID、密钥文件引用与 ChatGPT 连接一致。MCP URL 可以同为 `http://127.0.0.1:8787/mcp`。
5. ChatGPT 为第二台电脑建立含电脑名的 MCP 连接，刷新工具并在新会话核验。Skill 可以共用；派发时选择目标电脑的 Bridge。
6. 用一小段远端 artifact 写入及本机读回核对目标电脑。之后由用户明确发起小型只读任务，验证派发、执行和回传，才能报告完整流程通过。

本机当前仍停在第 6 步的 artifact 通道验证；完整工程派发与回传测试尚待执行。
