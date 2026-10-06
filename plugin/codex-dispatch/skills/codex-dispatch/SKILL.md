---
name: codex-dispatch
description: Prepare or dispatch ChatGPT-to-Codex handoffs when the user asks to hand off, send, delegate, execute, implement, or continue work in Codex or Codex Bridge, or generate an execution brief or manual handoff. Require Goal activation, bind the origin at dispatch, use exact artifact locators, return safely with human-relay fallback, and stop after dispatch without automatic polling. Exclude conceptual Codex/Bridge discussion, design without a handoff, explanations of past polling, and status-only queries.
---

# Codex Dispatch

Prepare a complete handoff; dispatch only when the user requests actual execution.

**FORMAT IS MANDATORY.** Fields in the Dispatch Protocol Envelope are canonical machine-readable fields. Preserve the four section names/order and each section's field names/order in section 2. Do not paraphrase, rename, merge, split, omit, translate, or replace them with semantically equivalent labels; keep values inline and do not wrap the generated envelope in a code fence. Engineering prose may be Chinese or another user-requested language. Skill protocol preflight is required in addition to the existing Bridge LINT: LINT checks only a subset of this envelope. A Bridge LINT rejection returns DISPATCH_LINT_FAILED and creates no task.

## 1. Mode and execution truth

- Prepare-only: generate the complete canonical handoff for manual transfer; do not call codex_start. Manual transfer of the instruction does not itself select manual result return.
- Dispatch: generate the same canonical handoff, validate it, and call codex_start once with the exact workspace and validated instruction, without rewriting it after preflight. Requests to continue work use the same contract and do not authorize repeated dispatch.
- Status-only: an explicit request such as “查一下”, “看状态”, or “取结果” permits one appropriate codex_get snapshot for the identified job, without new dispatch or recurring monitoring.

Resolve objective, repository/workspace, scope, authoritative references, required validation/review, and any concrete task restrictions explicitly supplied by the user. Fix the full BASE_SHA before dispatch when repository truth requires a baseline; never substitute floating HEAD, main, or “latest”. Resolve a missing required baseline before dispatch. Preserve the user's task identity; if none exists, assign a label explicitly as this handoff's task label, not as a repository or HACT record. Distinguish repeated dispatches of the same task in the prompt without creating a registry.

### Workspace routing preflight

Run this preflight after resolving task facts and BEFORE origin capture, any Bridge artifact persistence, or dispatch, including prepare-only handoffs that need artifact persistence:

1. Fetch and read the complete current contents of the fixed canonical URL `https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md` for every new dispatch or prepare-only handoff. The sole runtime routing authority is `dingxifan/chatgpt-codex`, branch `main`, path `config/CODEX_WORKSPACE_ROUTING.md`. Make a fresh read for this handoff; do not reuse a previous read, session context, or cached table. Do not read routing tables from Project Files: all GPT Project / Space copies are non-authoritative and must be ignored. No current Project identity or Project Files access is required for routing. If the canonical URL cannot be read completely, stop with `WORKSPACE_ROUTING_TABLE_UNAVAILABLE` before artifact persistence or codex_start. Never fall back to Project Files, Memory, history, local copies, other repository copies, or a previous route.
2. Validate schema version 1 and resolve exactly one active route under the rules below. Do not infer or discover a computer from drive letters, path style, the current client, machine names, repository history, BASE_SHA, recently used hosts, similar workspace names, or Bridge availability.
3. Treat the configured `Computer` and `Bridge namespace` as authoritative. Locate the exact namespace's required tools in the current tool catalog: `artifact_put` and `codex_start` for handoff preparation/dispatch, and `codex_get` for an explicit status lookup. A host may expose a normalized tool identifier: use catalog-provided connector identity to establish exact namespace membership, never fuzzy-name similarity. Tool presence does not prove the Bridge is online.
4. Freeze the resolved Route ID, repository, absolute workspace, computer, namespace, and actual tool handles in this handoff's context. Continue origin capture, artifact persistence through that Bridge, canonical handoff construction, existing protocol preflight/LINT, then dispatch through the SAME Bridge with the configured absolute workspace. No new envelope fields are introduced. Once frozen, do not reselect the route during this handoff.

