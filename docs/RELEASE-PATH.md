# 发布与实际生效核验

本仓库唯一维护路径为 `E:\tools\codex-from-chatgpt`，origin 为 `dingxifan/chatgpt-codex`。安装、构建、部署、账户插件更新和会话工具刷新分别验收；Git 更新或相同版本号不证明运行副本已经更新。本文件是检查流程和一次事实快照，不是任务／状态数据库。

## 版本约定

- Dispatch 插件版本以 `plugin/codex-dispatch/plugin.json` 和 `.codex-plugin/plugin.json` 的一致声明为准，当前为 `0.2.0`。Skill 正文没有版本标签，以 SHA256 比较内容。0.2.0 的单文件输入与旧 workspace/prompt 接口不同，Bridge 和账号 Skill 必须一同更新，并核验实际加载定义。
- Bridge package 和 MCP server 保留上游包版本 `0.3.1`。它与插件分开编号，不能把插件版本写到 Bridge 上来制造一致性。相同 Bridge 包版本的补丁用 Git commit、dirty 状态、源码／产物摘要和工具定义辨别。
- 路由文档中 `v0.1.14` 表示中央路由引入版本，Laptop 升级文档和旧安装记录是历史快照；不批量改写历史版本。
- 插件内容改变且要发布时，按现有语义版本约定同时更新两个 manifest，保留旧 ZIP。只有文档／发布检查改动且插件内容不变时无需增加插件版本。下文第一阶段快照没有更改 Skill 或工具接口；后续 Skill／源码变更仍按各层分别发布核验，不能把该历史结论套到当前修改。

## 一条可检查的路径

1. 在维护目录核实 `git status --short`、`git rev-parse HEAD`、`git remote -v`、远端 main 和并发任务。先保留已有更改。构建依赖来自本仓库锁文件；新电脑运行 Install.ps1 安装依赖，已有依赖可按安装说明复用。
2. 运行 Bridge 的 typecheck、test、build。Windows 测试环境按 INSTALL.md 设置当前进程的 CODEX_WORKSPACE_ROOT、TEMP 和 TMP。发布检查另运行 `node --test scripts/Release.test.mjs scripts/Skill.test.mjs scripts/Kernel.test.mjs`，覆盖脚本保护、固定信封、可选发布字段与旧路由兼容；这些模拟测试不代表接收模型的语义判断或实际多远端发布已验证。`npm run build` 在编译成功后生成 `bridge/dist/build-info.json`，记录来源 commit／dirty、包版本和完整源码／产物文件摘要。下载包没有 Git 时来源为 null，不伪造 commit。
3. 仓库根运行 `node scripts/Build-Info.mjs --verify`。源码或产物改变、记录缺失都拒绝；Start-Bridge.ps1 在启动前做同一检查。构建记录不是安全签名，也不证明某个进程正在加载这些文件。独立部署需保留 bridge 的 src、dist、package／lock／tsconfig 和同一相对位置的 scripts/Build-Info.mjs，先在准备副本校验，不能对正在使用的副本原地覆盖。
4. 运行 `scripts/Pack-Plugin.ps1`。它核对两个 manifest，生成目标版本 ZIP，逐项比对 ZIP 与源码的完整文件集合及字节摘要。已存在且完全相同的 ZIP 复用；同版本内容冲突报错且保留文件，不覆盖。只核验用 `-VerifyOnly`。保留输出的 ZIP SHA256，不为每台电脑重打包。
5. 对本地安装的 Skill 比较源码 SHA256。默认 `.agents/skills` 与 Codex 插件缓存是不同安装方式。已有自定义文件先比较，获准更新时才用 Install.ps1 -UpdateSkill；插件缓存由支持的插件更新入口管理，不直接覆盖缓存。本地缓存不证明 ChatGPT 账户已发布。
6. 按监听端口识别进程的实际入口，核对对应副本的来源和摘要，不能把维护目录 `.local/bridge.json` 当作另一个副本的配置。授权切换时保留现有 allowlist、handoff、Tunnel 目标及来源事实；从有效 Desktop 上下文启动。不同端口先选择空闲端口，网络或 Tunnel 改动需单独授权；不停止未知服务。
7. 用只读模式核实运行中的工具定义：

   ```powershell
   node scripts/Test-Bridge.mjs --url http://127.0.0.1:8787 --definitions-only --compare-build
   ```

   此模式只做健康／就绪、discovery、initialize、tools/list；不调用 artifact_put、codex_start 或 codex_get。逐个工具输出完整定义摘要与 matches_build，有差异退出非零。普通 Test-Bridge 模式仍验证真实文本落盘，不能将其当作无写入检查。
