# 固定来源与许可

唯一维护和发布仓库：`dingxifan/chatgpt-codex`（https://github.com/dingxifan/chatgpt-codex.git）。`joseanu/codex-from-chatgpt` 仅为下述 Bridge 上游源码来源，不是本项目部署仓库。

v0.1.14 的运行时路由唯一权威源为本仓库 `main/config/CODEX_WORKSPACE_ROUTING.md`，固定 URL 为 https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md 。每次新派发重新读取；忽略 Project / Space 副本，失败即停止，不新增 parser、服务、缓存或 Bridge API。

- Bridge：来源项目 https://github.com/joseanu/codex-from-chatgpt ，本包采用本地 native desktop dispatch 分支快照 9545008a68a021791df1b722b4269e59424fd0e3。该快照没有推送到第三方仓库，因此用户不能靠克隆上游得到同样的原生实现。本仓库直接包含所需 src、test、package-lock、package.json 与 tsconfig，保留 bridge/LICENSE 中的原始 MIT 版权声明。
- 原生 Bridge 源码未在打包时重新设计；安装包装脚本和文档与其分离。不包含旧 app-server、protocol 生成物、任务状态或运行时数据。
- Skill：codex-dispatch v0.1.19，包含在 plugin/codex-dispatch/，精简交接职责，保留接收端实际权限核对、创建结果和安全回传，并携带中央表的可选发布目标／分支／顺序及工作区 Git 全同步兜底；保留 v0.1.14 的 UUID、workspace 路由和有限来源查找规则。当前版本由两个 manifest 一致声明，正文无版本标签；用文件摘要核验副本，不凭缓存目录名判断账号已发布。没有绑定维护者的 ChatGPT 插件 ID 或 MCP 账号连接。
- Bridge 源码增量包含派发前结构 LINT、实际 workspace 交叉校验、唯一 Desktop 项目匹配和 created/not_created/unknown 创建结果分类。保留公开工具输入与原生后端；已确认的 job_id 不因导航失败丢失，提交后未知结果不自动重派，Dispatch token 不是原生幂等键。部署条件与结果字段见 INSTALL.md。
- 安装包装脚本和文档：本仓库新编写。Bridge 的上游许可证不改变；如维护者准备对新文件采用额外许可证，应在发布前明确选择，不能假称第三方版权归本仓库所有。
- 对上述 Bridge 快照的兼容性修订：无会话的新版 server/discover 探测返回 HTTP 200、JSON-RPC -32601 Method not found，允许客户端继续旧版 initialize 会话流程；不宣称实现新版 stateless 协议。此修订来自另一台安装机器实际验证后提供的差异，源码和回归验证现随本仓库分发。Bridge 不再与上游快照逐字节相同；其余原生派发逻辑保留。
- 派发前 LINT：新增纯结构校验器，在 mcp.ts 的 manager.start 之前拒绝不合格交接；桌面适配器、三个工具名称和入参不变。源码因此包含本仓库维护的校验增量，不能再用原始快照直接启动并声称 LINT 已部署。没有新增状态、回执、轮询或依赖。
- 首版范围：Windows、个人本机执行、已有 Codex 桌面能力。不是托管多人服务，不承诺普通终端冷启动或无人登录的零交互安装。

同步更新时固定版本、比较差异并重跑验证；不要下载浮动源码后声称它与此快照一致。

Bridge 包与 MCP server 的 `0.3.1` 是保留的上游包版本，与 Dispatch 插件 `0.1.19` 分开编号。相同包版本下的本地补丁需由 Git 来源、构建摘要、运行副本和实际工具定义辨别。发布边界与检查命令见 [RELEASE-PATH.md](docs/RELEASE-PATH.md)。
