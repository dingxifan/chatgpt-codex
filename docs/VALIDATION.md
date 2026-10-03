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
