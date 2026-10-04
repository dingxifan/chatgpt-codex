# ChatGPT → Codex 安装包

让 ChatGPT 使用 codex-dispatch Skill，把任务交给使用者自己电脑上的 Codex 桌面应用。Bridge 只有 artifact_put、codex_start、codex_get 三个工具；派发成功后不自动查询任务。

codex_start 现在先执行硬 LINT：缺少 Goal 或准确 ChatGPT 来源窗口、误用 Bridge 技术父会话 ID、任务信息不一致或回传模式不明时，返回 DISPATCH_LINT_FAILED，不创建任务。Skill v0.1.9 生成固定区块模板；旧式“返回父窗口”指令需要补齐后才能派发。校验器不证明标题真实，也不扫描附件语义或控制接收端之后的发送行为。

## 交给另一台机器的 Codex

克隆或下载这个仓库，在 **Codex 桌面应用** 中打开它，发送：

> 阅读 AGENTS.md 和 INSTALL.md，根据本机现状安装本仓库的 Skill 与原生桌面 Bridge，执行实际验证。继续完成所有可以自动完成的步骤；遇到登录、账号密钥或 ChatGPT 连接操作时明确指出具体待办。不要把仅安装文件或模拟测试通过报告为端到端安装完成。

详细步骤见 [INSTALL.md](INSTALL.md)。首版安装脚本支持 Windows PowerShell 5.1+；其他平台需按相同条件另行适配，不能直接运行这些脚本。

## 文件

| 路径 | 用途 |
| --- | --- |
| AGENTS.md | 安装端 Codex 的执行说明 |
| INSTALL.md | 自动安装顺序与必须交互的步骤 |
| bridge/ | 固定快照的原生桌面 Bridge 源码、锁文件、测试和原始 MIT 许可 |
| plugin/codex-dispatch/ | 可导入账号的 Skill 插件 v0.1.9 |
| scripts/Install.ps1 | 检查 Node、安装依赖、构建、本地 Skill 安装和配置生成 |
| scripts/Start-Bridge.ps1 | 从当前 Codex 桌面上下文启动 Bridge |
| scripts/Test-Bridge.mjs | 健康、就绪、新版探测降级、旧版初始化、工具集合和 artifact_put 验证 |
| scripts/Pack-Plugin.ps1 | 生成供 ChatGPT 导入的插件 ZIP |
| config/bridge.example.json | 不含凭据的本机配置模板 |
| docs/CONNECT-CHATGPT.md | 用户自己的 Tunnel 和 ChatGPT 连接步骤 |
| docs/TROUBLESHOOTING.md | 常见问题和真实完成标准 |
| SOURCE.md | 固定来源、版本及许可说明 |

## 适用条件

需要已登录的 Codex 桌面应用、Node.js 20+、可用的第一方 Codex App Tools，以及桌面会话注入的连接上下文。目标工作区必须是桌面项目列表实际暴露的本地项目路径。

当前原生 Bridge 不能从普通终端或 Explorer 独立冷启动。安装后应由打开的 Codex 桌面会话启动；桌面重启后要从新会话重新启动 Bridge。不保存或重放 pipe、thread ID 或会话令牌，也不安装开机服务或改成旧 app-server 后端。

本仓库不包含任何人的登录信息、Tunnel 密钥、任务历史、账号插件 ID 或工作区配置。插件 ZIP 安装不会自动完成 ChatGPT MCP 连接。

**安装/更新条件：必须核验 ChatGPT 实际加载的工具目录。**本机 Bridge 正常、页面显示 Connected、或 Skill 已更新，都不代表账号中的旧 MCP 工具定义已经刷新。已有连接应重新扫描工具，并在新会话确认只有 artifact_put、codex_start、codex_get，没有 wake_probe 和 since_revision，且 codex_get 明确禁止自动轮询。步骤见 [工具元数据刷新](docs/CONNECT-CHATGPT.md#工具元数据刷新安装及更新条件)。

官方参考：[Skills](https://learn.chatgpt.com/docs/build-skills)、[插件](https://learn.chatgpt.com/docs/plugins)、[Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)。
