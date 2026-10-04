# Windows 安装流程

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

脚本不会全局修改 PowerShell 执行策略；若当前策略阻止运行，由安装端依据实际环境处理该具体问题。生成的本地 Skill 默认位于当前 Windows 用户的 .agents/skills/codex-dispatch。

## 3. 验证源码

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

脚本启动隐藏进程，输出新进程 PID 和日志位置。维护者只管理本次创建的进程，不关闭其他 Bridge/Tunnel。它不是服务、监督程序或自动重启机制。

## 5. 连接 ChatGPT

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
