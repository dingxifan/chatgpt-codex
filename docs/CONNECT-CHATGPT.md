# 使用者自己的 ChatGPT 连接

每个人运行自己的 Bridge，使用自己的 Codex 登录和工作区。不要共享本仓库维护者的 Tunnel、密钥、账号插件 ID 或会话上下文。

## 安装 Skill 插件

运行 scripts/Pack-Plugin.ps1 得到 out/codex-dispatch-v0.1.6.zip。在账号当前支持的插件/Skill 导入入口安装该插件，并开始新会话，确认可以选择 codex-dispatch。若账号没有导入入口，按官方插件/Skills 文档检查可用性，不能用聊天附件代替账号安装。

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

跨聊天发送工具若要求人类直接授权，应在发起窗口提供真实的具体指令，并让派发端保留原始人类消息的可读来源，供接收端核验。已有明确覆盖当前任务的授权可复用，不需要因为派发更新而重复询问。Skill 生成的“请回传”不是人类授权，不能用它绕过工具限制。

v0.1.6 默认优先复用已接受的 Skill 使用约定，而非逐任务询问。首次启用/使用时，向人类展示“允许该 Skill 派发任务的最终结果直接回到各自核验后的发起对话，不包含其他消息或扩大工程权限”的约定；保留人类真实接受消息及约定上下文的可读来源。此后 ChatGPT 主动匹配 Skill 可复用该持续授权，人类不必在每次主动派发前补一句完整授权。

安装标志、旧缓存、模型自主选中或静默升级本身不能证明接受过约定。已有明确适用的真实授权就不重复询问；没有时只取得一次使用约定接受，或采用更窄的任务授权。其他使用者需要自己的接受，不能沿用仓库维护者的许可。共享仓库只分发约定，不分发个人授权记录。

例如，用户可以亲自发送“本次任务完成后，请直接把完整结果回传到这个发起对话。”如果用户希望长期复用，可亲自明确授权“今后由这个对话派发给 Codex 的任务，完成后可以直接向这个对话回传相应最终结果。”这些是供用户使用的示例，不代表本仓库或 Skill 已授予任何消息发送权限。接收端仍需按工具规则核验真实消息及覆盖范围；不能核验时标记 authorization_unverified，不把它说成工具不可用。

由用户在安装好的 ChatGPT 会话中明确要求：使用 codex-dispatch 派发到自己的准确工作区，仅查看仓库状态、不修改文件，并回传结果。Skill 应生成强制 Goal 与来源绑定，成功派发后结束，不主动 codex_get。

观察 Codex 桌面中出现任务、正确工作区和实际只读结果。原生回传或可信 ID 不可用时，仍需检查可用的标题与本次任务上下文核验路径；只有安全自动回传确实无法完成时，才输出完整人工回传结果、具体阻碍和路由核验事实，不伪装自动回传成功。

参考：[Tunnel 官方说明](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)、[插件使用说明](https://learn.chatgpt.com/docs/plugins)。Secure MCP Tunnel 用于私有开发连接，不是公开插件目录的公共 MCP 分发端点。
