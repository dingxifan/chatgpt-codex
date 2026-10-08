---
name: codex-dispatch
description: Prepare or dispatch ChatGPT-to-Codex handoffs when the user asks to hand off, send, delegate, execute, implement, or continue work in Codex or Codex Bridge, or generate an execution brief or manual handoff. Require Goal activation, bind the origin at dispatch, use exact artifact locators, return safely with human-relay fallback, and stop after dispatch without automatic polling. Exclude conceptual Codex/Bridge discussion, design without a handoff, explanations of past polling, and status-only queries.
---
# Codex Dispatch

Own the handoff: routing, materials, creation outcomes, execution-context checks, origin binding and final return. Carry the user's scope, validation and reserved decisions; detailed development, review and acceptance follow existing project/HACT instructions when applicable. Do not recreate those workflows or HACT records here. A project without HACT can use this handoff normally.

## 1. Mode and exact workspace routing

Dispatch only when the human requests actual execution. A request to prepare, draft or review a handoff stays prepare-only.

- **Prepare-only:** emit the complete validated handoff without codex_start. Manual instruction transfer does not select manual result return.
- **Dispatch:** submit the validated prompt unchanged once, then end the normal Bridge workflow. Continuing work does not authorize duplicate creation of an accepted or uncertain task.
- **Status-only:** an explicit status/result request authorizes one codex_get snapshot, no new task/artifact and no recurring monitoring. Use the task's original frozen Bridge when established; otherwise obtain workspace/repository or an explicitly confirmed originating Bridge. Re-read the canonical table when resolving an unknown route. If the original Bridge cannot be established, return JOB_ROUTE_UNKNOWN; never probe computers using a bare job_id.

For every new dispatch or prepare-only handoff, BEFORE origin capture or any artifact write:

1. Freshly fetch and read the COMPLETE current `https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md`. Its sole authority is `dingxifan/chatgpt-codex` / `main` / `config/CODEX_WORKSPACE_ROUTING.md`. Ignore Project/Space copies; current Project identity/access is not required. No previous read, Memory, history, local copy or other repository is a fallback.
2. Validate the entire table, including disabled entries: `Schema version: 1`; nonempty inline `Route ID`, `Repository` (owner/repository), `Workspace` (absolute), `Computer`, `Bridge namespace`, `Status` (active/disabled). Route IDs and exact workspaces must be unique. Unsupported/incomplete/malformed tables stop before writes or creation.
3. Supplied workspace must equal the WHOLE table value byte-for-byte, without normalizing case, slashes, separators, aliases, prefixes or nested worktrees. If repository is also supplied it must exactly equal that route. Repository-only selection requires exactly one active exact match and uses its configured workspace. Disabled/no matches stop; multiple matches never select first/newest/online. Do not infer a computer from path style, machine names, current client, BASE_SHA or history.
4. Freeze Route ID, repository, configured workspace, computer, namespace and observed tool handles. Establish exact namespace membership using catalog connector identity, including normalized identifiers; fuzzy tool-name similarity is insufficient. Require artifact_put/codex_start for preparation/dispatch, codex_get for status. Tool presence is not online proof. All material writes and creation use this SAME frozen Bridge; an equivalent text-drop must have verified same-computer/Bridge binding. Stop a failed stage without switching routes or using codex_bridge_local as a default. Do not delete a separately useful local Bridge.

Report the specific stop: WORKSPACE_ROUTING_TABLE_UNAVAILABLE (unreadable/incomplete/invalid table); WORKSPACE_ROUTE_NOT_FOUND (no match, disabled or conflicting inputs); WORKSPACE_ROUTE_AMBIGUOUS (duplicate IDs/workspaces or multiple repository matches, requiring table correction/explicit workspace); WORKSPACE_BRIDGE_UNAVAILABLE (missing selected tool, showing expected computer, bridge and workspace).

**Central selection stays exact.** Bridge realpath normalization checks physical directory identity only AFTER selection; it does not permit fuzzy/alias route selection. Pass the configured workspace unchanged to codex_start. Once frozen, do not reselect within this handoff.

