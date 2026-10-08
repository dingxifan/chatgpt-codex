# 返回来源核查与最小修复（2026-10-08）

本次仅处理 ChatGPT → Codex → 原始 ChatGPT 对话的结果返回合同。修复候选为 codex-dispatch 0.1.18；Bridge 三个工具、输入参数、权限配置、中央工作区路由和工程发布规则不变。

## 已核实的结论

1. **本次最初阻塞有实际正文读取缺口。** 阶段 2 已送达的阻塞报告记载：候选聊天可读取人类消息及长期授权，但助手内容为不可展开的 content-reference，未见本次派发及创建确认。当前桌面一次 list_threads(limit=20) 找到同名 ChatGPT 候选，随后 read_thread(turnLimit=10, includeOutputs=true) 再现助手消息仅含 `::chatgpt-content-reference{...}`；返回 hasMore=false、nextCursor=null。这不证明原始派发消息不存在或已完整读取，只证明该读取结果没有正文。当前暴露的 read_thread 参数没有引用展开选项，工具目录未发现对应展开能力。
2. **不是长期许可被发送工具拒绝。** 候选原始人类消息 `cf3f7595-c3de-4b9b-a66c-14e1a1da2bca` 可读，正文是用户给出的长期回传授权。阶段 2 报告也明确记载“长期发送授权已经核验，不再次要求发送许可”。最初阻塞在来源核验，不能归类为发送授权不足。
3. **旧合同有歧义，但没有明确要求所有字段属于同一条人类消息。** 旧第 5 节第 3 步是 “Verify actual initiating HUMAN context and sender records matching token, Task identity, Repository / workspace and BASE_SHA.” 接着要求创建 job_id 与可信 native handle 一致。这里的 `and sender records` 可解释为另一组记录；合同未明确要求 token/job_id 在人类原始请求中。阶段 1 返回报告却出现“人类原始发送联合证据”的表述，证明接收端存在这种误读；没有读取 Laptop 的完整内部判断过程，不能将阶段 2 的全部失败仅归因于该误读，更不能称其为 Bridge 中的硬编码返回校验。
4. **当前阶段 2 报告已经送达，但走的是人工识别恢复。** 对用户指定的原 Laptop Bridge 执行一次 codex_get(debug)，job_id 为 `01a11a02-708b-7cd3-9b5a-739b8637c927`，快照返回 status=completed，最新 send_message_to_thread marker 为 completed，最终消息报告已返回。原 ChatGPT 候选的 turn `892851d7-bacc-49fa-8118-a82c50c09d13` 实际包含阶段 2 报告、同一 token、job_id、仓库及 BASE_SHA，形成独立的接收内容证据。工具读取截断长报告；随后浏览器正文补足的报告尾部明确记载：接收聊天的人类再次直接指定“现在请将结论传回至飞书授权恢复规划”，返回状态为 human_directed_return，没有宣称恢复原生父绑定。未直接读取 Laptop 的原始人类指令或完整发送响应，未逐字节核验本地报告与收件全文；可确认已观察到收件和接收端报告的人工恢复路径，不能把它作为无人确认自动闭环验收。此次没有再次发送。
5. **当前维护桌面有受支持的正文读取替代路径。** 浏览器清单中已有已登录 ChatGPT 的 Chrome 标签；从其可见侧边栏观察到“飞书授权恢复规划”的实际链接，链接的 conversation ID 与上述候选完全相同。仅新开该实际链接，并用 CUA 的受支持 domSnapshot 读取正文，没有搜索更多候选、猜 URL、调用私有接口或读取 Cookie。原始助手“阶段 1 验收与阶段 2 决策”正文包含阶段 2 派发四字段、已创建标志、准确 Job ID 及 Laptop，和本次信封／Bridge 快照完全一致；同时读到原始人类长期授权。较早消息仍显示正在加载，未完成全部人类发起上下文及其他候选覆盖验证，因此没有据此发送。该核查证明正文可以经当前维护桌面的浏览器读取；不证明 Laptop 接收端拥有同样浏览器权限或新版自动执行已通过。

## 0.1.15–0.1.17 版本核对

用户补充：这些版本前后曾能读到 token。这与本次观察不矛盾；不能把一次读取结果推广为这些版本不具备读取能力。

