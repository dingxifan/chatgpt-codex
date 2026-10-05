# LAPTOP-H80BPPA5 安装配置记录

记录日期：2026-10-05，Asia/Shanghai。本文记录这台 Windows ARM64 电脑的实际安装、独立 Tunnel、启动方法和同步验证结果。路径和账号资源 ID 仅用于维护定位；不包含 API 密钥、桌面 pipe、桌面会话上下文值或登录令牌。

## 当前状态与验证边界

| 阶段 | 已确认事实 | 尚未确认的范围 |
| --- | --- | --- |
| PREPARED | 本地仓库已快进到 `670716cbabdf732f143e37232d6846f3b460a2ec`；本地 Skill 更新为 v0.1.10；已构建插件 ZIP | ZIP 生成本身不代表账号插件安装 |
| LOCAL_READY | 实际 Bridge 健康、桌面就绪、协议探测降级、MCP 初始化、三个工具、artifact 写入及读回通过 | 桌面或电脑重启后的恢复需重新检查 |
| 派发前 LINT | 更新后实际 MCP 服务拒绝无结构 prompt，返回 `DISPATCH_LINT_FAILED`、9 项问题且无 job_id | 该校验不证明来源标题真实，也不证明接收任务后续回传成功 |
| CHATGPT_CONNECTED | 已建立本机独立连接；升级前及升级后远端 artifact_put 均成功写入本机并校验摘要 | 更新后的工具目录核验结果见下文 |
| END_TO_END_VERIFIED | 已通过本机连接创建一次“信息采集”只读任务 | 本记录尚未读取或确认任务实际执行与结果回传；不能标为全部通过 |

上述结论是本次验证快照，不是持续在线保证。没有新增开机服务、定时任务、自动重派或自动 Job 查询。

## 路由与本机配置

```text
ChatGPT codex-dispatch Skill
  → Codex Bridge - LAPTOP-H80BPPA5
  → 本机独立 Tunnel
  → 本机 tunnel-client
  → http://127.0.0.1:8787/mcp
  → Bridge
  → 当前 Codex 桌面 App Tools
  → 派发时明确指定的已保存项目
```

| 项目 | 实际配置 |
| --- | --- |
| 电脑名 / 平台 | `LAPTOP-H80BPPA5` / Windows ARM64 |
| 仓库及运行根目录 | `C:\Users\adpks\Documents\Codex\2026-10-03\sites-plugin-sites-openai-curated-remote\work\chatgpt-codex` |
| Git 远端 / 分支 | `https://github.com/dingxifan/chatgpt-codex.git` / `main` |
| 本次部署源码提交 | `670716cbabdf732f143e37232d6846f3b460a2ec`，本记录的后续文档提交不改变该源码 |
| Bridge 入口 / MCP 版本 | `bridge\dist\src\index.js` / `0.3.1` |
| Node | `v24.19.0`；Bridge 使用当前桌面注入的 `CODEX_MCP_NODE_PATH` |
| 本地 Skill | `C:\Users\adpks\.agents\skills\codex-dispatch\SKILL.md`，v0.1.10，与本次仓库源文件摘要一致 |
| 当前 Codex 远程插件缓存 | `codex-dispatch` v0.1.10；内容与仓库源文件一致，字节摘要差异仅来自 CRLF/LF |
| 插件包 | `out\codex-dispatch-v0.1.10.zip`，本地生成，不提交 ZIP |
| 本地配置 | `.local\bridge.json` |
| MCP 地址 | `http://127.0.0.1:8787/mcp`，只监听本机 |
| artifact 根目录 | `.local\handoff`，相对仓库根目录 |
| allowedHosts | 空数组；未增加通配 Host |
| Tunnel 客户端 | 同级 `..\tools\tunnel-client\tunnel-client.exe` |
| Tunnel 客户端版本 | `0.0.15+a390c168ff1b2d14e73a95991c186c6aba3ff5a0` |
| Tunnel profile | `codex-bridge-laptop-h80bppa5` |
| Profile 文件 | `.local\tunnel-profiles\codex-bridge-laptop-h80bppa5.yaml` |
| 本机独立 Tunnel ID | `tunnel_6ac309f4e2248191916e05a91326990e` |
| Platform 组织 | `org-UbCcd7M06t5Ulf1rUJpTLQtE` |
| 关联 ChatGPT workspace | `36f71485-599b-4ca7-905c-f0742e145596` |
| ChatGPT 连接名称 | `Codex Bridge - LAPTOP-H80BPPA5` |
| ChatGPT MCP app ID | `asdk_app_6ac30de7b2408191a63830d0a6070644` |
| Bridge 身份验证 | No authentication；Tunnel 使用运行密钥和账号访问关联 |
| Tunnel 健康检查 | 本次为 `http://127.0.0.1:8080/healthz` 与 `/readyz`；实际地址以当前 health.url 文件为准 |