### Publication scope from the same central read

After selecting the execution route, read its optional `Publish targets` and `Publish order` from the SAME fresh complete central table. Repository / workspace still selects the execution project, not its publication destinations. No Project Files publication lookup or second route source is added. Copy both values unchanged into Task Payload as ordinary publication instructions, and carry the intended publication outcome into the Goal when applicable; no new canonical envelope fields.

`Publish targets` pairs each credential-free HTTPS/SSH (including scp-style SSH) repository address with a valid final-delivery branch ref using `address => refs/heads/branch`; multiple pairs use ` | `. `Publish order` states the primary platform and PR/merge/sync sequence. Its authorized task-branch push/PR steps may use the SAME listed addresses before the final branch; that does not authorize merging or introduce another repository. Validate the selected route's pair syntax, branches and complete consistent order. If either field is present, BOTH must be nonempty and complete; duplicates, conflicts, unknown formats or unresolved ordering stop preparation/dispatch with the precise configuration gap, not fallback.

Only BOTH fields absent from a successfully read selected route selects the user's full-sync workspace-Git fallback. Include that fact and these receiver instructions in the payload: when this task requests publication/synchronization, inspect the SINGLE selected Git repository, every configured remote and ALL effective push addresses (including the fetch address used when no separate push URL exists); synchronize this task's intended delivery branch(es) to every discovered publication target, subject to current task authorization and existing PR gates. Do not silently use only origin or skip a failed/read-only target and claim success. No Git, independent repositories, no targets or unresolved delivery branches/merge ordering require a focused clarification; never guess cross-repository scope. Central read failure is not an absent publication scope.

Listed/discovered targets are scope, not standing permission: a read-only/no-publish task does no push, merge or deployment. Before publication compare targets with actual remotes and all effective push addresses; a mismatch blocks the affected publication, never redirects or writes to extra destinations. An explicit target set may be a subset of configured push addresses: verify each listed address against the effective configuration, but do not add the other addresses. Fallback covers ALL effective addresses. Unresolvable push-address discovery is a blocker, not an address to silently skip; do not disclose embedded credentials. Push and verify each validated address/ref explicitly; never use a remote alias whose multiple push URLs would fan out to unselected addresses. Respect the task's intended refs and review/merge gates. No all-local-branch/tag push, `push --mirror`, automatic force, remote/config/credential creation or independent merges merely to obtain matching SHA. For equal SHA across platforms use the explicitly chosen primary platform's verified merge result; if that sequence is unclear, ask rather than invent it. Divergence, write denial, failures or unverifiable targets remain incomplete. Read each actual remote ref against its expected final SHA, not a local tracking ref; report each target/ref/observed SHA and success/failure/pending verification. Only ALL required targets verified permits “fully synchronized.” Report authorized task-branch/PR completion separately from final-branch synchronization pending merge authority; publishing one task branch does not prove main was merged or synchronized.

## 2. Facts, origin and canonical envelope

Resolve objective, task identity, repository/workspace, required authoritative inputs and concrete user restrictions once. Fix a full 40-character BASE_SHA when required by repository truth; resolve a missing required baseline before dispatch, never use floating HEAD/main/latest. Otherwise use `not applicable`. If no task identity exists, assign a handoff label, not a repository/HACT record.

The origin is THIS initiating ChatGPT chat, not another project chat, receiver, Bridge or maintenance conversation. Generate one fresh UUID v4 Dispatch token distinct from Task identity; repeat token, identity, combined Repository / workspace and BASE_SHA exactly. Before dispatch visibly record those four values here; after confirmed creation record them with the exact job_id and actual creation outcome. These assistant messages are dispatch evidence, not human authorization or a registry. Carry any applicable human return instruction with its observed message locator and exact scope when available; a delegated quotation alone is not verified authorization. Never claim creation in prepare-only or poll for sender records.

