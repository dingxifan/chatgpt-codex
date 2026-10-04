---
name: codex-dispatch
description: Prepare or dispatch ChatGPT-to-Codex handoffs when the user asks to hand off, send, delegate, execute, implement, or continue work in Codex or Codex Bridge, or generate an execution brief or manual handoff. Require Goal activation, bind the origin at dispatch, use exact artifact locators, return safely with human-relay fallback, and stop after dispatch without automatic polling. Exclude conceptual Codex/Bridge discussion, design without a handoff, explanations of past polling, and status-only queries.
---

# Codex Dispatch

Prepare a complete handoff; dispatch only when the user requests actual execution.

**FORMAT IS MANDATORY FOR BRIDGE LINT.** Generate the fixed envelope in section 2 exactly: preserve the four section names/order and the inline field names. Do not rename, omit, translate the machine-parsed labels, replace them with free-form prose, put values on the following line, or wrap the envelope in a code fence. Engineering prose may be Chinese or another user-requested language. Check the actual fields before codex_start; formatting is a dispatch precondition, not optional style. Otherwise Bridge returns DISPATCH_LINT_FAILED and creates no task.

## 1. Mode and execution truth

- Prepare-only: generate the full execution instruction for manual transfer; do not call codex_start.
- Dispatch: generate the full instruction and call codex_start once with the exact workspace and instruction. Requests to continue work use the same contract and do not authorize repeated dispatch.
- Status-only: an explicit request such as “查一下”, “看状态”, or “取结果” permits one appropriate codex_get snapshot for the identified job, without new dispatch or recurring monitoring.

Resolve objective, repository/workspace, scope, authoritative references, required validation/review, and any concrete task restrictions explicitly supplied by the user. Fix the full BASE_SHA before dispatch when repository truth requires a baseline; never substitute floating HEAD, main, or “latest”. Resolve a missing required baseline before dispatch. Preserve the user's task identity; if none exists, assign a label explicitly as this handoff's task label, not as a repository or HACT record. Distinguish repeated dispatches of the same task in the prompt without creating a registry.

## 2. Capture and bind the origin before dispatch

The origin is the current ChatGPT conversation issuing THIS dispatch, not the receiving Codex conversation. Capture its exact title and any accurate conversation ID or native return binding from trustworthy current-session/runtime metadata. Record the evidence establishing that the identifier belongs to this origin and this dispatch. A user-supplied identifier must explicitly identify this task's origin; resolve any conflict instead of silently changing destinations.

Do not search history to manufacture a current-session binding. Do not invent IDs, return handles, or codex_start parameters. When the actual tool accepts only workspace and prompt, put verified origin information in the prompt; only the runtime can provide a native parent binding. Obtain the exact origin title before finalizing the handoff. Record an absent ID or binding as unavailable, and an unestablished transport as not established at dispatch. These describe the sender's knowledge at dispatch, not the receiving Codex environment's final capabilities. An absent ID/native transport does not block engineering; an unknown origin title blocks dispatch preparation under the envelope contract. Once dispatched, preserve the semantic origin, inspect the receiver's available return capabilities at final handoff, and use manual relay only after the routing procedure establishes that safe automatic return cannot be completed.

Keep origin identity separate from transport capability: an accurate ID is not proof a messaging tool accepts it, and a tool named notify_parent is not proof it returns to ChatGPT. A source_thread_id is usable only if trustworthy evidence establishes that it identifies this dispatch's actual originating ChatGPT conversation. A routable Bridge/runtime thread is not automatically that origin.

Every generated handoff uses the fixed sections and inline field syntax below, in this order. Replace every bracketed value with actual facts. Plain headings or Markdown heading prefixes are accepted; do not wrap the envelope in a code fence. Supplementary execution details may follow the EXECUTION BRIEF fields, and supplementary origin evidence may follow the FINAL RETURN TARGET fields.

MANDATORY GOAL ACTIVATION
Before substantive work, actually activate this Goal; do not begin before activation.
/goal [Concrete objective including final delivery to FINAL RETURN TARGET per RETURN ROUTING.]