The central file uses `Schema version: 1` and route blocks with these required inline fields: `Route ID`, `Repository` (explicit owner/repository), `Workspace` (absolute path), `Computer`, `Bridge namespace`, and `Status` (`active` or `disabled`). Validate the entire table before selecting a route, including disabled entries. Route IDs and exact workspaces must be unique; duplicates are ambiguous. Missing or empty fields, invalid statuses, nonabsolute paths, unsupported schema, incomplete contents, or a parse failure make the table unavailable. The canonical GitHub main file is the only current route configuration; no other copy is a runtime authority.

- When the user supplies an absolute workspace, compare the entire `Workspace` value exactly. Do not normalize case, slashes or trailing separators, perform prefix/fuzzy matching, or substitute a nested worktree. No match or a single disabled match stops. Multiple matches are ambiguous, including duplicated workspaces assigned to different computers. If repository is also supplied, it must exactly equal that route's Repository; a conflict stops rather than silently routing by one input.
- When only repository is supplied, compare the entire Repository value exactly among active routes. Resolve only when exactly one active route matches; use that route's configured workspace. Multiple matches require an explicit workspace or a corrected table. Never pick first, newest, or online.
- No route/Bridge fallback is permitted. `codex_bridge_local` is not a dependency or default for ChatGPT dispatch. Do not delete a separately useful local Bridge. If a selected tool fails at runtime, report that stage and stop; never upload artifacts or create a task on another computer. Preserve existing handling of a proven no-task-created LINT rejection; uncertain creation must not be retried automatically.
- All required `artifact_put` calls and `codex_start` must use the frozen namespace. An equivalent text-drop capability is permitted only when its catalog/runtime evidence establishes the same configured computer and Bridge binding; it cannot bypass routing preflight. A locator from another Bridge is not an input for this handoff unless its readability on the selected computer is explicitly established.

Report the actual preflight failure before any artifact persistence/task creation:

- `WORKSPACE_ROUTING_TABLE_UNAVAILABLE`: canonical GitHub URL unreadable, file absent, unsupported schema, incomplete contents, missing/empty required fields, nonabsolute workspace, invalid status, or parse failure; explain the actual cause and stop before artifact persistence/codex_start, without any fallback.
- `WORKSPACE_ROUTE_NOT_FOUND`: no configured match, a disabled route, or conflicting supplied repository/workspace; explain which condition occurred.
- `WORKSPACE_ROUTE_AMBIGUOUS`: duplicate Route IDs, duplicate exact workspaces, or multiple active repository matches. Request an explicit workspace or central table correction as appropriate; duplicates require table correction.
- `WORKSPACE_BRIDGE_UNAVAILABLE`: required selected-namespace tool absent. Show `Expected computer`, `Expected bridge`, and `Workspace`; do not try another namespace.

Status-only queries do not authorize dispatch or artifact creation. Use the task's original frozen route when established in this conversation; verify its `codex_get` tool is available and perform only the explicitly requested snapshot. If that route is absent, require the originating workspace/repository and resolve it through a fresh complete read of the canonical GitHub URL under the same validation rules, or use an explicitly confirmed originating Bridge for that job. If a changed table cannot establish the job's original Bridge, stop. A bare job_id is not a route: return `JOB_ROUTE_UNKNOWN` and ask for workspace/originating Bridge rather than probing computers. Never automatically poll.

## 2. Capture and bind the origin before dispatch

The origin is the current ChatGPT conversation issuing THIS dispatch, not a same-project historical conversation, the receiving Codex conversation, or a Bridge/control/maintenance conversation. No automatic current-title or current-project capability is a prerequisite. Retain `Conversation title` only as a compatibility hint: use its exact current value if trustworthy evidence already supplies it, otherwise the literal `unavailable`. Do not require Origin project, a project ID, or a conversation address from the sender. Do not guess any of them from the repository, destination Codex project, names, recency or history. Missing return metadata does not block authorized engineering; the receiving Codex must actively ask the human when safe return-target evaluation cannot identify this source.