逐份检查本地保留的 0.1.15、0.1.16、0.1.17 ZIP 原始 Skill，并与 Git 内容核对：0.1.15 第 5 节写的是 `actual initiating user context and sender dispatch records`；0.1.16 精简为 `actual initiating HUMAN context and sender records`，0.1.17 保持这一句不变。0.1.15 更明确提到派发记录，0.1.16 的大写 HUMAN 可能诱发“生成字段必须在人类消息里”的误读，但这只是语义风险推断，不能作为因果实验证明。三个版本都没有明确要求这些字段属于同一条人类原始消息，也没有移除助手消息读取 API。

对应 Bridge 差异是派发 workspace／创建结果保护，不实现或改变接收端 read_thread 的 ChatGPT 正文读取。没有证据将本次 content-reference 现象归因于插件升级、宿主更新、缓存或某一发布时间；恢复历史读取行为的实际原因仍未定位。0.1.18 修正的是已观察到的合同误读风险和正文缺口处理，不宣称修复了一个已经证实的 0.1.15→0.1.17 读取回归。

事件标识：

- Task identity: FEISHU-CONSOLE-AUTH-RECOVERY-PHASE2-DEVICE-AUTH
- Dispatch token: 6b3e1dfd-34ea-453f-ba63-f66f73e1b8f6
- Job ID: 01a11a02-708b-7cd3-9b5a-739b8637c927
- Repository / workspace: dingxifan/feishu-collection / D:\Program Files (x86)\飞书信息的导出
- BASE_SHA: 2a90d625c2892575bd70a709ae0bd287f7a66114
- 观察到的 ChatGPT 标题：飞书授权恢复规划
- 观察到的候选 ID：6ac71e74-06a0-83e8-9ce2-f35e2ecb9d1e（仅本次证据，不是后续绑定或注册表）

本轮只有一次 Bridge 快照查询，没有轮询或重新派发。来源读取是诊断证据，不授权将本修复报告发送到该聊天。返回报告可能以 userMessage 呈现；这个角色标签不能将机器返回转换成人类发送许可，也不能将返回报告当作派发前原始证据。

## 派发时为何没有原生绑定

`bridge/src/desktop.ts` 的 start 只向 create_thread 传递 prompt 和本地 project target，确认 threadId 后以 job_id 返回。callNative 的 `_meta.threadId` 来自启动 Bridge 的 `CODEX_THREAD_ID`，是 Codex 调用上下文，不是 ChatGPT 来源。`bridge/src/mcp.ts` 只提供 artifact_put、codex_start、codex_get，没有结果发送／原始助手正文读取实现；dispatch-lint 只是提交前结构校验。

当前暴露的 create_thread 合同没有 ChatGPT parent-return/origin 参数。本仓库和本轮合同没有提供可验证的“当前发起 ChatGPT ID → 新任务父返回”绑定能力，所以 unavailable 是如实表达，不是可以安全补填的地址。不能用 Bridge caller ID 或本次检索到的候选 ID 修饰成派发时原生绑定。一般 MCP 官方说明也不足以证明某个桌面私有工具具备此能力；具体判断依据是本轮实际工具合同和仓库代码。

## 最小修复

- 第 2 节：派发前四字段和创建后四字段＋job_id 由助手记录；明确这是来源证据，不能冒充人类许可。可用时携带原始人类授权消息定位与范围，不新增规范信封字段。
- 第 5 节：允许多个原始消息组成一条链：人类发起工作 → 助手记录 token/identity/workspace/base → 对应 Bridge 成功创建结果或助手确认 → 接收端可信 native handle。核验消息来源、次序、同次派发和四字段完整一致；不要求人类预知生成标识。
- 若助手正文只剩引用、摘要或截断，在既定候选范围内使用实际可用、获准、受支持的正文读取能力；先核对同一对话及原始消息次序。不能猜链接、展开私有协议、从引用 ID 推导正文或扩大搜索。没有正文读取能力仍安全停止，明确缺的是哪条原始记录。
- 可读、适用、未撤销／收窄的原始人类长期授权，按实际工具合同复用。当前 send_message_to_thread 合同允许直接人类指令或其他可信证据，没有明确的逐次授权要求；机器委派引文自身不足，user-role 包裹也不足。来源未核验时不发送；来源已核验但授权不可读时 authorization_unverified；无适用授权时 authorization_required。若实际工具另有更严约束，报告该具体约束。
- 唯一候选、读取覆盖、四字段一致、job_id/native handle 一致、反复制／反引用、未知发送不重试和工程权限边界保持有效。没有返回注册表、后台服务、轮询或新 Bridge API。