EXECUTION BRIEF
Task identity: [this task's identity]
Repository / workspace: [repository and exact workspace]
BASE_SHA: [full 40-character SHA, or not applicable]
[Exact input locators, engineering scope, restrictions and validation.]

FINAL RETURN TARGET
Conversation kind: ChatGPT
Conversation title: [exact originating ChatGPT title]
Bound conversation ID: [verified originating ChatGPT ID, or unavailable]
Task identity: [identical to EXECUTION BRIEF]
Repository / workspace: [identical to EXECUTION BRIEF]
BASE_SHA: [identical to EXECUTION BRIEF]

RETURN ROUTING
Return mode: auto
[Ordered safe return procedure, genuine tool constraints, focused ask behavior and permitted fallback.]

Use auto by default; use manual only when the human expressly chooses manual handoff. Preserve that choice in both the Goal and routing instructions. An unavailable ID is allowed; an absent/unknown title is not ready for dispatch or manual execution. Obtain the actual origin title rather than substituting “parent window” or guessing one. A title is a routing hint, not proof of uniqueness; receiving Codex must still verify the actual origin before sending. Source evidence and native return bindings may be included as supplementary facts, never as substitutes for the required target.

### Mandatory pre-dispatch LINT

Bridge rejects malformed handoffs BEFORE any desktop dispatch with status failed, error_code DISPATCH_LINT_FAILED, errors containing rule/field/message, and no job_id. It checks Goal opening, actual target fields, technical caller-ID misuse, repeated/mismatched task/workspace/baseline fields and return mode. It does not prove the title/ID is true, activate the Goal itself, inspect arbitrary input artifacts for semantic conflicts or enforce the receiver's later behavior.

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

For long ChatGPT-generated Markdown, designs, reports, or other text not already available to Codex, call artifact_put or an existing equivalent text-drop capability BEFORE composing the final instruction, including in prepare-only mode. Use the successful result's exact readable file/path locator, filename, purpose, intended destination/action, and returned digest when available. Reuse a persisted artifact only when its exact locator and intended content are established. Do not repeatedly transfer long bodies through GitHub connectors or the execution prompt.

Every required input artifact needs an exact locator. Never use “see attachment”, “the file above”, “the previous design document”, or equivalent. Missing required artifact locators block dispatch and prevent presenting a manual handoff as ready. State Artifacts: none when none are required. Tell Codex to verify readability and supplied digests before applying artifacts; do not silently substitute a similarly named copy.

## 4. Mandatory Goal and execution brief

Every handoff starts with MANDATORY GOAL ACTIVATION and tells the receiver:

Before substantive analysis, file modification, command execution, Git operations, review, or implementation, establish the following /goal in this Codex conversation. Do not begin substantive work until the Goal is active. Use actual Goal activation; repeating the command is not activation. If activation cannot be established, do not begin engineering and report the limitation through the return procedure below.

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
2. Otherwise use the conversation ID fixed and verified at dispatch, with an available messaging capability that accepts that identifier, operating under its existing tool contract. Do not rediscover or replace a trustworthy fixed origin through title search. Confirm automatic delivery from the tool's documented result.
3. If no usable trustworthy binding exists, use available conversation search/list/read/message capabilities to try to establish the origin; this verification step is required when those capabilities and sufficient task context are available. Require exact title equality, readable evidence of THIS dispatch matching its task identity, repository and full BASE_SHA where applicable, and exactly one verified candidate. Similar titles, same project, “most recent”, common task keywords or an older matching task are insufficient. Account for pagination, truncation and other unexcluded candidates; a partial search is not proof of uniqueness. If uniqueness or scope completeness cannot be established, use manual relay. Use the verified target under the sending tool's existing contract; do not add a separate Skill consent procedure.
4. Only after applicable safe route evaluation or an actual tool constraint shows automatic return cannot be completed, emit the complete final result in the current Codex conversation. Use explicit human relay for transport/target failure; when an available messaging tool lacks verified direct human permission and a human-input channel exists, ask directly and wait; use pending_human_authorization local fallback only if that channel is unavailable or the human explicitly chooses local handoff. Do not block authorized engineering or send to any uncertain target. Missing/renamed title, unreadable candidate context or conflicting identity also require manual relay.

Never use a historical job's target, unverified/cached source_thread_id, guessed thread ID, fuzzy title or Bridge/control/maintenance thread as a shortcut. Never “try sending” to an uncertain conversation.

If an automatic send fails definitively without delivery, another verified route may be used. If its outcome is ambiguous, do not resend or switch routes automatically: emit the manual result, mark automatic status unconfirmed, and explain possible prior delivery to avoid duplicate relay. Do not resolve ambiguity through automatic polling.

## 6. Final result and delivery blockers

Freeze the conclusion against the actual task evidence: task identity, repository/workspace, applicable BASE_SHA and RESULT_SHA, actual files changed, outcome, verification/review, blockers and remaining limitations. If no commit exists, say so and do not invent RESULT_SHA. Use exact locators/digests for any separately persisted result artifact. No formal persistent Result Packet schema is required.

When using local fallback, or reporting a real required return decision, include the applicable status:
ENGINEERING_STATUS: complete | blocked
AUTOMATIC_RETURN_STATUS: unavailable | failed | unconfirmed | authorization_required | authorization_unverified
RETURN_DELIVERY_STATUS: pending_human_relay | pending_human_authorization | awaiting_human_decision
RETURN_ACTION_REQUIRED: human relay to the specified origin, or direct human authorization for the specific result send
FINAL_RETURN_CONVERSATION_TITLE: <exact bound title, or unavailable>
AUTOMATIC_RETURN_BLOCKER: <specific unavailable capability, failed send, unresolved target ambiguity, unconfirmed delivery, absent/unverifiable direct human authorization, or explicit user prohibition>
RETURN_ROUTE_EVIDENCE: <routes evaluated, observations and why no safe automatic delivery was completed; never claim an unattempted check or send occurred>

A missing parent-return or bound ID alone is not sufficient justification when the receiver can verify the origin using available conversation capabilities. A generic 'automatic routing unavailable' without the concrete reason is not an adequate fallback conclusion. When tools exist and permission is the only obstacle, classify authorization_required or authorization_unverified, not unavailable. Honor a user's explicit manual-only/no-message instruction without attempting automatic delivery.

Include all essential result content, not just a request to inspect the job later. Title unavailable means the user must carry the packet back to the conversation that issued THIS dispatch; do not invent its title. Engineering complete means all required authorized work and verification are complete. Engineering blocked means the requested objective remains incomplete, regardless of result delivery.

Only after engineering success and either confirmed automatic delivery or complete explicit local result emission under the permitted fallback conditions may Codex mark the Goal complete under its activated completion contract. Never equate pending manual relay with confirmed return-to-origin delivery. A required question awaiting the human answer does not satisfy final-handoff completion.

## 7. Pre-dispatch checks and stop

Verify internally before dispatch or presenting a prepare-only handoff as ready:
- GOAL_PRESENT = yes
- RETURN_TARGET_PRESENT = yes
- ORIGIN_CAPTURE_ATTEMPTED = yes
- ORIGIN_BINDING_VERIFIED_OR_EXPLICITLY_UNAVAILABLE = yes
- RETURN_CONVERSATION_TITLE_RECORDED_OR_UNAVAILABLE = yes
- RETURN_IS_PART_OF_GOAL_AND_HANDOFF_COMPLETION = yes
- RETURN_ROUTING_ORDER_DEFINED = yes
- PARENT_RETURN_PREFERRED_WHEN_ORIGIN_BOUND = yes
- TITLE_CONTEXT_FALLBACK_DEFINED = yes
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

In Dispatch mode call codex_start once. On success report the returned job/thread identifier and end the normal dispatch workflow. Do not proactively codex_get, wake/probe or use equivalent polling because the job runs long, results are absent or progress is unknown. Uncertain dispatch failure or ambiguity is reported without automatic redispatch; a proven DISPATCH_LINT_FAILED rejection permits one corrected submission after fixing its reported issues. Only explicit user-requested status/result inspection authorizes codex_get; one request does not authorize recurring monitoring.