Generate one fresh UUID v4 `Dispatch token` for each new dispatch, distinct from the user's Task identity. Reuse it for a corrected proven no-task-created LINT rejection; an uncertain creation still forbids automatic redispatch. Reuse the same token in EXECUTION BRIEF and FINAL RETURN TARGET. Before dispatch, visibly record the token, Task identity, Repository / workspace and BASE_SHA in THIS ChatGPT chat. After successful creation, visibly record those same values and the exact returned job_id. These ordinary chat messages are evidence for this dispatch, not a new receipt store or registry; a job_id is not the origin address. Prepare-only cannot assert a successful dispatch/job_id. The receiver may inspect these records as part of return verification; never poll for them to appear.

Retain the legacy compatibility field `Bound conversation ID: unavailable` in every handoff; it is not an origin locator. Do not infer an origin address from room_id, message_id, source_thread_id, Codex/Bridge thread_id, job_id, anonymous MCP session metadata or cached identifiers. The receiver may use a real candidate handle only after current dispatch-evidence verification or the human's direct identification of THIS task's return destination, followed by verification through available tools. A human-provided link/title is a locator to verify, not permission to guess a tool handle or substitute an unrelated chat. The receiver's own task handle is only comparison evidence, not the origin address.

Record a native parent-return binding only when actual current-dispatch runtime evidence establishes that it reaches THIS ChatGPT origin. Otherwise use `Parent-return binding: unavailable` and `Binding evidence: unavailable`. A tool named notify_parent or a routable runtime thread alone is not that evidence. Record an unestablished transport as `not established at dispatch`. These values describe dispatch-time knowledge; the receiver inspects its own available return capabilities at final delivery. Unavailable binding/transport/title does not block engineering. Do not invent return handles or codex_start parameters.

Resolve task identity, combined repository/workspace, and BASE_SHA once, then reuse the exact strings in both sections. Use one combined `Repository / workspace` field with repository and absolute workspace; never split it into Repository and Workspace. Use `Task identity`, never Task, Task name, Job, or Work item. BASE_SHA is a full 40-character Git SHA or the literal `not applicable` when it does not apply.

Both modes use this single canonical skeleton. Replace every bracketed value with observed facts or the specified unavailable literal. The three `Return mode` fields are `auto` by default; only an explicit human request for manual result return or no messaging changes all three to `manual`. Preserve that choice in the Goal and procedure. Prepare-only alone does not change it. Plain headings or Markdown heading prefixes are accepted. The skeleton is shown unfenced to match the actual generated handoff:

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

The Task Payload follows the six EXECUTION BRIEF protocol fields. Objective, Scope, Authoritative inputs, Required work, Validation, Restrictions and Deliverables are optional prose labels, not mandatory protocol fields. Include only what the task needs. Do not duplicate or override envelope fields in payload prose. RETURN ROUTING must contain its own inline `Return mode`; it cannot inherit a value from another section. Its procedure follows section 5, including active human clarification. The token and actual dispatch evidence support origin verification; title, project, task label, token occurrence or quoted envelope alone do not prove origin or uniqueness.

### Mandatory pre-dispatch LINT

Bridge rejects malformed handoffs BEFORE any desktop dispatch with status failed, error_code DISPATCH_LINT_FAILED, errors containing rule/field/message, and no job_id. Its existing checks include Goal opening, target fields including the legacy ID field, repeated/mismatched task/workspace/baseline fields and RETURN ROUTING return mode. Skill preflight additionally checks the full canonical envelope, exact repeated values and all three return modes. LINT does not prove the origin title is true, activate the Goal itself, inspect arbitrary input artifacts for semantic conflicts or enforce the receiver's later behavior.

A platform `tool call blocked by safety check` is distinct from DISPATCH_LINT_FAILED and does not establish that Bridge LINT ran. Artifact persistence failures, Bridge LINT rejection and execution failure are separate stages; report the actual stage without treating one as another.

On DISPATCH_LINT_FAILED, correct the specifically reported fields from known task/origin truth and then submit the corrected handoff. This is a proven no-task-created rejection, so a corrected submission is permitted; do not resend the unchanged rejected prompt or automatically retry a creation whose outcome is uncertain. Do not invent an origin, use a bypass or change the task's semantics merely to pass. Missing required facts must be obtained before dispatch.