8. 账户侧按 CONNECT-CHATGPT.md 使用支持的插件详情／更新入口核验发布版本、来源和 Skill 内容；只能使用实得 plugin_id／release ID，不猜测。相同内容已安装则复用身份，不创建替代插件。然后刷新 Bridge 工具元数据，在新会话读取实际工具定义，比较描述、参数、工具集合和禁止轮询规则。只读取定义，不查现有 Job。账户插件和会话工具是不同层，分别记结果。
9. 需要端到端验收时，让用户从正确 ChatGPT 来源发起明确只读任务，遵守 Skill 的 Goal、文件／任务准入、来源绑定和安全回传要求。观察进入正确桌面项目及实际结果；不自动轮询。未经此证据不宣称全部安装完成。

## 2026-10-07 Desktop 第一阶段部署前快照

本轮开始本地 main `0a9c64c2c22ea6267c165574444e7d69de7faa80`，工作树干净。只读远端核实 main 为 `87622f161791c02d2d44ba0a20612c8ac000b03e`，差异仅为 auchi 路由 hostname；已快进至该基线并创建本地分支 `fix/release-path-verification`。未提交或推送。任务列表未显示另一个正在维护本仓库的本地任务；它不构成所有进程都无并发写入的保证。

| 层 | 实际证据／状态 |
| --- | --- |
| 环境 | Windows DESKTOP-6CNV6UL，Node v24.19.0；PIPE_PATH、THREAD_ID 存在，MCP_NODE_PATH 不存在。只报告存在性。不能从本会话启动新 Bridge：DESKTOP_CONTEXT_REQUIRED |
| Desktop 项目 | list_projects 返回 Codex Bridge Codex，主路径精确为维护目录 |
| 源码插件 | 两个 manifest 均为 0.1.15；Skill SHA256 `10c481c91b0c1b0767ed674cbf75b225f08be7c9911e3fe720d30c1cf80de271` |
| ZIP | 已有 out/codex-dispatch-v0.1.15.zip 与源码逐文件一致，复用；ZIP SHA256 `08a718480747689ac73c5b8f0d964e23bc0303caf1b094b17bfa07469d6bc7b6` |
| 本机 Skill | 默认 C:\Users\Administrator\.agents\skills\codex-dispatch\SKILL.md 不存在；实际可读缓存为 C:\Users\Administrator\.codex\plugins\cache\created-by-me-remote\codex-dispatch\0.1.15，两个 manifest 为 0.1.15，Skill 摘要与源码一致；缓存无准确 backend plugin_id／release ID |
| 维护目录构建 | Bridge 0.3.1，typecheck、44 项测试、build 通过；新 build-info 指向上述基线，dirty=true，源码／产物验证通过 |
| 当前运行副本 | 8787 的 node PID 29088 入口为 C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261001\dist\src\index.js；18787 未监听。health ok、ready 与 desktop_connected 均 true。未覆盖或重启 |
| 运行来源 | runtime-source.json 保留 source_commit 20aae685ca8e7e8068871fb3b50c4fc2775081be、历史 source_workspace 和 discovery／LINT 补丁记录；不能将其重写成当前部署来源 |
| 运行定义 | 实际 MCP server 版本同为 0.3.1。artifact_put、codex_get 与构建完整定义相同；codex_start 定义不同，参数仍只有 workspace、prompt。实际描述开头 Create and show…；构建开头 Dispatch a task… |
| 账户插件 | pending：父任务发现接口未取得准确 backend plugin_id／release ID，本地缓存不能替代账户发布版本核验 |
| ChatGPT 新会话定义 | pending：父任务已见 Desktop／Laptop 描述差异及当前 Skill 权限检查；刷新后的新会话全文核验尚未完成 |
| 端到端 | pending：本阶段没有新派发或回传测试，没有调用 codex_start/codex_get |

