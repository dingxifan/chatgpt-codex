# Windows 安装流程

当前源码插件为 0.2.1，使用单文件入口与 kernel，沿用窗口现有权限，不设权限档位匹配门槛。接口及证据边界见 [单文件交接](docs/SINGLE-FILE-HANDOFF.md)。下文旧信封／LINT 版本说明仅为 0.1.x 历史记录，不能作为当前输入规约。

本工作树含 0.2.0 单文件交接实现，启动／查询参数与已发布 v0.1.19 不同，见 [候选接口与边界](docs/SINGLE-FILE-HANDOFF.md)。下文保留已发布版本的安装说明；本轮只做本地实现和离线验证，没有执行安装、服务重启或账号更新。

推荐让 Codex 桌面应用读取本仓库 AGENTS.md 后执行。此流程复用桌面应用已有能力，不需要修改 Bridge 后端。

## 1. 准备

安装并登录 Codex 桌面，安装 Node.js 20+。打开本仓库，并在桌面中保存要执行任务的项目。项目的主路径必须与预期工作区完全对应。

安装端 Codex 应先检测已安装工具；缺少工具时使用官方安装来源和本机可用安装方式，不盲目重装。没有桌面上下文的 CLI 仍可完成依赖、配置和 Skill 准备，但不能完成原生 Bridge 的启动验收。

## 2. 安装本地文件

在仓库根目录执行，替换为使用者自己的已有项目路径：

```powershell
.\scripts\Install.ps1 -WorkspaceRoots @('D:\projects\my-project')
.\scripts\Pack-Plugin.ps1
```

Install.ps1 使用 npm ci 与锁文件构建，不覆盖现有 .local/bridge.json。更新工作区或端口时手动编辑该文件后验证；示例在 config/bridge.example.json。不同内容的同名本地 Skill 默认拒绝覆盖，更新时可指定 -UpdateSkill（先备份）。

已有安装可执行 `.\scripts\Install.ps1 -UpdateSkill`，省略 WorkspaceRoots 时从现有配置读取并验证目录、端口和 artifact 根目录字段。首次安装缺少 WorkspaceRoots 或既有配置无效时，在修改 Skill/构建前停止。已有配置不会被 WorkspaceRoots/Port 参数覆盖；脚本输出实际保留的工作区和端口。仅确认锁文件、依赖声明未变化且依赖完整时使用 `-SkipDependencies`。

LAPTOP-H80BPPA5 已有安装的升级顺序见 [Laptop v0.1.14 升级步骤](docs/UPGRADE-LAPTOP-V0.1.14.md)，不要重复创建 Tunnel、连接或密钥。

脚本不会全局修改 PowerShell 执行策略；若当前策略阻止运行，由安装端依据实际环境处理该具体问题。生成的本地 Skill 默认位于当前 Windows 用户的 .agents/skills/codex-dispatch。

## 3. 验证源码

`npm run build` 会生成 `bridge/dist/build-info.json`，记录 Git 来源（含 dirty 状态）、包版本及源码／产物 SHA256。在仓库根运行 `node scripts/Build-Info.mjs --verify` 校验；Start-Bridge.ps1 也会在启动前校验。缺少或不匹配时必须重建。实际运行副本、账户插件和会话定义仍按 [发布检查路径](docs/RELEASE-PATH.md) 单独核验。

```powershell
Push-Location bridge
$env:CODEX_WORKSPACE_ROOT = (Get-Location).Path
$env:TEMP = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Temp'
$env:TMP = $env:TEMP
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
```

这些是构建/模拟测试，不替代实际桌面和 ChatGPT 验证。

## 4. 启动与本地 MCP 验证

由 Codex 桌面当前会话运行：

```powershell
.\scripts\Start-Bridge.ps1
node .\scripts\Test-Bridge.mjs --url http://127.0.0.1:8787
```

修改过端口则同时修改验证 URL。Start-Bridge.ps1 自动查找已安装 codex-app-tools/server.mjs；有多个版本时仅在版本可排序时选择最高版本，也可用 -AppToolsServer 指定已验证的文件。它从当前会话继承原生上下文，不将其写入本地配置。

本仓库已包含新版协议探测的旧版握手 fallback。Test-Bridge.mjs 会先发送无会话的 server/discover，确认 HTTP 200 和 JSON-RPC -32601，再使用 SDK 执行旧版 initialize、tools/list 和真实文本落盘读取。无需在本机再维护未提交的兼容补丁；拉取更新后须重新构建并重启本次 Bridge。

升级到派发前 LINT 时，必须同时更新 Skill v0.1.9、重新构建并部署实际运行的 Bridge，然后按下节刷新连接元数据。只有文件更新不等于硬校验已生效。codex_start 入参不变，但旧的非结构化 prompt 会被拒绝；采用 Skill 的固定区块和行内字段模板。

DISPATCH_LINT_FAILED 明确表示尚未调用桌面后端且没有创建任务。按 errors 的 rule/field/message 一次修正全部问题。v0.1.14 可将缺失标题写为 unavailable；新信封两处 Dispatch token UUID v4 必须相同，不要求 Origin project。安全方法无法定位窗口时，接收端主动询问人类并等待；查找仅最近 20 条未置顶记录和置顶顺序前 10 条，不补齐配额或扩范围。修正后的提交允许继续，创建结果不明时仍禁止自动重派。auto 和用户明确选择的 manual 都受同一校验。