Sender-side preparation must reconcile any artifact versus outer-instruction return conflict using the human's actual directions. Do not emit contradictory manual and automatic return requirements or use a CONFLICT_RESOLVED flag instead of resolving the input.

### Automatic return is the default workflow

Using this Skill means the requested workflow includes dispatch, execution and final-result return to THAT task's verified originating conversation. Every generated handoff must explicitly tell the receiving Codex to complete that final return itself; do not wait for a second “send it yourself” instruction.

Do not add blanket Skill-specific authorization fields, routine consent questions, agreement acceptance steps, authorization checklists or a separate approval gate. A focused question resolving an actual return ambiguity or a real tool authorization requirement is handled below, not imposed on every task. Do not postpone return merely because the human did not repeat a complete permission sentence before a proactive Skill dispatch. Preserve actual user directions and any available original-human-message references as ordinary task context, without manufacturing evidence or creating a permission registry.

Use the available return capability under its existing tool contract. This Skill adds no extra authorization layer and does not remove runtime/tool restrictions. If a tool requires direct human authorization, rely on applicable actual human instructions or other trusted evidence allowed by that tool; a generated handoff or model-selected Skill is not a fabricated human grant. Do not send when the tool's requirement is unmet, or falsely label delegated text as human consent. Report a real tool-enforced authorization obstacle accurately, without representing it as missing transport.

Honor explicit user restrictions such as manual-only or no-message requests. A native parent-return primitive follows its own contract. The default covers only this task's final result to its verified origin, not other messages, recipients or broader engineering actions.

### Proactively ask when final return is unclear

If a usable messaging tool exists but the final send's intent or required human authorization is unclear/unverified, proactively ask the human directly in the receiving Codex conversation before choosing manual relay and ending. With a verified target, ask once for the exact action: “The final result is ready. May I send this task's complete result to <exact verified origin title/identity>?” Use an available user-input capability suitable for authorization, or a clear question in the conversation. Do not use an optional-preference-only question tool for permission.

If the origin cannot be uniquely verified, ask the human to identify the exact originating conversation instead of proposing a guessed destination. Clarifying the target is separate from having permission to send. Do not ask whether to return when a valid applicable human instruction already establishes it, and do not reopen engineering approvals.

Continue independent authorized engineering and preserve the immutable result. For a required decision, wait for the human answer; silence or elapsed time is not consent. Do not send, declare delivery, mark the Goal complete, or turn the unanswered question into an automatic manual-relay conclusion. Ask only once for the same unresolved issue unless new facts materially change it.

After a direct human instruction authorizes the specific send and the target is verified, send and confirm the actual tool result without another consent question. If the human chooses manual relay or forbids messaging, emit the complete result accordingly. If no interactive human-input channel is available, emit the complete result with the precise pending action and state that clarification/authorization could not be obtained; never claim a question was asked when it was not. An unavailable messaging tool may still justify manual fallback without an unnecessary send-permission question.

## 3. Artifacts before the final instruction

For long ChatGPT-generated Markdown, designs, reports, or other text not already available to Codex, call artifact_put or an existing equivalent text-drop capability BEFORE composing the final instruction, including in prepare-only mode. Use the successful service result's exact readable locator, filename and SHA256, with the purpose and intended destination/action. Do not infer paths, substitute cached digests, or replace the returned digest with a pre-call expected digest. Reuse an already persisted artifact only when its successful service identity and intended content are established. Inputs already available in Git/workspace do not need to be uploaded again.

In the Task Payload, cite each required persisted artifact as:

Authoritative artifact:
Path: [exact locator returned by the successful service call]
Filename: [exact returned filename]
SHA256: [exact returned digest]
Purpose: [purpose]
Required action: [destination/action]

Tell Codex to verify readability and SHA256 before relying on the artifact. If persistence fails or the required locator/digest is absent, stop preparation/dispatch and report the artifact persistence blocker. Do not bypass it by pasting the long body into codex_start, claiming the handoff is ready, inventing a path, or substituting an old artifact. Do not repeatedly transfer long bodies through GitHub connectors or the execution prompt.

