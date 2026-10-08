# 使用者自己的 ChatGPT 连接

每个人运行自己的 Bridge，使用自己的 Codex 登录和工作区。不要共享本仓库维护者的 Tunnel、密钥、账号插件 ID 或会话上下文。

## 安装 Skill 插件

运行 scripts/Pack-Plugin.ps1 得到 out/codex-dispatch-v0.1.18.zip。已有插件使用其更新入口，保留身份与连接；首次安装使用账号当前支持的插件/Skill 导入入口。开始新会话，确认可以选择 codex-dispatch。若账号没有导入入口，按官方插件/Skills 文档检查可用性，不能用聊天附件代替账号安装。

v0.1.15 将接收端权限核对作为常规交接要求：工程操作前报告实际 execution context，与用户选择的完全访问核对；不一致就停止，由用户在 Desktop 手动切换，续行时复核后继续同一任务。Codex 不自行修改权限，不重新派发或轮询。用户明确要求受限模式时保留其选择。此更新只改变 Skill，不要求重启 Bridge。

v0.1.16 精简 Skill 的交接规则，保留原有字段、路由、权限、来源核验与回传边界，并明确三种创建结果。开发、审阅、验收沿用项目规则，HACT 不是前提。Skill 更新本身无需重启 Bridge；同批工作区交叉校验、唯一项目匹配和创建结果保护属于 Bridge 源码增量，必须另行构建、部署并核验实际运行副本。仅导入此 ZIP 不代表这些后端保护已生效。

v0.1.17 增加同一次中央读取的可选发布范围：Publish targets 成对列出仓库地址与分支，Publish order 保留 PR／合并／同步顺序；两项均缺省时携带接收端工作区 Git 全同步兜底。只有任务要求的发布动作获准执行，不能因列出目标就推送或合并。逐目标读取实际远端引用核验，部分成功不得宣称全同步；不新增 Project Files 读取或 Bridge API。中央 main 尚未包含这些可选字段时仍兼容；0.1.16 历史 ZIP 保留不覆盖。

v0.1.18 将返回来源证据明确拆为人类发起请求、助手派发记录、Bridge 创建结果／助手创建确认和接收端可信 native handle。用户无需提前提供尚未生成的 token 或 job_id。原始消息的角色、次序及同次派发关联必须可读；助手正文返回 chatgpt-content-reference 时不能当成已读，可用受支持正文读取能力核验同一候选，否则明确报告读取缺口并等待本次来源识别。可读、适用、未撤销的原始人类长期授权按实际发送工具合同复用，不重复索要许可；不扩大工程或发布权限。此次仅更新 Skill，无 Bridge 接口或服务改动，不需因本次修复重启 Bridge。已观察的 Desktop read_thread 正文限制仍可能阻止无人确认的自动回传，不能仅靠导入 ZIP 宣称闭环完成。事实与验收用例见 [来源回传核查](RETURN-ORIGIN-VERIFICATION.md)。

## 中央 Workspace Routing

v0.1.14 每次新派发读取 https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md 的完整当前内容。唯一权威源为 `dingxifan/chatgpt-codex` / `main` / `config/CODEX_WORKSPACE_ROUTING.md`。Project / Space 无需保存 routing table，遗留副本不参与路由。中央源读取或验证失败返回 `WORKSPACE_ROUTING_TABLE_UNAVAILABLE`，在任何 artifact 写入和 codex_start 前停止；没有 Project Files、Memory、历史、本地副本或其它仓库 fallback。

按中央表精确匹配 repository/workspace，冻结 computer、namespace 和实际工具句柄；所有 artifact_put 与 codex_start 使用同一 namespace。目标工具不在当前目录中时返回 `WORKSPACE_BRIDGE_UNAVAILABLE`，不尝试另一台机器。2026-10-06 已按用户要求核实并启用 Laptop 的 feishu-collection 和 auchi-laptop 路由；运行时状态仍以中央表本次完整读取为准。未知项目不猜测仓库身份，disabled 项需明确确认后才修改中央表。

从旧版升级应使用两个 manifest 一致声明的目标版本 ZIP（当前 v0.1.18）并开始新会话，核对 Skill 内容。账号已安装相同版本且内容核验相同时不重复导入。导入 ZIP 不代表账号更新成功；Refresh tools 也不能替代 Skill 升级。源码、构建和运行副本的核验见 [发布检查路径](RELEASE-PATH.md)，连接工具元数据仍按下文核验。

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

## 工具元数据刷新（安装及更新条件）