这台电脑不应再启动指向 `DESKTOP-6CNV6UL` Tunnel 的历史脚本。两台电脑使用各自独立 Tunnel；相同的本地 8787 端口不会跨机器冲突。

## 项目允许列表

`.local\bridge.json` 保存以下五个绝对路径。本次已与桌面已保存项目核对；派发时仍需选择准确项目，不以允许列表代替项目选择。

| 项目 | 工作区 |
| --- | --- |
| Auchi | `D:\development\auchi-shadow` |
| 信息采集 | `D:\Program Files (x86)\飞书信息的导出` |
| 研发项目价值评估 | `C:\Users\adpks\Documents\ChatGPT\研发项目价值评估-codex` |
| 亚东朗升经营会议 | `C:\Users\adpks\Documents\ChatGPT\New project` |
| 基层管理者培训 | `D:\工作库\01_在做\基层管理者培训` |

## 凭据保存与启动

当前运行密钥保存在 `.local\tunnel-key-laptop-h80bppa5-v3.dpapi`，通过当前 Windows 用户的 DPAPI 加密；文件正文不进入 Git。Profile 使用 `env:CONTROL_PLANE_API_KEY` 引用，`.local\Run-Tunnel.ps1` 在启动时解密并仅向子进程提供环境变量，随后清除启动进程中的变量。

本机 Windows PowerShell 5 的 `Microsoft.PowerShell.Security` 模块曾加载失败；使用 PowerShell 7.6.5 完成加密保存。当前 `.local\Save-Tunnel-Key.ps1` 会验证输入格式后再保存，拒绝遮罩星号、空白或控制台报错文本；它不会覆盖已有密钥文件。

先前误贴进普通终端的旧密钥，用户已换用新密钥，并决定暂保留旧密钥至平台显示的 2026-10-06 到期；本记录不声称旧密钥已撤销。新 Tunnel 当前使用 v3 加密文件。维护时不要复制旧凭据或使用旧密钥文件。

在**有效的 Codex 桌面会话**中，用 PowerShell 7 从仓库根目录启动：

```powershell
.\scripts\Start-Bridge.ps1
node .\scripts\Test-Bridge.mjs --url http://127.0.0.1:8787
.\.local\Run-Tunnel.ps1
```

`Start-Bridge.ps1` 从当前桌面继承上下文并自动查找已安装 App Tools；不保存和重放其他机器的 pipe/thread 值。已有端口监听者时先核对进程身份，不重复启动或关闭未知进程。`Run-Tunnel.ps1` 启动前执行 doctor，并记录本次 PID、标准输出/错误日志和 health.url 文件。

```powershell
Invoke-RestMethod http://127.0.0.1:8787/healthz
Invoke-RestMethod http://127.0.0.1:8787/readyz
Invoke-RestMethod http://127.0.0.1:8080/healthz
Invoke-RestMethod http://127.0.0.1:8080/readyz
```

本次 Bridge 返回 `ready=true`、`desktop_connected=true`；Tunnel 返回 `live`、`ready`。这是旧版客户端的 profile 启动方式，不是 runtimes alias 管理；`runtimes status codex-bridge-laptop-h80bppa5` 不是本安装的有效检查命令。

## 本次同步更新与验证

更新前本地 `main` 为 `e0e171d3ac0ca827c98939d616e55327538d91e6`，已跟踪工作区无改动；远端领先 5 个提交，无本地独有提交。本次使用 `git fetch origin` 后快进到 `670716c`，无合并冲突。