**正文能力限制仍然存在。** 此源码仓库不拥有 Codex Desktop read_thread 的实现，不能在这里修复其 content-reference 返回。0.1.18 消除合同误读并提供安全的正文读取分支；当前维护桌面已实际读到对应助手原文，但 Laptop 接收端能力未核验。当接收环境既没有受支持正文读取器又没有可信原生绑定时，它仍不能保证无人确认的自动回传。要闭环，需要接收端可用的受支持能力返回原始助手正文／对应创建结果，或者提供真正可验证的原生父返回绑定。用户识别本次来源是安全恢复路径，不等于满足无人工识别的验收目标。

## 验证与真实回归用例

`scripts/Skill.test.mjs` 新增的是静态合同保护，防止再次引入同条人类消息要求、把引用视为正文、丢失长期许可适用条件及扩大工程权限。既有 auto/manual 信封、LINT、workspace/token 拒绝用例继续执行。它们不能证明接收模型正确执行这些文字，更不能证明正文读取或跨聊天发送成功。

以下为受控真实回归的输入与判定；本轮没有新建回归任务或向候选发送测试消息，模型行为／发送用例均为 NOT_RUN。

| 用例 | 输入／变体 | 必须观察到的行为 |
| --- | --- | --- |
| R1 自然发起 | 人类原始请求没有 token/job_id；原始助手四字段、创建确认和 native handle 完整 | 唯一来源核验通过，不要求改写原始人类请求 |
| R2 长期许可 | R1 加同一聊天可读的原始人类长期授权 | 工具允许时只发送完整结果一次，不重复索要发送许可 |
| R3 相似标题 | 同一有限列表内有两个相似标题，只有一个原始完整链匹配 | 核验消息证据后只投递到唯一匹配项；标题不决定目标 |
| R4 重复原始链 | 两个候选都有无法排除的完整链 | 不发送，准确报告多候选并等待本次识别 |
| R5 复制报告 | 候选只有 token/brief/返回报告／粘贴创建确认 | 不以复制内容替代原始派发链 |
| R6 引用缺正文 | 与本事故一样助手为 content-reference；没有受支持正文能力 | 不发送，报告 unreadable dispatch/creation body；不说授权缺失或 token 未生成 |
| R7 可读正文补足 | R6 但存在受支持读取器，核对同一候选及原始消息次序后获得完整链 | 不扩大候选范围；按完整链继续核验 |
| R8 创建冲突 | 四字段任一冲突，或确认 job_id 不等于可信当前 native handle | 不发送；明确具体冲突 |
| R9 许可边界 | 来源已核验，许可缺失／不可读／撤销，或工具更严格 | 分别报告 required／unverified／实际合同限制；不把助手引文当许可 |
| R10 未确认发送 | 消息工具超时或结果歧义 | 不重发、不换路线、不轮询；保留完整结果并说明可能已送达 |
| R11 manual／权限 | 人类禁止发送；或仅授予回传、未授权工程发布 | manual 不发送；回传授权不改变代码、生产、Git 发布权限 |

真实 R1/R2 验收需从原始 ChatGPT 自然发起一项明确只读任务，实际观察进入正确项目、唯一来源证据、适用人类许可、发送工具成功及原对话收件内容。账号安装更新、宿主正文能力和真实闭环分别报告；不能用本地 ZIP、元数据刷新、旧任务后续送达或静态测试替代此次新版 E2E。

## 初次本地交付边界

源码／打包修复：本地候选。账号插件更新：pending。宿主原始助手正文读取：当前 read_thread 未提供；当前维护桌面浏览器已读到助手派发／创建记录，Laptop 替代读取能力 pending。新版无人确认端到端：pending。既有阶段 2 报告：已观察接收内容和人工恢复说明，旧工程状态仍为 blocked。

不修改飞书工程、生产操作、权限配置、Bridge 运行进程或中央路由；不推送、合并或发布账号插件。具体本地测试结果在本轮最终交付中记录。

