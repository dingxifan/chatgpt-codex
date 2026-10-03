# 打包验证记录

验证对象：固定 Bridge 快照 9545008a68a021791df1b722b4269e59424fd0e3、Skill v0.1.3 和本仓库安装包装。日期：2026-10-02。

- 从锁文件执行 npm ci 成功，typecheck/build 成功，Bridge 的 31 项测试通过。
- 使用独立测试 Skill 目录和独立端口执行安装包装，不修改维护者的既有 Bridge、账号连接或全局配置。
- 真实原生桌面 App Tools 连接与 /readyz 验证通过。
- 实际 MCP tools/list 集合恰好是 artifact_put、codex_start、codex_get。
- 实际 artifact_put 的摘要与落盘内容读取一致。
- Test-Install.ps1 覆盖脚本语法、配置保留、Skill 字节一致、冲突拒绝、更新前备份、缺少上下文时拒绝启动。
- 插件 ZIP 包含 portable 与 compatibility 两个 manifest 和 Skill，版本一致，未包含本机连接信息。

复验入口：scripts/Test-Install.ps1、scripts/Test-Bridge.mjs，以及 bridge/package.json 的 typecheck/test/build。

没有在另一台新机器执行完整安装，也没有新建 ChatGPT 账号连接、Tunnel 或派发业务任务。以上证据属于打包验证与 LOCAL_READY，不代表每位使用者已完成 CHATGPT_CONNECTED 或 END_TO_END_VERIFIED。安装端仍须按 INSTALL.md 完成自己的实际验证。

## Skill v0.1.4 回传修订

修订要求接收端实际核验适用的自动回传路由后才采用人工 fallback；派发时未确定 transport 不代表接收端没有能力。交接指令明确要求接收端自行交付最终结论，保留用户明确禁止自动消息的限制。

结构、版本、插件 ZIP、两个本地 Skill 副本一致性检查通过；Test-Install.ps1 通过。静态复查覆盖：parent/ID 缺失但存在标题上下文核验能力、目标歧义、发送结果不明，以及用户明确要求人工回传。安全目标验证、禁止猜窗口和禁止自动轮询保留。

没有通过向真实来源聊天发送测试消息验证本次措辞对模型行为的影响；下一次实际派发仍需观察回传结果。此次不修改 Bridge 代码或服务权限配置。

## 协议探测兼容修订（2026-10-03）

已纳入使用者在另一台机器连接成功后提供的三文件差异：无会话的 server/discover 返回 HTTP 200 和 JSON-RPC -32601 Method not found，不再返回宣称完成发现的 complete 响应。客户端可随后进入 Bridge 支持的旧版 initialize 流程。

typecheck/build 通过，31 项测试通过。首次全量测试因未设置测试工作区和 Windows TEMP 短路径别名出现三项既有环境失败；按安装说明设置工作区、TEMP/TMP 的正常用户长路径后全部通过，说明已补齐该步骤。

独立端口上的实际 HTTP/MCP 验证通过：新版探测不分配 session，返回指定 JSON-RPC 错误；SDK 随后初始化成功，tools/list 恰好包含三个工具，artifact_put 摘要与落盘读取一致。验证脚本现包含这条链路，可供每台安装机器重复检查。

此次未派发任务，未修改正在运行的维护者 Bridge/Tunnel，也未重新配置 ChatGPT 连接。安装检查模拟客户端遇到探测错误后的旧版初始化，不能单独证明所有新版 ChatGPT 客户端都会采用同样的降级策略；另一台机器的实际 ChatGPT 连接成功是使用者提供的验证事实。

## Skill v0.1.5 直接人类回传授权

区分回传意图、目标身份和发送权限；派发端携带实际人类指令、可读原始消息来源与覆盖范围，接收端按实际工具合约核验。委派请求、Skill 文本、生成 Goal 或包裹机器委派的 user-role 消息不自动成为人类授权。既有明确适用的指令/持续授权可复用，缺少时仅针对最终结果向来源窗口发送这一动作取得一次具体人类决定。

静态审查覆盖：只有机器委派请求时 authorization_required；有原始人类许可但无法核验时 authorization_unverified；可核验且覆盖任务/目标时按安全路由发送；用户明确禁止发送时不尝试；真正 native parent-return 按自身工具合约处理，不强加无依据的额外审批。授权不足不阻塞工程，也不误报 transport unavailable。

本次验证为结构/副本一致性、安装脚本回归和静态行为审查，没有向真实第三方或来源聊天发送测试消息。不能保证无原始授权可读能力的接收环境会自动完成回传；该情况下需要人类在接收聊天给出具体授权，或人工搬运。