Every required input artifact needs an exact locator. Never use “see attachment”, “the file above”, “the previous design document”, or equivalent. Missing required artifact locators block dispatch and prevent presenting a manual handoff as ready. State Artifacts: none when none are required. Tell Codex to verify readability and supplied digests before applying artifacts; do not silently substitute a similarly named copy.

## 4. Mandatory Goal and execution brief

Every handoff starts with MANDATORY GOAL ACTIVATION and tells the receiver:

Before substantive analysis, file modification, command execution, Git operations, review, or implementation, establish the following /goal in this Codex conversation. Do not begin substantive work until the Goal is active. Use actual Goal activation; repeating the command is not activation. If activation cannot be established, do not begin engineering and report the limitation through the return procedure below.

### Receiver execution-context check and human correction

Every handoff must include this check in the Task Payload, after the six EXECUTION BRIEF fields and before the engineering instructions. Include the same requirement in any persisted execution packet; preserve the canonical envelope fields and order.

- After Goal activation and before repository commands, artifact reads, modifications or other engineering operations, report this receiving task's actual runtime permission context: sandbox mode or permission profile, filesystem restrictions, network access and approval policy, as available from trustworthy current-task context. Do not infer these from a Desktop UI label, global config, another conversation or a successful command; do not probe protected resources to test access.
- For this user's Desktop dispatch workflow, compare that context with the user-selected Full access setting. If the user explicitly requests a restricted mode for this task, preserve that choice instead; this check does not grant or expand authority.
- If the expected Full access context is actually workspace-write, sandboxed or otherwise restricted, stop engineering immediately and report locally: “界面设置与本任务实际权限不一致”, together with the actual context and work not yet performed. If the context cannot be established, report that uncertainty and stop rather than assuming a match. Do not blame the user's UI selection or claim to know which Desktop/Bridge/task stage caused the mismatch.
- Leave correction to the human in Codex Desktop. The user may reselect “完全访问” in the receiving conversation's permission control, then send “你再看下授权” or resume the task. Codex must not modify safety configuration, bypass restrictions or elevate permissions itself. Phrase the handoff as verification of the user's selection and stopping on mismatch, not as an instruction to disable a sandbox or change permissions.
- On human-triggered continuation, re-read and report the current task context. Only after it matches may the same task continue its already authorized work. A UI click or human statement alone is not proof that the updated context has arrived. Preserve the task identity, baseline and scope; do not redispatch, poll for permission changes or create an automatic retry mechanism. Handle Goal status under the receiving session's existing rules; a permission stop does not complete the engineering objective.

Do not add generic authorization or approval instructions to the generated /goal or execution brief. In particular, do not write “ask for authorization when required”, “request Human Authority”, “follow the receiving window's permissions”, or equivalent boilerplate. Do not manufacture or exhaustively enumerate authorized actions or actions requiring approval. Carry forward the user's concrete task instructions, including explicit permissions, restrictions and reserved decisions, without manufacturing a general approval policy or expanding their scope. Leave the receiving session's existing configuration and instructions to govern execution without restating them in the handoff.

Generate one concrete /goal containing the objective, scope and applicable BASE_SHA, autonomous execution, and the following requirements INSIDE the Goal:

- Ordinary engineering problems remain in the receiving Codex conversation.
- Return only for unresolved required product/core technical semantics, objective inability to finish after reasonable attempts, or completed work ready for final delivery.
- Automatically deliver the final conclusion yourself to the verified origin for THIS task as the default completion workflow, using the ordered return procedure and the available tool's existing contract. Do not impose routine extra Skill authorization; if an actual return intent, target or tool-permission ambiguity remains, proactively ask the human in this receiving conversation once for the specific decision and wait before closing. Never guess the target, fabricate human permission, or override explicit user no-message restrictions or actual tool constraints.
- Unavailable return transport does not block authorized engineering work or count as an engineering CAPABILITY blocker.
- Successful execution requires the requested outcome, required verification/review, and immutable repository delivery when applicable, plus either confirmed authorized automatic final delivery to the verified origin or complete immutable local result emission identifying the transport, target or human-authorization obstacle preventing delivery.
- If safe authorized automatic delivery cannot be completed after checking applicable routes, emit the complete immutable result with the exact blocker. A true transport/target fallback is pending_human_relay; when the tool exists but direct human authorization is absent or unverifiable, mark pending_human_authorization. Local result emission satisfies Codex's execution/packaging responsibility, not receipt by ChatGPT. Include the route/authorization facts and never claim delivery. These alternatives must be in the Goal from activation, not introduced later.
- Early engineering blockers remain blockers; reporting them, automatically or manually, does not achieve the engineering objective or justify marking its Goal complete.

