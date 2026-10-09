# 单文件交接：本地候选实现

本变更尚未安装、发布或完成真实长程验收。保留原插件身份与三个工具名；启动和查询参数已改变，不能只导入 Skill 就认为现有服务接口已更新。

## 主线与文件位置

3A：ChatGPT 按现有 Skill 的[单文件格式](../plugin/codex-dispatch/skills/codex-dispatch/references/instruction-file.md)生成完整指令，通过所选 Bridge 的 artifact_put 落盘，不按文字长度分流。

3A → 3B：Bridge 校验实际文件、SHA256、token、唯一元信息、工作区和 Goal 长度；原生创建前先独占保存同 token 的回执，再沿已有 Desktop 适配器创建。原生启动文本仅从文件生成 Goal 与读取要求，不是第二份业务指令。

3B：同一个 Codex 任务实际激活 Goal，核可信当前权限，读完整文件并核摘要/token/任务/基线，留下接收证据。created 只代表创建，不代表这一步已完成。

持续执行：沿同一 Goal 工作，阶段进展写 status，需要细节、依据冲突或最终审计时回读同一指令。回传前先读原始授权与已有真实核验记录，按真实工具合同复用适用授权；文件或程序不替代人类许可。

当前正常主线使用一个本地交接检查程序：[精确调用规约](../plugin/codex-dispatch/skills/codex-dispatch/references/handoff-kernel.md)。指令元信息声明有序 checkpoints 和每阶段 required_checks；没有这些确定条件时，派发前拒绝。接收、阶段检查／推进、结果冻结均使用同一程序。get_goal 的实际报告与可信当前权限数据需要核验；程序对数据结构／任务／Goal 绑定的检查不冒充原生鉴别。

默认目录为 `%USERPROFILE%\.codex-agent-mcp\handoff`，使用现有 CODEX_AGENT_HANDOFF_ROOT 行政配置。指令 `<token>.instruction.md`、进展 `<token>.status.md`、完整结果 `<token>.result.md` 使用同一父目录；根目录的 `<token>.receipt.json` 保存实际关联。文件输入在实际 root 内有界读取，不开放任意路径接口。

## 实际接口

artifact_put 参数仍是 filename、content、可选 expected_sha256。文件不可覆盖。

```json
{
  "instruction_file": "<artifact_put返回的实际绝对路径>",
  "expected_sha256": "<实际64位SHA256>",
  "dispatch_token": "<文件中的同一UUID-v4>"
}
```

codex_start 只接受上面三项。不再接收 workspace/prompt，不回退旧文本接口。文件元信息的 workspace 保留所选配置值；实际物理路径经过 allowlist 与唯一原生项目匹配。

codex_get 保留 detail=compact|standard|debug，恰好选择一个：

```json
{"job_id": "<真实Job>", "detail": "standard"}
```

或：

```json
{"dispatch_token": "<同一token>", "detail": "standard"}
```

token 查询只读本 Bridge 同名回执。Job 查询调用已知原生任务，并在同 root 的回执文件中查对应关联；旧 Job 无回执时返回原生快照并明确关联未知。不扫描其他电脑或聊天窗口。

本地回执损坏／冲突不阻断显式 Job 的原生查询：返回原生快照，关联记为不可取得，并保留 lookup_errors；不猜指令或来源。token 缺少可读的准确回执时仍拒绝查询，不猜 Job。

## 创建与失败事实

- 校验失败：not_created／DISPATCH_INSTRUCTION_INVALID；不调用原生 start。
- 原生提交前确定拒绝：not_created／DISPATCH_REJECTED。
- 创建请求后结果不明：unknown／DISPATCH_OUTCOME_UNKNOWN；已有 reservation 留存，不自动重派。
- 已确认 Job：created；导航或保存最终回执失败仍返回真实 Job。
- 保存失败：receipt_saved=false 和明确 receipt_error；回执可能仍为 unknown，此时不能声称 token 已能查到 Job。保留原调用中的 Job 供查询。
- 同 token 再提交：拒绝新提交，返回可读的已有事实。相同 token 的并发请求也最多调用一次本地 start；这不构成原生 exactly-once 承诺。
- 已有回执不可读／损坏：先前创建结果保持 unknown，新尝试未提交；不能把读取失败称为先前任务未创建。

创建前回执预留的 unknown 仅表示没有已确认结果，不能推定请求已提交。预留失败不发起原生创建。已预留 token 不自动复用；需要修正 immutable 文件时使用新文件名，已创建或不明任务必须先人工核查。

## 查询证据

thread_status 是原生线程状态；last_turn_status/time 是最近一轮及可取得的时间；observed_at 是查询时间。旧 status 字段现在与 thread_status 一致，不再使用最近一轮状态代替整个任务。

receiver_status/result 是对应注册文件的完整 UTF-8 内容、实际 SHA256 和更新时间，明确标为 receiver_file_report；拒绝越界、二进制、超限或不匹配的路径，不静默截断。文件存在、turn completed、idle/notLoaded 都不是整体完成证据。

status 由程序统一生成 codex-status/v1 的 Markdown＋JSON，保存当前阶段、必需检查的报告结果／证据历史、必要阻碍／决策、核验定位、版本号和冻结结果摘要。正常更新用瞬时锁、expected_revision、前一份文件摘要和原子替换；不允许直接手改或旧自由文本替代。缺检查、FAIL／NOT_RUN、跳阶段、任务／Goal／权限声明冲突、漏掉原始核验定位或仍有必要决策时拒绝推进／冻结；普通检查失败可在同阶段修复。

查询用同一个验证器。缺失／不合法 status 明确报告，未全部通过并冻结的 result 不返回正文。冻结后正文变化也拒绝；返回正文来自同一份已经检查摘要的读取快照。check(delivery) 每次加载唯一指令中的原始回传／授权资料和保留的核验定位。结构检查通过不代表人类许可成立、原生 Goal 完成或项目验证真实通过。

受管任务的 final_message／原始 debug 助手正文不再作为结果旁路；只保留线程／turn 的原生诊断元数据，正式正文由 result 返回。无可用回执的旧 Job 仍能查询原生信息，但交付检查明确 unavailable，不冒充本方案已验收结果。

四份持久文件保持不变；写入时的锁／临时文件正常会清理。原生任意直接工具调用无法由这个本地程序拦截，因此这里没有声称全局不可绕过，也没有新增后台监督、另一套指令、授权凭证或兜底执行器。

目前支持的 native wait_threads 不含 Goal 状态。goal_status 固定报告 unknown，来源为 not_available_in_native_snapshot；不改技术调用上下文去冒充接收任务调用 get_goal。接收端报告只是注明来源/时间的证据。

来源字段标为 unverified_at_bridge，只保存声明及证据定位；回执不是原生父聊天绑定或授权凭证。原窗口的定位/人类许可仍按真实工具合同核验。

## 本地验证与后续边界

本地验证：Bridge typecheck、test、build、Skill 契约测试及 Skill 格式验证。测试使用临时实际文件、InMemoryTransport 和原生调用替身，不连接真实任务创建/发送工具。

离线测试证明文件/证据完整性、固定 Goal 生成、关联和失败语义；不能证明模型必定读对授权，也不证明两三个小时后的真实执行或回传已经通过。后续需另行允许运行副本更新、工具元数据核验和一次真实长程验收。
