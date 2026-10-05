# 安装端 Codex 执行说明

本仓库的默认任务是为当前使用者安装 codex-dispatch 与原生桌面 Bridge。先读 INSTALL.md、SOURCE.md 和 docs/CONNECT-CHATGPT.md；不需要从聊天历史猜测安装步骤。

1. 确认 Windows、Node 20+、已登录的 Codex 桌面，以及当前执行环境中 CODEX_APP_TOOLS_PIPE_PATH、CODEX_THREAD_ID、CODEX_MCP_NODE_PATH 的存在性。只报告存在与否，不输出这些上下文的值。
2. 通过当前可用的 list_projects 查找使用者指定的工作区；用真实绝对路径生成 allowlist。未指定时先列出候选并确认实际目标，不默认允许整个磁盘，不把下载目录自动当成业务工作区。API 暴露不到多根项目的额外 root 时说明限制，不重定向到另一个 root。
3. 使用 scripts/Install.ps1，安装仓库依赖、构建、安装本地 Skill、生成 .local/bridge.json。已有同名 Skill 内容不同时先比较；仅在用户要求更新该 Skill 时使用 -UpdateSkill。不修改全局模型、审批、sandbox 或现有 MCP 配置。
4. 运行 Bridge 的 typecheck、test 和 build。用 Pack-Plugin.ps1 生成插件包。保存用户的现有项目、配置和进程。
5. 检查本机端口；已有服务时先识别，不终止、不复用未确认的服务。必要时给新安装选择空闲端口并同步本地配置与 Tunnel 目标。
6. 从当前桌面上下文启动 Start-Bridge.ps1。没有上下文时仍完成准备和构建，明确报告 DESKTOP_CONTEXT_REQUIRED；不要复制另一台机器的 pipe/thread ID、调用私有协议、启用旧执行服务器或伪造 ready。
7. 运行 Test-Bridge.mjs 验证真实 MCP 工具集合和文本落盘。此脚本不派发工程任务，也不调用 codex_get。
8. 按 CONNECT-CHATGPT.md 检查或配置用户自己的 Tunnel。优先复用已知且属于用户的配置；凭据通过用户自己的安全入口提供，不要求把密钥贴入聊天。不生成密钥或把凭据写进 Git。
9. 在受支持的 ChatGPT 安装入口导入 out/codex-dispatch-v0.1.10.zip，并为该账号连接自己的 Bridge。有可用且获准的界面工具时可协助；登录或账号授权界面需要用户完成时，保留已完成工作并列出具体下一步。不宣称 Codex 文件系统安装已完成账号安装。
   已有连接按 CONNECT-CHATGPT.md 刷新工具元数据并在新会话核验实际定义。不得以本机 tools/list、Connected、Skill 更新或没有报错代替此核验；不能完成时将元数据步骤标为 pending。核验只读取工具定义，不调用 codex_start/codex_get；不要为确认刷新而查询现有 Job。
10. 让用户从已连接的 ChatGPT 明确发起一次只读测试任务，完整遵循 Skill 的 Goal、来源绑定和回传规则。必须观察任务进入正确桌面项目及实际结果；仅 start acknowledgement 不等于成功。先按 Skill 检查接收端实际回传能力并完成适用的安全路由核验；只有无法安全自动发送时才输出人工搬运结果和具体阻碍，不增加轮询。

报告实际状态：PREPARED、LOCAL_READY、CHATGPT_CONNECTED、END_TO_END_VERIFIED，以及各状态的证据与待办。未完成的状态明确为 pending，不把这些临时报告建设成状态数据库。没有端到端证据时不报告全部安装完成。

脚本支持依赖复用与隔离测试，但新电脑必须真实安装依赖；-SkipDependencies 仅用于确认已有依赖的情况。不要替使用者部署共享多人服务器。仓库发布不是安装的一部分。