Use an already trustworthy current title or literal `unavailable`; no automatic title/project lookup is required. Keep `Bound conversation ID: unavailable` literally: it is a compatibility field, not an address. Record Parent-return binding/Binding evidence only when current runtime evidence proves a native return reaches THIS ChatGPT origin; otherwise both are unavailable. An unknown transport is `not established at dispatch`. Do not infer an origin from room/message/source_thread/Bridge/Codex/job IDs, anonymous metadata or cached handles. Missing return metadata does not prevent authorized engineering; the receiver verifies or asks under section 5.

Preserve this skeleton, section order and field order, inline values and exact field names. Never fence, rename, translate, split Repository / workspace, merge sections or leave unresolved placeholders. The payload follows six EXECUTION BRIEF fields; its prose labels are optional and must not override protocol values. Persist necessary materials under section 3 before finalizing it. All THREE Return mode fields default to auto; only the human's explicit manual-result/no-message direction makes all three manual. Prepare-only alone does not change them.

The concrete /goal must activate through the receiver's actual Goal mechanism before substantive work; repeating text is not activation. It contains objective/scope/base, autonomous work under the project's rules, and final return as part of completion from the outset. Ordinary engineering problems stay in Codex; early return is for unresolved required product/core semantics or inability after reasonable attempts, otherwise final delivery. Include section 5's focused ask-and-wait behavior and section 6's permitted local-emission alternative. Unavailable return transport is not an engineering capability blocker. A required unanswered decision or an engineering blocker is not Goal completion. Preserve explicit task restrictions without adding generic approval boilerplate or expanding authority.

MANDATORY GOAL ACTIVATION
Before substantive analysis, file modification, command execution, Git operations, review, or implementation, establish the following /goal in this Codex conversation. Use actual Goal activation; do not begin before activation.
/goal [Concrete objective including final delivery to FINAL RETURN TARGET per RETURN ROUTING.]