ChatGPT 可以继续保存旧工具定义，即使本机 Bridge 已更新并连接成功；更新 Skill 不会自动更新另一个 MCP 连接的工具目录。旧版 codex_get 的轮询说明、since_revision 参数或 wake_probe 可能因此仍被提供给模型，与当前 Skill 冲突。安装/更新不能只验证本机服务，也必须验证 ChatGPT 实际加载的定义。

1. 先确保实际运行的 Bridge 使用本仓库代码，并通过 Test-Bridge.mjs。包含 discovery fallback 的源码必须重新构建并重启到实际服务；只 git pull 或更新 Skill 不会更换已运行的旧程序。
2. 在 ChatGPT 网页端打开现有 Codex Bridge 插件。2026-10-04 实际验证的自建开发连接入口是名称右侧 **⋯ → Manage → Refresh tools**，位于管理页的 Manage app 区域。Connected 菜单只管理连接，不应把 Connect/Disconnect 当作工具定义已刷新的证据。若界面没有该入口，确认是否为自己有管理权限的开发连接；工作区发布的 App 由管理员按其更新流程处理，不要自动删除或重复创建连接。
3. 若出现 Couldn't update the app，不报告刷新成功。核对实际服务的协议响应：无会话 server/discover 应返回 HTTP 200 和 JSON-RPC -32601 Method not found，随后可执行旧版 initialize。本次实测本机仍运行旧 complete 响应时刷新失败，部署已验证的 fallback 后刷新与新会话核验成功。
4. 完成扫描后使用新会话加载该连接，核验**本轮实际工具定义**，而非让模型按常识描述。已有会话可能保留旧上下文。仅为元数据核验，不调用任何 Bridge 工具、不派发任务、不查询 Job。

通过条件：

- 工具集合恰好为 artifact_put、codex_start、codex_get。
- 没有 wake_probe、旧 continue/approval 工具或 since_revision 参数。
- codex_get 的描述明确只供用户要求的查询/诊断，禁止自动 start/get 轮询。

可在已选择 Codex Bridge 的新聊天中发送：

> 仅依据本轮已提供的 Codex Bridge 工具定义，列出工具名称，并说明 codex_get 是否含 since_revision、描述是否禁止自动轮询。不要调用任何工具，不要派发任务或查询 Job，不要执行命令。如果看不到工具定义，请如实说明，不要猜测。

未能核验时把此步骤报告为 pending；不要宣称安装已全部完成。刷新后仍看到旧定义，继续定位连接元数据，不通过增加 Skill 重复禁令掩盖冲突，也不查询运行中的任务来测试。

官方参考：[开发连接元数据刷新](https://developers.openai.com/plugins/deploy/connect-chatgpt)。界面可能随版本或工作区权限变化，以实际可见入口为准。

## 端到端验证

v0.1.10 将“派发 → 执行 → 自动回传核验后的发起对话”作为默认流程。Skill 不另设授权字段、使用约定确认、逐任务询问或审批步骤，也不等待用户再补一句“你自己发过去”。

实际消息工具的既有约束继续有效；Skill 不伪造人类许可，也不要求模型绕过工具规则。若实际工具约束无法满足，准确报告该限制和完整结果，不把授权障碍误说成没有回传工具。用户明确要求人工搬运或禁止消息时仍按其限制执行。

若确有消息工具，但是否发送、目标或工具要求的授权尚不明确，Codex 应主动在接收任务的对话问一次具体问题。例如，目标已核验时：“结果已准备好，是否允许我将本任务完整结果回传到「准确的发起对话」？”目标未核验时先询问准确目标，不猜测发送。已有明确适用指令时不重复询问；无人回复时等待，不自动变成人工搬运或声称 Goal 完成。没有可交互渠道或消息能力时，才按事实输出完整结果及具体待办。

由用户在安装好的 ChatGPT 会话中明确要求：使用 codex-dispatch 派发到自己的准确工作区，仅查看仓库状态、不修改文件，并回传结果。Skill 应生成强制 Goal 与来源绑定，成功派发后结束，不主动 codex_get。

观察 Codex 桌面中出现任务、正确工作区和实际只读结果。原生回传或可信 ID 不可用时，仍需检查可用的标题与本次任务上下文核验路径；只有安全自动回传确实无法完成时，才输出完整人工回传结果、具体阻碍和路由核验事实，不伪装自动回传成功。

参考：[Tunnel 官方说明](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)、[插件使用说明](https://learn.chatgpt.com/docs/plugins)。Secure MCP Tunnel 用于私有开发连接，不是公开插件目录的公共 MCP 分发端点。
