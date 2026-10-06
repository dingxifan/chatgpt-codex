# LAPTOP-H80BPPA5 升级至 v0.1.14

这是现有安装的原地升级步骤，不是该电脑已完成升级的记录。历史事实保留在 INSTALLATION-LAPTOP-H80BPPA5.md；本次必须重新验证实际状态。

## 1. 确认本机、目录与 Git 状态

在 Laptop 的 Codex 桌面打开已有维护仓库，记录中的路径是：

`C:\Users\adpks\Documents\Codex\2026-10-03\sites-plugin-sites-openai-curated-remote\work\chatgpt-codex`

先核实它仍为真实运行目录，再用 PowerShell 7 执行：

```powershell
git remote -v
git rev-parse HEAD
git status --short
git fetch origin
git diff HEAD origin/main -- bridge/package.json bridge/package-lock.json bridge/src scripts plugin/codex-dispatch
```

origin 必须为 `https://github.com/dingxifan/chatgpt-codex.git`。审查本地修改和本地独有提交；已跟踪文件无修改且能快进时执行 `git merge --ff-only origin/main`。有冲突或不能快进时保留现场并处理实际差异，不 reset、clean、stash 或覆盖。记录同步后的完整 SHA，读取新版 AGENTS.md、INSTALL.md 与本步骤。

核对 `.local/bridge.json`、本机 `.local/Run-Tunnel.ps1`、Tunnel profile、DPAPI 密钥文件和当前服务进程是否存在；不打印密钥、pipe/thread 上下文值。不复制 Desktop 的配置或凭据。

## 2. 更新本地 Skill 并构建

比较本地 `.agents/skills/codex-dispatch/SKILL.md` 与仓库 canonical Skill。若差异是已知旧版升级，执行：

```powershell
.\scripts\Install.ps1 -UpdateSkill
```

该命令按锁文件安装依赖并构建，复用既有 workspaceRoots/port，备份旧 Skill，不改 Tunnel、密钥、账号连接或全局 Codex 配置。不需要重新填写五个工作区。依赖声明、锁文件均未变且现有依赖完整时，可用 `-UpdateSkill -SkipDependencies`；依赖缺失则使用上面的默认命令。

安装前后核对 `.local/bridge.json` SHA-256 一致、Skill 内容与仓库一致。远程插件缓存由宿主刷新，不能手工覆盖缓存或把本地 Skill 复制成功当成账号升级。

安装和启动脚本明确按 UTF-8 读取 bridge.json，避免 Windows PowerShell 5 对无 BOM JSON 中中文工作区的错误解码；Laptop 仍优先使用已安装的 PowerShell 7。

## 3. 本机源码与脚本验证

从仓库根目录执行以下命令，任一失败先处理实际原因，不继续宣称通过：

```powershell
Push-Location bridge
$env:CODEX_WORKSPACE_ROOT = (Get-Location).Path
$env:TEMP = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Temp'
$env:TMP = $env:TEMP
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
.\scripts\Test-Install.ps1
```

Laptop 历史测试出现过 Windows symlink EPERM；若本次仍失败，单独报告失败项与环境原因，不能把剩余通过或 Desktop 的 44/44 当作 Laptop 全量通过。不要为通过测试自动修改系统安全设置。

## 4. 更新实际 Bridge，复用 Tunnel

历史安装为 v0.1.10，其后已修改 Bridge 的 dispatch LINT 与工具描述。因此本次仍需要部署新构建并重启实际 Bridge；仅 v0.1.13 → v0.1.14 的中央路由变化才不要求 Bridge 重启。

先通过监听端口、进程命令行、运行入口和日志确认当前 Laptop Bridge 身份，只停止已核验的本机旧 Bridge；不停止未知进程或另一台机器服务。然后在有效 Codex 桌面会话运行：

```powershell
.\scripts\Start-Bridge.ps1
node .\scripts\Test-Bridge.mjs --url http://127.0.0.1:8787
```

URL 端口应以实际保留的 bridge.json 为准。Test-Bridge 写入验证 artifact 并读回，不派发任务、不查询 Job。核对 readyz、三个工具集合及内容/摘要一致。

Tunnel 仍正常时复用；未运行时检查既有 profile 与 doctor，再按本机 `.local/Run-Tunnel.ps1` 启动。仍使用 `codex-bridge-laptop-h80bppa5` profile、既有 Laptop Tunnel 和受保护的 v3 密钥。不要套用 Desktop 的 runtimes alias 命令，不重复创建 Tunnel、连接或凭据。Tunnel 健康地址以本机当前 health.url 为准。

## 5. 核对账号 Skill 与 Laptop 工具目录

当前维护会话已经通过 Plugin Creator 将同一账号的 Codex Dispatch 更新至 v0.1.14，并读回三个文件与 ZIP 源文件一致。安装时核对是否为同一账号和当前版本；同账号无需再次导入 ZIP，也不需在 Laptop 再打包。其它账号需按 CONNECT-CHATGPT.md 更新其自己的插件。

已有 Laptop 连接使用其原名称 `Codex Bridge - LAPTOP-H80BPPA5`。从详情页“更多操作 → 管理”进入，按 CONNECT-CHATGPT.md Refresh tools。新会话读取实际工具定义：只有 artifact_put、codex_start、codex_get；codex_start 含现行 LINT/token 规则，codex_get 无 since_revision 并禁止自动轮询。不要调用 Job 来测试元数据刷新。

新版 Skill 从 GitHub main 的中央 URL 重新读取路由；不上传 Project Files 路由副本。

## 6. 路由确认与端到端测试

准备该升级指引时，中央表的 `feishu-collection` route 为 disabled。2026-10-06 已在 Laptop 核实并按用户明确要求启用该路由及 auchi-laptop，证据见 INSTALLATION-LAPTOP-H80BPPA5.md 的当日更新记录。其它安装或未来新增路由仍需先核对实际仓库完整 owner/repository、准确项目根路径，再从实际工具目录确认 namespace；安装记录或在线状态不能代替这些证据。

只有用户明确确认该 route 的值及启用后，才在维护仓库修改中央 `config/CODEX_WORKSPACE_ROUTING.md` 并发布。安装脚本不会启用 route，也不会增加其它四个 Laptop 项目路由。未启用时应返回 WORKSPACE_ROUTE_NOT_FOUND，不能为了测试绕过 Skill 或切到 Desktop Bridge。

路由启用后，由用户在新版 ChatGPT 会话明确发起一次小型只读任务，检查准确 Laptop 项目、实际结果和适用的回传。成功创建不等于执行成功；不自动查询历史 Job、轮询或重派。

最终报告同步 SHA、配置保持证据、Skill 版本/摘要、测试 PASS/FAIL、实际服务结果、账号工具目录、路由是否启用和端到端结果。尚未完成的项目标 pending 或 NOT_RUN。

## 本次准备验证

Desktop 上 PowerShell 7 的 Test-Install.ps1 已通过：首次安装缺少工作区拒绝、非法既有配置在写入前拒绝、升级省略工作区复用配置、配置字节保持、Skill 精确安装、冲突保留、更新备份和缺少桌面上下文拒绝。Windows PowerShell 5 的实际脚本运行被本机执行策略阻止，未修改策略，不能报告该运行通过。本段为准备阶段的 Desktop 验证；Laptop 在 2026-10-06 的实际安装、服务和路由验证结果见 INSTALLATION-LAPTOP-H80BPPA5.md，不由本段推定端到端验证通过。