The generated Goal must include the focused ask-and-wait behavior for actual return ambiguity. Its local-emission completion alternative applies to a human-selected manual return or an unavailable safe return/input channel, not to an unanswered required question. Neither local emission nor pending authorization implies delivery to ChatGPT. Engineering may finish independently of message-send permission; final handoff remains pending while an obtainable required human decision is unanswered.

After the opening, provide EXECUTION BRIEF with exact workspace/repository, necessary fixed BASE_SHA, scope, inputs, required work, validation/review, and any concrete restrictions explicitly supplied by the user. Include FINAL RETURN TARGET and RETURN ROUTING explicitly; automatic final return is the default.

## 5. Ordered return routing

Apply the same routing procedure to successful final results and both legitimate early returns. Before choosing local fallback, inspect the return capabilities actually available to the receiving task and evaluate the applicable routes below. Do not skip safe automatic routing merely because parent-return is absent, a dispatch field says unavailable, or manual relay is easier. Capability inspection and an authorized final message send are part of final delivery, not prohibited job-status polling. Do not send test messages to unverified candidates; route evaluation is not a demand to try every send tool.

1. Prefer the existing task-native parent-return primitive only when its documented/runtime binding establishes that it reaches this dispatch's actual ChatGPT origin, not an intermediate Codex, Bridge, maintenance or control conversation.
2. Otherwise inspect available conversation list/search/read capabilities. With `list_threads`, make one `limit: 20` listing of recent unpinned entries and retain only the first 10 returned pinned entries in pinned UI order. The tool returns all pinned entries; slice to 10 BEFORE project/type filtering or body reads. Filter out non-ChatGPT entries and deduplicate observed candidate handles. These lists include multiple projects/Codex tasks and may yield fewer than 20+10 ChatGPT candidates; do not make extra scans to fill a quota. Trusted current project/title information or a previously verified return hint, if already available, can narrow candidates within this scope; none is a prerequisite or a permanent origin binding. Do not automatically search archives or expand beyond these limits. Use summaries, then read relevant candidates to verify THIS dispatch. Never use fuzzy/first/newest selection as proof.
3. Verify actual initiating user context and sender dispatch records matching Dispatch token, Task identity, Repository / workspace and BASE_SHA (full SHA when applicable). The sender's successful job_id must match the receiver's own task handle from trustworthy runtime/current-task evidence, not a copied token or the Bridge maintenance caller. Check roles and context; quotations, forwarded envelopes or result packets alone do not establish the source. An automatic search-based send requires exactly one verified candidate and sufficient coverage to exclude another matching candidate in the inspected scope. A bounded listing, missing coverage signals, unreadable/truncated relevant content, absent success confirmation, unestablished own handle or conflicting candidates cannot be treated as proof. Do not poll or silently expand the search. Record the specific evidence gap and proceed to the human question below rather than blocking engineering or declaring manual relay by default.
4. If applicable safe methods cannot confirm the return window and an interactive human-input channel exists, the receiving Codex MUST directly ask once: “本次任务已完成，但我无法确认回传窗口。请指出这次任务发起的 ChatGPT 聊天（链接或准确标题）；也可以明确选择由你手工转交。” Include the task identity and specific lookup obstacle. Wait for the human answer, preserve the complete immutable result, and do not guess, send, close the task or mark the Goal complete while this required question is unanswered. Ask about genuine send authorization separately only if the message tool's contract still requires it; established direct human instructions remain valid. Verify the human-identified destination with available tools and applicable task context before sending; if it remains ambiguous, explain the precise remaining gap rather than inventing a handle. Complete manual relay only when the human chooses it or no usable interactive/return channel exists. If no question channel exists, emit the full local result with that limitation and the pending human action, without claiming a question was asked or the result was delivered.

