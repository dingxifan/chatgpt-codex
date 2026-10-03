# 固定来源与许可

- Bridge：来源项目 https://github.com/joseanu/codex-from-chatgpt ，本包采用本地 native desktop dispatch 分支快照 9545008a68a021791df1b722b4269e59424fd0e3。该快照没有推送到第三方仓库，因此用户不能靠克隆上游得到同样的原生实现。本仓库直接包含所需 src、test、package-lock、package.json 与 tsconfig，保留 bridge/LICENSE 中的原始 MIT 版权声明。
- 原生 Bridge 源码未在打包时重新设计；安装包装脚本和文档与其分离。不包含旧 app-server、protocol 生成物、任务状态或运行时数据。
- Skill：codex-dispatch v0.1.4，来自维护者已保存并回读核验的插件源文件；原样包含在 plugin/codex-dispatch/。插件级默认提示、能力声明和兼容 manifest 保留。没有绑定维护者的 ChatGPT 插件 ID 或 MCP 账号连接。
- 安装包装脚本和文档：本仓库新编写。Bridge 的上游许可证不改变；如维护者准备对新文件采用额外许可证，应在发布前明确选择，不能假称第三方版权归本仓库所有。
- 对上述 Bridge 快照的兼容性修订：无会话的新版 server/discover 探测返回 HTTP 200、JSON-RPC -32601 Method not found，允许客户端继续旧版 initialize 会话流程；不宣称实现新版 stateless 协议。此修订来自另一台安装机器实际验证后提供的差异，源码和回归验证现随本仓库分发。Bridge 不再与上游快照逐字节相同；其余原生派发逻辑保留。
- 首版范围：Windows、个人本机执行、已有 Codex 桌面能力。不是托管多人服务，不承诺普通终端冷启动或无人登录的零交互安装。

同步更新时固定版本、比较差异并重跑验证；不要下载浮动源码后声称它与此快照一致。