| 检查 | 拒绝原因 |
| --- | --- |
| DL001 | 缺少 Goal 激活开头、/goal 或具体目标 |
| DL002 | 缺少 ChatGPT 类型、标题／unavailable 或 ID 声明；仍有占位符或只有“父窗口” |
| DL003 | 把 Bridge 的 CODEX_THREAD_ID 当作 ChatGPT 收件人 |
| DL004 | 两个区块的任务、仓库/工作区或 BASE_SHA 不一致，SHA 格式错误，新信封的 UUID 缺失／不一致，或实际 workspace 与两处声明的规范目录不一致 |
| DL005 | 区块缺失/乱序/重复、重复字段冲突，或 Return mode 不是 auto/manual |

固定区块和行内字段格式见 [Skill](plugin/codex-dispatch/skills/codex-dispatch/SKILL.md)。本校验不确认标题/ID 的真实性、不扫描附件语义冲突，也不控制接收端后续发送动作。

新增工作区与创建结果保护需要构建并部署实际 Bridge 后才生效。`Repository / workspace` 仍使用 `repository / 绝对路径` 格式；两处字符串须一致，并与实际 workspace 按现有 realpath、大小写／分隔符和 junction 规则匹配。通过检查的规范路径交给后端，allowlist 检查仍由后端执行。Desktop 项目必须有且只有一个规范路径匹配；零匹配、多个匹配或缺少有效 projectId 都在 create_thread 前拒绝。

codex_start 输入参数和工具集合不变，输出新增 `creation_status`：

| creation_status | 返回与处理 |
| --- | --- |
| created | 确认 threadId，保留原 job_id。导航失败仍返回同一个 job_id 与 warning；不得因此重新创建 |
| not_created | status=failed；LINT 使用 DISPATCH_LINT_FAILED，其它可确定的提交前拒绝使用 DISPATCH_REJECTED。修正已报告的问题后才能考虑新提交 |
| unknown | isError=true、status=unknown、error_code=DISPATCH_OUTCOME_UNKNOWN。进入创建调用后超时、断线、原生错误／无效响应或缺少确认 threadId（包括只有 clientThreadId 的待设置结果），均不证明未创建。停止自动重派，由用户检查 Desktop 后决定下一步 |

调用前已断连且本地适配器明确没有发送请求时属于 not_created；已发送后的原生错误响应不能仅凭报错文本当成确定拒绝。Dispatch token 是交接证据，不是原生幂等键，不承诺 exactly-once。输出仍通过 JSON 文本与 structuredContent 返回；原来只处理 status=failed 的调用方需同时处理 unknown。未知自定义后端错误也保守返回 unknown。没有新增重试、任务数据库、状态查询服务或回调；codex_get 仍只用于用户明确要求的一次查询。

脚本启动隐藏进程，输出新进程 PID 和日志位置。维护者只管理本次创建的进程，不关闭其他 Bridge/Tunnel。它不是服务、监督程序或自动重启机制。

## 5. 连接 ChatGPT

v0.1.14 的路由唯一权威源是 `dingxifan/chatgpt-codex` 的 `main/config/CODEX_WORKSPACE_ROUTING.md`，固定读取地址为 https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md 。无需在任何 GPT Project / Space 上传 routing table；旧副本被忽略。每次新派发重新读取完整中央表，读取失败即在 artifact 写入和派发前停止，不使用缓存、本地副本或其它 Bridge。新机器的实际 repository/workspace、computer 和工具 namespace 必须明确配置到中央表并确认后启用；本地 allowlist 不能代替中央路由。

本次路由改造不改变三个 Bridge 工具接口，无需为此重启 Bridge。账号中的 Skill 仍需导入新版 ZIP 并在新会话核验；已有连接的工具元数据刷新要求继续按下面的流程处理。

该说明仅针对已运行 v0.1.13 Bridge 的升级。从 v0.1.10 或更早版本升级时，中间版本包含 dispatch LINT 和工具描述更新，仍须构建并替换实际 Bridge 进程、刷新该连接工具元数据，再用新会话核验。

继续 [CONNECT-CHATGPT.md](docs/CONNECT-CHATGPT.md)。安装插件包与连接 MCP 是两个步骤；每位使用者有自己的账号连接和本地执行目标。

已有连接尤其要完成该文档中的工具元数据刷新和新会话核验。本地 Test-Bridge.mjs 只能证明本机服务的实际定义，不能证明 ChatGPT 保存的定义已更新；Connected 或 Connect/Disconnect 也不能代替工具目录核验。此步骤未完成时报告 pending，不宣称全部安装完成。

## 6. 完成标准

- 本地代码构建/测试通过。
- /readyz 表示 desktop_connected=true。
- Test-Bridge.mjs 通过真实 tools/list，集合恰好是三个指定工具，并成功读取文本落盘结果。
- ChatGPT 账号已安装 Skill，连接后的工具可见。
- ChatGPT 新会话实际加载的定义只有 artifact_put、codex_start、codex_get；无 wake_probe、无 since_revision，且 codex_get 明确禁止自动轮询。
- 经用户明确发起的只读任务确实进入正确工作区，结果成功返回或明确供人工搬运。

按实际证据报告阶段状态。新机器兼容性、账号权限及原生回传能力可能不同，不能从本仓库测试结果推定它们可用。