完整工具定义 SHA256（键排序后 JSON，不含会话上下文）：运行 codex_start 为 `59b48e931762e3fd43121858903fb0b7769e77e59fd4a0d6d918a1bc2fc4b6b1`，构建为 `f4a6c242ca61d36d3c59f960edeb5f6cb28bc8453cc779a56cc76df54bb6fdc7`。运行 mcp.js 与本轮构建也不同，不能用共同的 0.3.1 判断已升级。

逐文件 SHA256 比较：运行 src/config.ts、desktop.ts、discovery.ts、index.ts、mcp.ts、workspaces.ts 与维护目录不同；忽略行尾后，仅 desktop.ts 的项目未匹配报错文案和 mcp.ts 的 codex_start 描述不同，其余四项仅行尾差异。运行 dist/src/desktop.js、mcp.js 及各自 source map 不同，其他 JS／map 相同；package-lock.json 和 tsconfig.json 相同。package.json 本轮差异是 build 命令追加来源记录。运行副本未包含新 build-info.json。上述差异没有证明额外保护逻辑已部署，本阶段没有实现第二项保护。

验证：Bridge typecheck、按 INSTALL.md 环境运行的 44 项测试和 build 通过；`node --test scripts/Release.test.mjs` 的三项回归（构建漂移拒绝、ZIP 复用／冲突保护、定义模式无工具调用）通过；Test-Install.ps1、脚本语法、ZIP VerifyOnly、Build-Info --verify 和 git diff --check 通过。实际 8787 的只读 compare-build 按预期退出非零，准确检出 codex_start 定义差异，不算目标部署验收通过。初次测试缺少说明要求的测试环境，受短路径 TEMP 影响；设置本次进程环境后通过，未改全局设置。

最小后续操作由父任务处理发布边界：先审阅并提交这批本地修改，固定提交后重建；准备新运行副本并验证，与现有 8787 入口做明确的计划切换。该步骤可能造成短暂连接中断，并需要有效 Desktop 上下文；当前服务保持运行。沿用已核实的用户配置和 Tunnel 目标，不扩大工作区。插件源码本轮未改、已有 ZIP 内容相同，不需要因本阶段重新发布插件；账户内容核验如发现差异再走其更新入口。Bridge 切换后重新核验运行定义，刷新账户工具元数据并在新会话核验。

本阶段 PREPARED 已有构建／打包证据；运行服务的健康就绪已验证，但当前目标构建的 LOCAL_READY 仍 pending（尚未部署，也未跑目标副本文本落盘）。CHATGPT_CONNECTED 的新定义验收和 END_TO_END_VERIFIED 均 pending。第一项的本地检查路径与文档改进已完成，实际各层统一生效尚未完成。

后续独立审阅：12 个修改文件均限于版本说明、构建来源、启动前验证、ZIP 完整性及只读定义核验；Bridge src、插件内容、中央路由均未改。补正 ZIP 文件名比较为区分大小写，并拒绝 Build-Info 未知参数，避免误拼验证参数反而生成记录。回归覆盖源码修改／新增／删除使摘要失效、产物修改拒绝、未知参数不写记录、重复打包复用相同字节、冲突不覆盖、VerifyOnly 不创建输出目录，以及定义核验不调用工具。

启动核查：旧运行副本 start-environment.ps1 调用 start-bridge.ps1；后者检查当前会话 PIPE／THREAD／MCP_NODE_PATH，而实际 Start-Process 使用已存在的普通 node.exe。本轮 Process、User、Machine 的 MCP_NODE_PATH 均不存在，不能据此断言其它 Desktop 会话也缺失，更不需要永久全局设置。当前 `Get-Command node` 得到的可执行文件与旧服务实际可执行文件一致，可在本次启动 PowerShell 进程内临时执行 `$env:CODEX_MCP_NODE_PATH = (Get-Command node -ErrorAction Stop).Source`，不持久化或复制 PIPE／THREAD。启动脚本所用已安装 App Tools 0.1.5 server.mjs 存在。