更新包含派发前结构 LINT、v0.1.10 的固定交接区块和字段，以及第一台电脑安装记录。v0.1.10 要求来源会话的准确标题，兼容字段固定写 `Bound conversation ID: unavailable`；不再通过会话 ID 选择回传目标。Bridge 的 LINT 是协议检查子集，不能代替 Skill 的完整预检。

依赖声明和锁文件没有变化，复用本机已有 node_modules；比较 Skill 后执行 `Install.ps1 -UpdateSkill -SkipDependencies`，再打包 v0.1.10 ZIP。更新前后 `.local\bridge.json` SHA-256 均为 `7e9ccc8f83060bd50375d762c0f5618beb66ba84b205037b74d21df12149bcac`。只重启本次已核验的 Bridge/Tunnel 进程，不改变 Tunnel ID、凭据或允许列表。

| 检查 | 本次结果 |
| --- | --- |
| Typecheck / build | 通过 |
| 完整源码测试 | 39 项，37 通过、2 失败；失败均为 Windows 创建符号链接时报 EPERM，并非断言失败 |
| 新增 LINT 与 MCP 测试 | 均通过；完整测试输出中已有覆盖 |
| 实际服务 Test-Bridge.mjs | 通过健康、桌面就绪、协议探测降级、三个工具和真实 artifact 写入读回 |
| 实际服务无效格式拒绝 | `DISPATCH_LINT_FAILED`，9 项问题、无 job_id；没有创建新任务 |
| 本地 Skill | 更新后与仓库源文件摘要一致 |
| 账号远程 Skill | 本轮 Codex 提供 v0.1.10；远程缓存与仓库内容一致（忽略 CRLF/LF） |
| ChatGPT 工具元数据 | 已在 Chrome 操作 Refresh tools，并在新的 ChatGPT 聊天依据本轮实际定义核验：仅三个工具，codex_start 含派发前 LINT、必备区块与 DISPATCH_LINT_FAILED；codex_get 无 since_revision，明确禁止自动轮询 |

升级后的本地验证 artifact 为 `.local\handoff\installation-check-4ebb1d76-ca09-46fd-8606-3d8c59ea4f62.txt`。日志保存在 `.local\logs`；PID 和日志名随每次启动变化，不作为永久配置。

升级后通过本轮已提供的 LAPTOP-H80BPPA5 连接实际调用 artifact_put，返回 `.local\handoff\upgrade-check-670716c-20261005.txt`，107 bytes，SHA-256 为 `00f4f021c8110c4f183194ba0b6194afcc766cd37d87d5c0ba667a0babd30691`；本机读取内容及摘要一致。该检查没有派发工程任务，也没有查询历史 Job。

Chrome 直接打开插件设置页曾显示“无法加载插件设置”；从插件详情页的“更多操作 → 管理”进入后成功加载，完成 Refresh tools。新会话核验只读取当前工具定义，没有调用 Bridge 工具。既有 ChatGPT 会话仍可能保留旧定义，后续派发应使用刷新后的新会话。

## 升级前远端与工程派发证据

新建本机连接后，从 Chrome 中的 ChatGPT 实际调用 artifact_put：

```text
文件：.local\handoff\bridge-route-check-20261005.txt
内容：Codex Bridge route check for LAPTOP-H80BPPA5 on 2026-10-05.
大小：59 bytes
SHA-256：b304ff9319cf4260a0587fe69eeafba8fd76f6dc60af596d565327b16ce0f180
```

本机文件内容和 SHA-256 与远端返回一致，确认请求到达 LAPTOP-H80BPPA5。该证据发生在本次源码升级前；升级后的本地测试不能自动替代升级后的远端调用证据。

随后经用户选择“信息采集”项目，派发只读任务返回 `job_id=01a109f2-bbf1-7531-9a22-9f221d816fe5`。Bridge 警告任务已创建但未能自动切到前台，禁止据此重派。本次记录不主动调用 codex_get、不查询任务来验证工具刷新；任务实际执行和返回结果仍保留待确认状态。

后续同步继续使用 [安装流程](../INSTALL.md) 和 [连接说明](CONNECT-CHATGPT.md)：先比较已跟踪修改与依赖差异，快进同步、构建、部署、验证实际服务，再刷新 ChatGPT 工具目录。仅下载源码或替换 Skill 不等于已部署；遇到派发状态不明也不得自动重派。