EXECUTION BRIEF
Conversation kind: ChatGPT
Task identity: [this task's identity]
Dispatch token: [fresh UUID v4 for this dispatch]
Repository / workspace: [repository] / [absolute workspace]
BASE_SHA: [full 40-character SHA, or not applicable]
Return mode: auto

[Task Payload: exact inputs, scope, required work, validation, restrictions and deliverables as needed.]

FINAL RETURN TARGET
Conversation kind: ChatGPT
Conversation title: [exact originating ChatGPT title, or unavailable]
Dispatch token: [identical to EXECUTION BRIEF]
Bound conversation ID: unavailable
Parent-return binding: [verified current-dispatch runtime binding, or unavailable]
Binding evidence: [actual current-dispatch evidence, or unavailable]
Return mode: auto
Known return transport: [verified capability, or not established at dispatch]
Task identity: [identical to EXECUTION BRIEF]
Repository / workspace: [identical to EXECUTION BRIEF]
BASE_SHA: [identical to EXECUTION BRIEF]

RETURN ROUTING
Return mode: auto
[Ordered safe return procedure, genuine tool constraints, focused ask behavior and permitted fallback.]

## 3. Materials and receiver context

Long generated text not already readable in Git/workspace must be persisted through the frozen Bridge BEFORE the final instruction, including prepare-only. Reuse material only when its successful identity and intended content are established. For each input cite a compact payload bullet with the exact returned **Path/locator, Filename, SHA256, Purpose and Required action**; keep these artifact entries distinct from envelope fields. Use the successful service result, not guessed paths, cached/expected digests or a similarly named copy. A different Bridge's locator requires explicit readability evidence on the selected computer. Tell the receiver to verify readability and SHA256 before relying on material.

A missing required locator/digest or persistence failure blocks dispatch and a ready manual handoff. Report that stage; do not paste the long body into codex_start, invent a path, reuse stale content or repeatedly shuttle it through GitHub/prompt. All required inputs need exact locators, never “see attachment/above/previous”. Already available repository inputs need no reupload. Use `Artifacts: none` when none are required. Reconcile artifact/prompt/manual-auto conflicts from actual human directions before submission; a flag is not conflict resolution.

Include this receiver check in Task Payload BEFORE engineering instructions and in any persisted execution packet:

- After actual Goal activation, before repository commands, artifact reads or modifications, report trustworthy CURRENT task sandbox/profile, filesystem restrictions, network access and approval policy. UI labels, global configuration, another session or a successful command are not evidence; do not probe protected resources.
- Compare with the user's selected Full access setting, unless this task explicitly requests a restricted mode. Unknown context or a restricted actual context contrary to that selection stops engineering locally: report “界面设置与本任务实际权限不一致”, actual facts/uncertainty and work not performed. Do not blame the UI or invent which component caused it.
- The human corrects the receiving Desktop task and resumes it (for example “你再看下授权”). Re-read/report actual context; continue the SAME identity/base/scope only after it matches. A click/statement alone is insufficient. Codex must not change safety configuration, bypass/elevate permissions itself, redispatch or poll for permission changes. A permission stop does not complete engineering.

If actual Goal activation cannot be established, do not begin engineering; return that limitation truthfully under the safe routing procedure. These checks verify user selection, not permission to disable safeguards.

## 4. Preflight and creation result

Check section-local field order/values, Goal, exact repeated token/identity/repository/workspace/base, THREE matching return modes, materials and context requirements. Remove contradictory payload values. Bridge LINT is an additional subset, not full Skill preflight or proof of origin authenticity, Goal activation or later behavior.

Call codex_start once on the frozen Bridge with its configured workspace and exact validated prompt. No extra origin/token API parameters exist. Report the actual stage: a platform safety block does not prove LINT ran; persistence, rejection, creation and engineering failure are distinct.

- **created:** confirmed creation with job_id. A navigation warning still means already created: preserve/report that ID, never redispatch to bring it into view. A legacy explicit successful creation acknowledgement with job_id also remains confirmation; do not infer not_created from a missing newer field.
- **not_created:** LINT rejection (DISPATCH_LINT_FAILED, rule/field/message, no job_id) or a definite pre-submit DISPATCH_REJECTED. Correct the actual reported issue from known truth before considering a submission; it is not unconditional permission to retry. A corrected proven-no-creation LINT rejection may reuse the token; never resend unchanged, invent facts or bypass constraints.
- **unknown:** DISPATCH_OUTCOME_UNKNOWN, timeout, disconnect, unusable/contradictory acknowledgement or no confirmed creation identity. Preserve any diagnostic references; do not assert no creation or automatically resend/switch Bridge. Report uncertainty for human Desktop inspection and a later explicit decision. Error prose alone is not a no-creation proof.

Dispatch token is correlation evidence, NOT a native idempotency key; no exactly-once guarantee is made. Continue an accepted task there rather than creating another because progress is unknown. After creation/reporting end the normal dispatch workflow. Do not proactively codex_get, wake/probe or equivalent polling; one explicit status request permits one snapshot, not monitoring.

## 5. Receiver final return

Automatic final delivery to this task's verified origin is the default and belongs in the Goal/handoff; do not wait for a second “send it yourself” request. Honor explicit manual-only/no-message directions without attempting sends or asking to reverse that choice. This intent covers THIS final result only, not other recipients/messages or broader engineering actions.

Inspect real receiver capabilities under their actual contracts. Add no routine Skill consent/authorization checklist; also do not remove tool restrictions. Where direct HUMAN send authorization is required, use applicable actual human instructions/trusted evidence admitted by the tool. Generated/delegated text or model-selected Skill is not fabricated human consent. A real authorization obstacle is not missing transport.

A readable original human standing authorization may cover later dispatch results to this SAME verified origin when its scope applies, it has not been revoked or narrowed, and the actual send-tool contract admits that evidence. Do not demand that it name future tokens/job IDs or ask again merely because this is a new dispatch. Verify the applicable destination separately for every dispatch using one of the paths below. Standing origin-specific permission does not transfer to another recipient merely because that recipient was identified. Unreadable authorization is authorization_unverified; absent applicable authorization is authorization_required. A stricter actual tool contract remains binding; report its specific constraint. Return authorization grants no code, production or Git publication authority.

For auto mode, completed work OR a legitimate early blocker may use any ONE of three independent verification paths. They are alternatives, not cumulative requirements; a successful path does not have to complete another path. Prefer an available proven native binding; an already applicable direct human destination instruction can use path 3 immediately.

**Path 1 — trustworthy native binding.** Use a task-native parent-return only if documented/runtime binding proves it reaches this dispatch's actual ChatGPT origin, not an intermediate Codex/Bridge/control task. A tool name, Bridge caller thread or merely routable handle is insufficient.

**Path 2 — automatic lookup and verification.** Locate candidates by an exact title or the existing bounded listing, then assess readable current-task context and dispatch evidence together. With list_threads make ONE limit:20 listing of recent unpinned entries; retain only the FIRST 10 pinned entries in returned UI order BEFORE type/project filters or body reads. Filter to ChatGPT, deduplicate observed handles; exact title or verified hints may narrow within that scope. Never fill a quota, rescan/expand, search archives automatically or select fuzzy/first/newest. Use summaries for navigation, then relevant original-message reads for verification.

Original token, Task identity, Repository / workspace, BASE_SHA, creation confirmation and a matching trustworthy receiver native handle are strong evidence. A complete linked original request → assistant dispatch → Bridge creation/assistant confirmation → native handle chain is sufficient when it uniquely identifies this dispatch; records may be DIFFERENT messages, not one original human message. Do NOT require the original human request to contain an assistant-generated Dispatch token/Task identity or a later-created job_id. For this chain, match the four task fields and confirmed job_id to the received context, and verify message provenance and the surrounding sequence.

The complete chain is NOT the only acceptable evidence form. Other independently corroborated readable original task/dispatch context or trustworthy current-dispatch runtime evidence may establish the same link to THIS dispatch. Explain which observed evidence connects the candidate to this task and distinguishes it from other plausible candidates. Do not turn any single missing field, unknown handle or unreadable message class into an automatic rejection when other evidence sufficiently establishes that link. Search-based sending still requires exactly ONE verified candidate and enough relevant coverage to exclude another within the inspected scope; same-title ambiguity, task conflicts or an unproven link to this dispatch remain unverified. An exact title, copied token, forwarded report, pasted execution brief, quoted acknowledgement or an assistant's claim of consent ALONE cannot establish automatic origin or human send permission. Do not poll for evidence.

**Path 3 — human directly specifies or confirms this result's destination.** Use an actual human instruction that identifies where THIS task's result should return, then verify the destination's actual ChatGPT identity with available tools/context and check send authorization separately under the real tool contract. An exact title and a real link are both valid locators. When an exact title uniquely locates the intended chat, do NOT demand a link. This path verifies the human-selected destination, not whether it originally created the task: it does NOT require original assistant dispatch text, sender token records, creation acknowledgement or a sender/receiver native-handle match. Do not loop back to path 2's original-chain requirements after a direct human destination confirmation. A delegated/model-generated instruction is not an actual human confirmation. A locator alone may identify the chat without granting send permission; interpret the human's actual wording together with applicable existing instructions. If identity is still ambiguous, ask only for the unresolved distinction, not for evidence irrelevant to this path.

**Insufficient readable content.** A chatgpt-content-reference, preview or summary is NOT the referenced assistant body; hasMore=false does not prove body coverage. First decide whether other observed evidence already suffices under the applicable path. If more content is needed, use an available supported full-content reader within the SAME candidate scope and verify its conversation identity. A browser not already showing the candidate is not proof of unavailable browser capability: an authorized browser reader may enter the observed exact candidate through a supported interface and read the relevant original sequence. Never infer content from a reference ID, fabricate a link, call private endpoints or expand the search. Unreadable assistant content does not automatically require a source link or mean missing human authorization.

If the applicable paths cannot uniquely verify the destination, use an available interactive channel to ask ONCE for direct human specification/confirmation of THIS result's receiving chat (exact title OR real link), or an explicit manual-relay choice. Include task identity and the precise unresolved gap; do not request a locator already known merely because the body is unreadable. Apply the human's answer under path 3. Never send a test message to a candidate. If ambiguity remains, explain the exact gap and wait, rather than guessing or silently finishing with manual relay.

If target is verified but send intent or the tool's required human authorization is unresolved, ask once for the specific complete-result send to that exact target, through an authorization-capable input tool or direct conversation question, not an optional-preference-only tool. Applicable established human authorization needs no repeat consent. Do not reopen engineering approvals.

Continue independent authorized engineering and retain the immutable result while a return decision is pending. For an obtainable required decision, WAIT: silence/time is not consent; do not send, close/complete the Goal or convert the unanswered question into manual relay. Manual emission is allowed when the human selects it or no usable safe return/interactive channel exists; state a missing question channel accurately, never pretend a question was asked. Absent messaging capability does not require an unnecessary send-permission question.

After authorized verified sending, confirm the real tool result. Definitive failure WITHOUT delivery may use another verified route. An ambiguous send must NOT be resent or switched automatically: retain the full result, mark unconfirmed, warn that delivery may already have happened before any human relay, and do not resolve it by polling.

## 6. Result and truthful completion

Freeze the actual outcome: Task identity, repository/workspace, BASE_SHA and RESULT_SHA where applicable, changed files, verification/review required by the task/project, blockers and limits. No commit means say so, not an invented RESULT_SHA. Include exact locators/digests for separate result artifacts; do not force a Result Packet schema. A verified destination's observed title/link/handle may be an optional hint, never a fabricated URL, permanent binding, cached authority or automatic writeback. A later dispatch re-verifies its own evidence.

Emit ALL essential result content, not a request to inspect the job later. For local fallback or a required return decision include:

ENGINEERING_STATUS: complete | blocked
AUTOMATIC_RETURN_STATUS: unavailable | failed | unconfirmed | authorization_required | authorization_unverified
RETURN_DELIVERY_STATUS: pending_human_relay | pending_human_authorization | awaiting_human_decision
RETURN_ACTION_REQUIRED: [specific human relay or authorization/identification action]
FINAL_RETURN_CONVERSATION_TITLE: [exact verified title, or unavailable]
AUTOMATIC_RETURN_BLOCKER: [specific capability, target, send-result, authorization or explicit manual/no-message restriction]
RETURN_ROUTE_EVIDENCE: [applicable routes checked and observations; no invented attempts]

Classify actual missing transport/target separately from present tools lacking human authorization; the latter is authorization_required/unverified, not unavailable. If no applicable path verifies the destination, use unavailable with awaiting_human_decision when interactive identification is possible, and state the exact unresolved identity/evidence gap in AUTOMATIC_RETURN_BLOCKER. Distinguish insufficient readable evidence, task conflicts and multiple candidates from authorization gaps; do not collapse them into a generic request for consent. Record the successful path and actual supporting observations in RETURN_ROUTE_EVIDENCE, not requirements from paths that were unnecessary. Explicit manual choice leads to pending_human_relay without a send attempt. An obtainable unanswered required question is awaiting_human_decision, not finished fallback. Unconfirmed sending must disclose possible prior delivery.

Engineering complete requires the actual requested outcome and applicable verification, independent of return transport; an early blocker remains blocked even if reported. Goal completion additionally requires confirmed authorized automatic delivery OR complete immutable local emission under the permitted manual/unavailable-channel alternative established at activation. Local emission satisfies execution/packaging, not ChatGPT receipt. Pending human relay/authorization never implies delivery; an unanswered required human decision does not satisfy final-handoff completion.

## 7. Stop boundary

Before submission check the full canonical envelope, fixed exact route/facts, successful artifact identities, actual-context instructions, mode consistency, current-origin evidence or explicit unavailable fields, bounded receiver verification/ask-and-wait procedure and permitted fallback in the Goal. Resolve missing engineering facts/materials; unavailable title/project/parent binding alone is not an engineering blocker.

Keep checks local to this handoff. Do not add HACT state, receipts, registries/caches, persistent checklists, routing parsers/services, callbacks, watchers, schedulers or lifecycle machinery. Follow existing project rules for engineering and this Skill for safe handoff/return, then stop without automatic polling.