Never use a historical job's target, unverified/cached source_thread_id, guessed thread ID, fuzzy title or Bridge/control/maintenance thread as a shortcut. Never “try sending” to an uncertain conversation.

If an automatic send fails definitively without delivery, another verified route may be used. If its outcome is ambiguous, do not resend or switch routes automatically: emit the manual result, mark automatic status unconfirmed, and explain possible prior delivery to avoid duplicate relay. Do not resolve ambiguity through automatic polling.

## 6. Final result and delivery blockers

Freeze the conclusion against the actual task evidence: task identity, repository/workspace, applicable BASE_SHA and RESULT_SHA, actual files changed, outcome, verification/review, blockers and remaining limitations. If no commit exists, say so and do not invent RESULT_SHA. Use exact locators/digests for any separately persisted result artifact. No formal persistent Result Packet schema is required.

When a return destination has actually been verified, the returned result may include its exact current title and available observed conversation link or tool handle as an optional human-readable return hint. Do not invent a URL/ID, expose a Bridge maintenance caller/anonymous session as the destination, or claim delivery before the send result confirms it. A later dispatch may carry this hint as ordinary context, not a required envelope field or permanent binding. It must still match that later dispatch's actual source records; copied packets, renamed/moved chats or old hints cannot override current evidence. No automatic writeback, cross-session cache or registry is added.

When using local fallback, or reporting a real required return decision, include the applicable status:
ENGINEERING_STATUS: complete | blocked
AUTOMATIC_RETURN_STATUS: unavailable | failed | unconfirmed | authorization_required | authorization_unverified
RETURN_DELIVERY_STATUS: pending_human_relay | pending_human_authorization | awaiting_human_decision
RETURN_ACTION_REQUIRED: human relay to the specified origin, or direct human authorization for the specific result send
FINAL_RETURN_CONVERSATION_TITLE: <exact bound title, or unavailable>
AUTOMATIC_RETURN_BLOCKER: <specific unavailable capability, failed send, unresolved target ambiguity, unconfirmed delivery, absent/unverifiable direct human authorization, or explicit user prohibition>
RETURN_ROUTE_EVIDENCE: <routes evaluated, observations and why no safe automatic delivery was completed; never claim an unattempted check or send occurred>

A missing parent-return alone is not sufficient justification when the receiver can verify the origin using available conversation capabilities. The legacy unavailable ID field does not affect routing. A generic 'automatic routing unavailable' without the concrete reason is not an adequate fallback conclusion. When tools exist and permission is the only obstacle, classify authorization_required or authorization_unverified, not unavailable. Honor a user's explicit manual-only/no-message instruction without attempting automatic delivery.

Include all essential result content, not just a request to inspect the job later. Missing title/project information is not an engineering blocker: evaluate available safe return methods, then actively ask the human if the window cannot be confirmed. Do not invent metadata. Engineering complete means all required authorized work and verification are complete. Engineering blocked means the requested objective remains incomplete, regardless of result delivery.

Only after engineering success and either confirmed automatic delivery or complete explicit local result emission under the permitted fallback conditions may Codex mark the Goal complete under its activated completion contract. Never equate pending manual relay with confirmed return-to-origin delivery. A required question awaiting the human answer does not satisfy final-handoff completion.

## 7. Pre-dispatch checks and stop

Resolve task facts, repository/absolute workspace and required BASE_SHA; run Workspace routing preflight and freeze the route; record a known title or unavailable and generate the dispatch UUID; persist required artifacts through the selected Bridge and use their successful returned identities; fill the canonical envelope; run the following protocol and semantic preflight. Dispatch submits the exact validated handoff through that same Bridge; Prepare-only emits the same validated handoff without codex_start.

