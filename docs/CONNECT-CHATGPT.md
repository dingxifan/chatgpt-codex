# 使用者自己的 ChatGPT 连接

每个人运行自己的 Bridge，使用自己的 Codex 登录和工作区。不要共享本仓库维护者的 Tunnel、密钥、账号插件 ID 或会话上下文。

## 安装 Skill 插件

运行 scripts/Pack-Plugin.ps1 得到 out/codex-dispatch-v0.1.8.zip。在账号当前支持的插件/Skill 导入入口安装该插件，并开始新会话，确认可以选择 codex-dispatch。若账号没有导入入口，按官方插件/Skills 文档检查可用性，不能用聊天附件代替账号安装。

## 安装 Tunnel 客户端

先检查是否已有 tunnel-client。没有时从 OpenAI Platform 的 Tunnels 页面或 [官方发行页](https://github.com/openai/tunnel-client/releases/latest) 获取适合本机的版本。使用其 help quickstart 核对实际参数。

在使用者自己的 Platform 组织建立或选用 Tunnel。创建需要 Tunnels Read + Manage，运行及选择需要 Read + Use；ChatGPT developer-mode 的可用性和权限是另一项条件。配置目标 ChatGPT 工作区的关联。

用户自己提供运行时 API key，用 env: 或受保护的 file: 引用。不要在聊天、命令输出、仓库或安装报告中显示密钥。安装端不得沿用维护者的 Tunnel 或凭据。

## HTTP 配置

下面是非凭据命令模板。先把用户自己的运行时密钥放入当前受保护的环境，替换用户自己的 Tunnel ID；如果端口不同，一并替换：

```powershell
tunnel-client init --sample sample_mcp_remote_no_auth --profile codex-dispatch-local --tunnel-id <YOUR_TUNNEL_ID> --mcp-server-url http://127.0.0.1:8787/mcp
tunnel-client doctor --profile codex-dispatch-local --explain
tunnel-client run --profile codex-dispatch-local
```

Tunnel profile 名只是用户自己的配置名称。已有同名配置时先读取不含密钥的配置项并复用/选择其他名字，不覆盖已有连接。首版不安装后台服务；安装端可用隐藏进程运行客户端，并保留它创建的 PID 与日志位置供当前用户维护。

Bridge 必须先真实 ready；Tunnel 客户端必须保持运行。在 ChatGPT 的开发者连接流程中选择用户自己的 Tunnel，扫描工具。只应出现 artifact_put、codex_start、codex_get。如果出现 wake/probe 或旧 continue/approval 工具，检查是否连接错服务或元数据未刷新。

若 Tunnel 改写 Host，先确定它实际使用的 Host 值，再写入 .local/bridge.json 的 allowedHosts 后重启本次 Bridge；不关闭 Host 验证或随意添加通配值。

## 端到端验证

v0.1.8 将“派发 → 执行 → 自动回传核验后的发起对话”作为默认流程。Skill 不另设授权字段、使用约定确认、逐任务询问或审批步骤，也不等待用户再补一句“你自己发过去”。

实际消息工具的既有约束继续有效；Skill 不伪造人类许可，也不要求模型绕过工具规则。若实际工具约束无法满足，准确报告该限制和完整结果，不把授权障碍误说成没有回传工具。用户明确要求人工搬运或禁止消息时仍按其限制执行。

若确有消息工具，但是否发送、目标或工具要求的授权尚不明确，Codex 应主动在接收任务的对话问一次具体问题。例如，目标已核验时：“结果已准备好，是否允许我将本任务完整结果回传到「准确的发起对话」？”目标未核验时先询问准确目标，不猜测发送。已有明确适用指令时不重复询问；无人回复时等待，不自动变成人工搬运或声称 Goal 完成。没有可交互渠道或消息能力时，才按事实输出完整结果及具体待办。

由用户在安装好的 ChatGPT 会话中明确要求：使用 codex-dispatch 派发到自己的准确工作区，仅查看仓库状态、不修改文件，并回传结果。Skill 应生成强制 Goal 与来源绑定，成功派发后结束，不主动 codex_get。

观察 Codex 桌面中出现任务、正确工作区和实际只读结果。原生回传或可信 ID 不可用时，仍需检查可用的标题与本次任务上下文核验路径；只有安全自动回传确实无法完成时，才输出完整人工回传结果、具体阻碍和路由核验事实，不伪装自动回传成功。

参考：[Tunnel 官方说明](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)、[插件使用说明](https://learn.chatgpt.com/docs/plugins)。Secure MCP Tunnel 用于私有开发连接，不是公开插件目录的公共 MCP 分发端点。