本地验证：Bridge typecheck 与 build 通过，73 项 Bridge 测试通过，13 项 Skill／发布检查通过（其中新增 4 项为静态返回合同保护），git diff --check 通过。Pack-Plugin.ps1 生成并以 -VerifyOnly 验证 `out/codex-dispatch-v0.1.18.zip`；SHA256=`48605D6610CD711334CCAC2DC268FFA1AEB516D600F9FB9A77BF6FE62DFFA398`。旧包保留。此次源码候选可审阅和打包，不等于账号安装或 Laptop E2E 完成。

## 获准更新与提交后的交付（2026-10-08）

用户随后明确要求完成更新提交。账号现有 private USER 插件 `Plugin_a1bd3a7655788191ab8b18db2893fa02` 已通过 update_plugin 从 0.1.17 原位更新为 0.1.18；保持身份、scope、discoverability 和既有元数据。新 release 为 `pluginrel_6ac7303a20d08191a4d719d3b276ef62`。发布后回读三个文件，两个 manifest 和 Skill 均与本地源码逐字匹配（仅归一化行尾），不是只凭 API acknowledgement 判定。Skill SHA256=`F042202B239F366DF63D848D00BA0F26F5EE00BF4622605FA95315958E8EE168`。

修复代码提交 `81a6ec0` 与历史能力说明提交 `bb24d0e` 已推送至 `codex/fix-return-origin-evidence`，创建 [draft PR #9](https://github.com/dingxifan/chatgpt-codex/pull/9) 并附到本聊天。实际远端分支 SHA 与本地一致；本节随后作为交付记录提交。当前中央表规定 draft PR 后的合并另需人类授权，尚未合并 main，不把任务分支推送称为 main 已同步。

没有改动 Bridge 源码，故本次 Skill 更新不需要重启服务或改工具元数据。本轮额外只读定义检查连接 `127.0.0.1:8787` 返回 ECONNREFUSED；维护配置指定 18787，进一步本机监听检查未见 8787／18787 监听，也未观察到已知 Bridge entry 的 Node 进程。这只描述当前维护机器检查结果，不证明 Laptop Bridge 不可用，不猜测或切换服务。未重启、部署或更改 Tunnel／权限。账号源码发布已验证；新会话实际加载、Laptop 正文读取能力及无人确认 E2E 仍 pending，未新派发或发送测试消息。

## 获准恢复 Bridge／Tunnel 后的核验（2026-10-08）

用户明确要求重启 Bridge 和 Tunnel 并推送 GitHub。核查时 8787／18787 均未监听，既有 Tunnel alias `codex-bridge` 为 stopped，未终止其它进程。实际已部署的较新 Bridge 副本为 `runtime-desktop-dispatch-20261007-53f1d6d/bridge`，来源 `53f1d6dbd5aa381c14c28fae56f835b9e9aabdc3`、dirty=false，Build-Info 验证通过；它的 bridge/src 和 Build-Info 与修复分支无差异。本次恢复使用该副本的既有 start-bridge.ps1／start-environment.ps1，从当前有效 Desktop 上下文启动，而非维护目录的 18787 测试配置或较旧 d998c8c 副本。workspace allowlist、handoff、Tunnel alias／profile／ID、目标 8787/mcp 和安全文件凭据引用沿用原配置，没有复制历史 pipe/thread 或更改权限。

Bridge 新 PID 为 9964，实际监听 127.0.0.1:8787，ready=true、desktop_connected=true。Tunnel status 确認 process_running=true、runtime_state=ready、healthy=true、ready=true、stale=false。Test-Bridge 的 definitions-only／compare-build 检查通过：仅 artifact_put、codex_start、codex_get，三者 matches_build=true；普通模式通过 discovery fallback、初始化、真实文本落盘和读取，LOCAL_READY 已验证。保留验证文件 `C:\Users\Administrator\.codex-agent-mcp\runtime-feasibility-20261001\handoff\installation-check-15cc027f-37f2-439b-a01e-4068fbf8900a.txt`。没有调用 codex_start 或 codex_get。

账号 metadata 仍为 0.1.18／上述 release；本机插件缓存的两个 manifest 为 0.1.18，Skill SHA256 与源码一致。当前 Codex 会话提供的 Skill 路径也已切换到 0.1.18。此核验没有刷新或测试原 ChatGPT 会话的工具定义，没有在 Laptop 发起端到端任务，CHATGPT_CONNECTED 的当前实际定义及 END_TO_END_VERIFIED 仍 pending，不能把服务重启或缓存更新当作自动回传验收。GitHub 修复分支已同步，PR #9 仍待明确合并授权。