Protocol checks, scoped to each section (do not accept a field found elsewhere):
- Exactly one of each required section exists in canonical order, with the canonical field names/order and inline nonempty values.
- EXECUTION BRIEF begins with Conversation kind, Task identity, Dispatch token, Repository / workspace, BASE_SHA, Return mode in that order. Conversation kind is exactly ChatGPT; task/repository/workspace are actual values; workspace is absolute; BASE_SHA is a full 40-character Git SHA or exactly not applicable.
- FINAL RETURN TARGET fields follow the canonical order. Conversation kind is ChatGPT; Conversation title is a trustworthy current-dispatch value or literally unavailable; Dispatch token is the current dispatch UUID; Bound conversation ID is literally unavailable; Parent-return binding and Binding evidence are verified current-dispatch facts or unavailable; Known return transport is a verified capability or not established at dispatch.
- Dispatch token, Task identity, Repository / workspace and BASE_SHA are byte-for-byte identical between EXECUTION BRIEF and FINAL RETURN TARGET; resolve once and reuse rather than regenerating them.
- Return mode exists in all three sections, including RETURN ROUTING itself. All three equal auto by default, or all three equal manual for an explicit human manual-result/no-message instruction; the Goal and routing procedure agree with that choice.
- Required persisted artifacts have exact locators, filenames and digests from successful service results; no stale or guessed identity is used. When no artifacts are required, the payload says Artifacts: none.
- Task Payload and any persisted execution packet include the receiver execution-context check, local stop on mismatch, human correction and recheck before continuing the same task, as specified in section 4.
- No unresolved template placeholders or conflicting payload/protocol values remain. Existing Bridge LINT is an additional subset check, not a substitute for this preflight.

Retain the semantic checks:
- GOAL_PRESENT = yes
- RETURN_TARGET_PRESENT = yes
- ORIGIN_METADATA_VERIFIED_OR_EXPLICITLY_UNAVAILABLE = yes
- DISPATCH_TOKEN_FIXED_AND_REPEATED = yes
- AVAILABLE_RETURN_LOOKUP_AND_HUMAN_QUESTION_DEFINED = yes
- NO_HISTORICAL_CONVERSATION_SUBSTITUTION = yes
- NO_UNVERIFIED_RETURN_HANDLE_ROUTING = yes
- LEGACY_ID_FIELD_LITERAL_UNAVAILABLE = yes
- ORIGIN_BINDING_VERIFIED_OR_EXPLICITLY_UNAVAILABLE = yes
- RETURN_IS_PART_OF_GOAL_AND_HANDOFF_COMPLETION = yes
- RETURN_ROUTING_ORDER_DEFINED = yes
- PARENT_RETURN_PREFERRED_WHEN_ORIGIN_BOUND = yes
- DISPATCH_EVIDENCE_AND_HUMAN_IDENTIFICATION_DEFINED = yes
- AUTOMATIC_RETURN_EVALUATION_REQUIRED_BEFORE_MANUAL_RELAY = yes
- RETURN_TO_VERIFIED_ORIGIN_IS_DEFAULT = yes
- NO_SKILL_ADDED_ROUTINE_RETURN_AUTHORIZATION_GATE = yes
- ACTUAL_RETURN_AMBIGUITY_TRIGGERS_FOCUSED_HUMAN_QUESTION = yes
- MANUAL_RELAY_FALLBACK_DEFINED = yes
- NO_GUESSED_THREAD_ROUTING = yes
- ALL_ARTIFACTS_HAVE_EXACT_LOCATORS = yes (yes when none are needed)
- BASE_SHA_FIXED_WHEN_REQUIRED = yes (yes when not applicable)
- FIXED_DISPATCH_ENVELOPE_PRESENT = yes
- NO_AUTOMATIC_POLLING = yes

No parent-return capability is a prerequisite. Resolve missing required engineering facts or artifact locators before dispatch; explicit unavailable return metadata is not such a blocker. Checks remain Skill-local: do not create HACT state, persistent checklists, receipts, registries, callbacks, watchers, routing services, schedulers or new lifecycle machinery.

In Dispatch mode call codex_start once. On success visibly report the exact returned job/thread identifier together with Dispatch token, Task identity, Repository / workspace and BASE_SHA in the originating ChatGPT conversation, then end the normal dispatch workflow. Do not proactively codex_get, wake/probe or use equivalent polling because the job runs long, results are absent or progress is unknown. Uncertain dispatch failure or ambiguity is reported without automatic redispatch; a proven DISPATCH_LINT_FAILED rejection permits one corrected submission after fixing its reported issues. Only explicit user-requested status/result inspection authorizes codex_get; one request does not authorize recurring monitoring.