用户已授权本阶段提交推送和运行切换，但未授权合并 main。部署先从已提交内容准备同结构的新副本（bridge 与 scripts），复用经相同锁文件确认的现有依赖，保留旧副本完整作为回滚。先在既有空闲 18787 配置验证当前上下文和工具定义并停止该临时验证进程，再通过旧 stop-bridge.ps1 的 PID／时间／入口检查停止旧 8787；启动新副本、检查来源、ready、文本落盘与定义。若新副本未就绪，停止经身份确认的新进程，再以相同当前 Desktop 上下文启动保留的旧副本。Tunnel profile、网络、安全权限、凭据、handoff 与 allowlist 保持既有配置。此处记录计划；实际提交、部署与回滚结果以阶段交付报告为准，不预先宣称成功。

## 2026-10-07 获准切换后的事实

代码提交 `d998c8cfb0be8281dfa85ccd00846b6a697dc649` 已推送到 `fix/release-path-verification`，未合并 main。本节是随后追加的文档记录，不改变部署代码或将文档提交冒充运行代码来源。

| 项目 | 核实结果 |
| --- | --- |
| 当前 Bridge 根 | `C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261007-d998c8c\bridge` |
| 当前入口／PID／端口 | 根目录下 `dist\src\index.js`；PID 40128；8787 |
| 当前启动入口 | 根目录下 `start-bridge.ps1`；从有效 Desktop 会话启动，新增构建摘要闸门。start-environment.ps1 同样指向新副本，但本次未调用其中的 Tunnel 启动逻辑 |
| 来源 | runtime-source.json 与 dist/build-info.json 均指向 d998c8c，dirty=false；新副本摘要校验通过 |
| 连接 | health ok；ready=true；desktop_connected=true；既有 Tunnel runtime_state=ready、healthy=true、stale=false、ready=true |
| 定义 | artifact_put、codex_start、codex_get 全部 matches_build=true；codex_start 摘要为前述构建的 f4a6c242…，当前描述开头 Dispatch a task… |
| 文本落盘 | Test-Bridge 普通模式通过；文件为既有 handoff 根的 installation-check-26e5c5f3-4875-4558-b3c0-0e5ceff8fef3.txt，SHA256 `245d3898c57b67584df29f21c0d5be88872fff8fff515f5c30113fe92738cbe2` |
| 配置保留 | 新旧脚本的 workspaceRoots、handoffRoot、App Tools server 表达式逐字一致；未修改 Tunnel profile、网络、安全权限或凭据 |
| 临时验证 | 18787 先验证当前上下文可用、定义一致，再停止临时 PID 41404；最终该端口无监听 |
| 回滚 | 原 runtime-desktop-dispatch-20261001 完整保留；其停止脚本 PID／开始时间／入口闸门全部核验，旧 PID 29088 已正常停止。新副本成功，未触发回滚，也未额外演练一次来回切换 |

以后启动使用当前入口，而不是部署前快照中的旧入口；不要复用本次 PIPE／THREAD。当前上下文只需对普通 Node 路径作进程内设置：

```powershell
$env:CODEX_MCP_NODE_PATH = (Get-Command node -ErrorAction Stop).Source
& 'C:\Users\Administrator\.codex-agent-mcp\runtime-desktop-dispatch-20261007-d998c8c\bridge\start-bridge.ps1'
```

需回滚时，先运行当前副本 stop-bridge.ps1（会重新核实 PID、时间与入口），再从当前有效 Desktop 上下文运行旧副本 start-bridge.ps1；两者不能同时占用 8787。旧副本恢复的工具文案会回到已知旧定义，这是明确回滚结果，不能继续声称与 d998c8c 一致。若进程身份或活动状态检查拒绝，先诊断，不强制终止其它进程。

切换后 PREPARED 与 LOCAL_READY 已验证。GitHub main 合并、账户插件发布版本和刷新后的新会话定义仍待父任务；CHATGPT_CONNECTED 的新定义验收与 END_TO_END_VERIFIED 均 pending。本轮始终未调用 codex_start／codex_get，未实现第二项保护或第三项 Skill 精简。
