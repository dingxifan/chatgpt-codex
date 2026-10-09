# ChatGPT → Codex 安装包

0.2.0 已改为单文件指令入口与同 Bridge token 回执查询，接口和验收边界见 [单文件交接](docs/SINGLE-FILE-HANDOFF.md)。以下版本说明保留已发布 v0.1.19 的历史安装事实；不能把本工作树改动当成已安装服务。

让 ChatGPT 使用 codex-dispatch Skill，把任务交给使用者自己电脑上的 Codex 桌面应用。Bridge 只有 artifact_put、codex_start、codex_get 三个工具；派发成功后不自动查询任务。

codex_start 先执行硬 LINT：缺少 Goal、误用 Bridge 技术父会话 ID、任务信息不一致或回传模式不明时，返回 DISPATCH_LINT_FAILED，不创建任务。当前 Skill v0.1.19 要求接收端核对实际权限上下文，并保留一致的 Dispatch token UUID 和 unavailable 标题支持，不要求自动取得项目／标题。查找限最近 20 条未置顶记录和置顶顺序前 10 条；安全方法不能确定窗口时接收端主动问人类并等待。旧真实标题信封兼容。校验器不证明来源或实际回传成功；接收端仍核验真实证据。

中央表可在选定路由中提供 Publish targets（地址与目标分支）和 Publish order（PR／合并／同步顺序），Skill 原样带入交接。两项均未填写时，仅对本次要求发布的任务使用工作区 Git 全同步兜底；有错误、冲突或中央读取失败不得视为未填。发布范围不授予 push／merge／部署权限，逐目标核验真实远端引用后才可报告全同步；不使用 mirror 或自动 force。格式见 [中央表契约](config/CODEX_WORKSPACE_ROUTING.md)。

v0.1.19 明确原生绑定、自动核验、用户直接指定目标是独立替代路径；原始完整派发链是强证据，不是所有路径的累计门槛。准确标题可唯一定位时不索要链接，人类直接确认后不循环索取原派发全文。助手引用不等于正文，长期许可仍按实际发送工具合同核验。历史事故和新版验收案例见 [来源回传核查](docs/RETURN-ORIGIN-VERIFICATION.md)。

## 交给另一台机器的 Codex

克隆或下载这个仓库，在 **Codex 桌面应用** 中打开它，发送：

> 阅读 AGENTS.md 和 INSTALL.md，根据本机现状安装本仓库的 Skill 与原生桌面 Bridge，执行实际验证。继续完成所有可以自动完成的步骤；遇到登录、账号密钥或 ChatGPT 连接操作时明确指出具体待办。不要把仅安装文件或模拟测试通过报告为端到端安装完成。

详细步骤见 [INSTALL.md](INSTALL.md)。首版安装脚本支持 Windows PowerShell 5.1+；其他平台需按相同条件另行适配，不能直接运行这些脚本。

两台电脑的实际运行目录、账号绑定、启动方法和验证边界分别见 [DESKTOP-6CNV6UL 安装配置记录](docs/INSTALLATION-DESKTOP-6CNV6UL.md) 和 [LAPTOP-H80BPPA5 安装配置记录](docs/INSTALLATION-LAPTOP-H80BPPA5.md)。其他电脑应按通用流程使用自己的 Tunnel 和本地路径。

Desktop 当前唯一维护目录为 `E:\tools\codex-from-chatgpt`，对应 `dingxifan/chatgpt-codex`；最新核对与验证命令见 [2026-10-06 环境基线](docs/ENVIRONMENT-BASELINE-DESKTOP-6CNV6UL.md)。

## 文件

本项目唯一维护仓库是 `dingxifan/chatgpt-codex`；`joseanu/codex-from-chatgpt` 仅为 Bridge 上游来源。codex-dispatch 每次新派发都读取 [GitHub main 中央路由表](https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md) 的完整当前内容。Project / Space 无需上传路由文件，遗留副本全部忽略；中央源不可读时停止，不使用其它副本或其它 Bridge。

| 路径 | 用途 |
| --- | --- |
| AGENTS.md | 安装端 Codex 的执行说明 |
| INSTALL.md | 自动安装顺序与必须交互的步骤 |
| bridge/ | 固定快照的原生桌面 Bridge 源码、锁文件、测试和原始 MIT 许可 |
| plugin/codex-dispatch/ | 可导入账号的 Skill 插件；两个 manifest 当前均为 v0.1.19 |
| scripts/Install.ps1 | 检查 Node、安装依赖、构建、本地 Skill 安装和配置生成 |
| scripts/Start-Bridge.ps1 | 从当前 Codex 桌面上下文启动 Bridge |
| scripts/Test-Bridge.mjs | 健康、就绪、新版探测降级、旧版初始化、工具集合和 artifact_put 验证 |
| scripts/Pack-Plugin.ps1 | 生成或核验插件 ZIP；相同内容复用，冲突不覆盖 |
| scripts/Build-Info.mjs | 构建后记录来源与源码／产物摘要；启动前校验 |
| docs/RELEASE-PATH.md | 源码到运行副本、Skill、账户插件和会话定义的发布检查路径 |
| config/bridge.example.json | 不含凭据的本机配置模板 |
| config/CODEX_WORKSPACE_ROUTING.md | GitHub main 上的唯一运行时路由权威源 |
| docs/CONNECT-CHATGPT.md | 用户自己的 Tunnel 和 ChatGPT 连接步骤 |
| docs/TROUBLESHOOTING.md | 常见问题和真实完成标准 |
| SOURCE.md | 固定来源、版本及许可说明 |

## 适用条件

需要已登录的 Codex 桌面应用、Node.js 20+、可用的第一方 Codex App Tools，以及桌面会话注入的连接上下文。目标工作区必须是桌面项目列表实际暴露的本地项目路径。

当前原生 Bridge 不能从普通终端或 Explorer 独立冷启动。安装后应由打开的 Codex 桌面会话启动；桌面重启后要从新会话重新启动 Bridge。不保存或重放 pipe、thread ID 或会话令牌，也不安装开机服务或改成旧 app-server 后端。

通用安装文件不包含使用者的账号绑定或工作区配置；本机安装记录仅保存维护所需的非凭据配置。本仓库不保存登录凭据、Tunnel 密钥或桌面会话令牌。插件 ZIP 安装不会自动完成 ChatGPT MCP 连接。

**安装/更新条件：必须核验 ChatGPT 实际加载的工具目录。**本机 Bridge 正常、页面显示 Connected、或 Skill 已更新，都不代表账号中的旧 MCP 工具定义已经刷新。已有连接应重新扫描工具，并在新会话确认只有 artifact_put、codex_start、codex_get，没有 wake_probe 和 since_revision，且 codex_get 明确禁止自动轮询。步骤见 [工具元数据刷新](docs/CONNECT-CHATGPT.md#工具元数据刷新安装及更新条件)。

官方参考：[Skills](https://learn.chatgpt.com/docs/build-skills)、[插件](https://learn.chatgpt.com/docs/plugins)、[Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)。
