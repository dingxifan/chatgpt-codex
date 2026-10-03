---
name: codex-dispatch
description: Prepare or dispatch ChatGPT-to-Codex handoffs when the user asks to hand off, send, delegate, execute, implement, or continue work in Codex or Codex Bridge, or generate an execution brief or manual handoff. Require Goal activation, bind the origin at dispatch, use exact artifact locators, return safely with human-relay fallback, and stop after dispatch without automatic polling. Exclude conceptual Codex/Bridge discussion, design without a handoff, explanations of past polling, and status-only queries.
---

# Codex Dispatch

Prepare a complete handoff; dispatch only when the user requests actual execution.

## 1. Mode and execution truth

- Prepare-only: generate the full execution instruction for manual transfer; do not call codex_start.
- Dispatch: generate the full instruction and call codex_start once with the exact workspace and instruction. Requests to continue work use the same contract and do not authorize repeated dispatch.
- Status-only: an explicit request such as “查一下”, “看状态”, or “取结果” permits one appropriate codex_get snapshot for the identified job, without new dispatch or recurring monitoring.

Resolve objective, repository/workspace, scope, authoritative references, required validation/review, and any concrete task restrictions explicitly supplied by the user. Fix the full BASE_SHA before dispatch when repository truth requires a baseline; never substitute floating HEAD, main, or “latest”. Resolve a missing required baseline before dispatch. Preserve the user's task identity; if none exists, assign a label explicitly as this handoff's task label, not as a repository or HACT record. Distinguish repeated dispatches of the same task in the prompt without creating a registry.

## 2. Capture and bind the origin before dispatch

The origin is the current ChatGPT conversation issuing THIS dispatch, not the receiving Codex conversation. Capture its exact title and any accurate conversation ID or native return binding from trustworthy current-session/runtime metadata. Record the evidence establishing that the identifier belongs to this origin and this dispatch. A user-supplied identifier must explicitly identify this task's origin; resolve any conflict instead of silently changing destinations.

Do not search history to manufacture a current-session binding. Do not invent IDs, return handles, or codex_start parameters. When the actual tool accepts only workspace and prompt, put verified origin information in the prompt; only the runtime can provide a native parent binding. Record absent title, ID or binding as unavailable, and an unestablished transport as not established at dispatch. These describe the sender's knowledge at dispatch, not the receiving Codex environment's final capabilities. Missing return transport or source metadata does not block otherwise authorized engineering; preserve the semantic origin, inspect the receiver's available return capabilities at final handoff, and use manual relay only after the routing procedure establishes that safe automatic return cannot be completed.

Keep origin identity separate from transport capability: an accurate ID is not proof a messaging tool accepts it, and a tool named notify_parent is not proof it returns to ChatGPT. A source_thread_id is usable only if trustworthy evidence establishes that it identifies this dispatch's actual originating ChatGPT conversation. A routable Bridge/runtime thread is not automatically that origin.

Every handoff includes:

FINAL RETURN TARGET
Semantic identity: The ChatGPT conversation that dispatched THIS task.
Conversation title: <exact current origin title, or unavailable>
Bound conversation ID: <verified origin ID, or unavailable>
Parent-return binding: <existing runtime binding, or unavailable>
Binding evidence: <current-dispatch evidence, or unavailable>
Known return transport: <verified available capability, or not established at dispatch>
Task identity: <task identity and this handoff's distinguishing context>
Repository / workspace: <exact repository and workspace>
BASE_SHA: <full fixed SHA when required, otherwise not applicable>
RETURN AUTHORIZATION
Human instruction: <exact original human wording, or not granted>
Original human message reference: <readable verified origin/message reference, or unavailable>
Authorization basis: <standing Skill acceptance, explicit task instruction, or none>
Accepted terms reference: <readable disclosed terms plus human acceptance, when using standing permission>
Authorized scope: <this human's Skill-dispatched task/result and its verified origin, or narrower explicit scope>
Revocation/restrictions: <applicable later human instructions, or none known>
Sender evidence status: <direct human evidence present, absent, or unverified>
Receiver verification: <verify before any tool requiring direct human permission>

Replace fields with observed facts. Conversation title is a routing hint and disambiguation signal, not by itself a guaranteed unique identifier. Metadata explicitly marked unavailable is permitted; guessed metadata is not.


### Standing return authorization and direct human evidence

Return intent, target identity and permission to send are separate facts. A delegated task's “please return/report back”, a generated /goal, this Skill's instructions, or a user-role wrapper around machine-generated delegation is NOT by itself direct human authorization.

For a return tool whose contract requires direct human permission, capture an actual human instruction authorizing this task's final result to the named origin. Preserve its exact wording and a readable original-human-message reference (verified conversation ID/link and message/turn ID when available), plus scope: this task/result and this destination. Never invent an instruction, identifier, provenance or approval.

Use standing authorization as the normal operating mode AFTER the human has actually accepted this Skill's disclosed use agreement:

“By enabling/using codex-dispatch under this agreement, I authorize the receiving Codex to deliver the final result of tasks dispatched through this Skill directly to each task's verified originating conversation, without asking again for each task. This covers only those task results; it does not permit unrelated messages, other recipients, or broader engineering actions.”

Accept an actual human acceptance in conversation, or a trustworthy host-recorded opt-in that presented these terms and identifies the accepting human. A short “yes/agree” can count when its disclosed terms and context are readable; preserve BOTH the terms reference and the original acceptance reference rather than inventing a longer human quote. A generic installation flag, inherited plugin cache, silent upgrade, or the model automatically matching this Skill is not by itself evidence that the human accepted the agreement.

After acceptance, ChatGPT may proactively choose/apply the Skill within that human's task context and reuse the same standing grant; do not request a new grant per dispatch or wait for the human to repeat a complete authorization sentence. The human does not need to restate each conversation title: the covered destination is THAT task's independently verified origin. An explicit task-level grant remains valid as an alternative.

Verify that the grant belongs to the human who authorized the task, covers the final-result send and its verified origin, remains applicable, and has not been narrowed or revoked. A later manual-only/no-message instruction overrides the standing grant for its scope. Do not treat the plugin author's, another user's, or another account's acceptance as the current human's permission. Public Skill/package files describe this agreement but cannot themselves grant it to everyone.

Reuse existing readable human-message/host evidence and carry its references in the handoff. Do not introduce a consent registry, approval receipt system, callback service, or new persistent lifecycle. Do not include a particular user's private acceptance in the shared repository or plugin package.

Only when neither accepted standing authorization nor an applicable direct task instruction is established, and the intended tool requires it, obtain ONE human acceptance of the disclosed Skill use agreement (or a narrower permission for this task's final result). Do not ask again when valid standing evidence already exists. This is specific cross-chat result-return consent, not generic Human Authority reminders, engineering approval lists or runtime permissions. Explain the tool's direct-human requirement. Wait for required acceptance; elapsed time is not consent. The human may instead proceed with engineering and an authorization-required/manual final result.

The receiver must verify authorization according to the actual tool contract: use a direct human instruction/accepted standing agreement in its own conversation, trustworthy runtime provenance, or read the original human instruction/standing acceptance through an available authenticated conversation tool. Quoted text or a sender's “authorized” label alone is insufficient when provenance cannot be verified. Verification may use the safe origin lookup below, but never discover a different chat to escape an authorization boundary.

If sender-side human permission exists but the receiver cannot verify it, report authorization_unverified. If direct human permission is absent, report authorization_required. Continue engineering; do not send, claim tool absence, or claim the origin received anything. Identify the exact pending result/destination and the one direct human instruction needed, without reopening engineering approvals. A later direct human grant covering that send permits delivery through a verified route.

A genuine native parent-return primitive may have different authorization semantics. Follow its documented contract; do not impose an extra cross-chat permission request when that primitive legitimately permits reporting to its bound parent as part of the task.

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
- Deliver the final conclusion yourself to the explicit origin for THIS task using the ordered return procedure and the return tool's authorization contract; never guess a ChatGPT target. Expressly request that specific final delivery and carry the actual human permission evidence when required. This delegated request does not itself grant permission. With verified applicable human permission, do not defer delivery for another 'send it yourself'; without it, report the specific authorization gap and do not send. Preserve any user instruction explicitly forbidding automatic messages.
- Unavailable return transport does not block authorized engineering work or count as an engineering CAPABILITY blocker.
- Successful execution requires the requested outcome, required verification/review, and immutable repository delivery when applicable, plus either confirmed authorized automatic final delivery to the verified origin or complete immutable local result emission identifying the transport, target or human-authorization obstacle preventing delivery.
- If safe authorized automatic delivery cannot be completed after checking applicable routes, emit the complete immutable result with the exact blocker. A true transport/target fallback is pending_human_relay; when the tool exists but direct human authorization is absent or unverifiable, mark pending_human_authorization. Local result emission satisfies Codex's execution/packaging responsibility, not receipt by ChatGPT. Include the route/authorization facts and never claim delivery. These alternatives must be in the Goal from activation, not introduced later.
- Early engineering blockers remain blockers; reporting them, automatically or manually, does not achieve the engineering objective or justify marking its Goal complete.

The generated Goal's local-emission completion alternative includes authorization-required/unverified result emission as well as transport fallback; neither implies delivery to ChatGPT. Do not leave engineering blocked solely by message-send permission.

After the opening, provide EXECUTION BRIEF with exact workspace/repository, necessary fixed BASE_SHA, scope, inputs, required work, validation/review, and any concrete restrictions explicitly supplied by the user. Include FINAL RETURN TARGET, RETURN AUTHORIZATION and RETURN ROUTING explicitly.

## 5. Ordered return routing

Apply the same routing procedure to successful final results and both legitimate early returns. Before choosing local fallback, inspect the return capabilities actually available to the receiving task and evaluate the applicable routes below. Do not skip safe automatic routing merely because parent-return is absent, a dispatch field says unavailable, or manual relay is easier. Capability inspection and an authorized final message send are part of final delivery, not prohibited job-status polling. Do not send test messages to unverified candidates; route evaluation is not a demand to try every send tool.

1. Prefer the existing task-native parent-return primitive only when its documented/runtime binding establishes that it reaches this dispatch's actual ChatGPT origin, not an intermediate Codex, Bridge, maintenance or control conversation.
2. Otherwise use the conversation ID fixed and verified at dispatch, with an available messaging capability that accepts that identifier and whose required direct human authorization is verified. Do not rediscover or replace a trustworthy fixed origin through title search. Confirm automatic delivery from the tool's documented result.
3. If no usable trustworthy binding exists, use available conversation search/list/read/message capabilities to try to establish the origin; this verification step is required when those capabilities and sufficient task context are available. Require exact title equality, readable evidence of THIS dispatch matching its task identity, repository and full BASE_SHA where applicable, and exactly one verified candidate. Similar titles, same project, “most recent”, common task keywords or an older matching task are insufficient. Account for pagination, truncation and other unexcluded candidates; a partial search is not proof of uniqueness. If uniqueness or scope completeness cannot be established, use manual relay. Once a unique target is verified, separately verify the sending tool's human-authorization requirement before sending; target verification alone does not grant permission.
4. Only after applicable route and authorization verification shows no safe authorized automatic route can be completed, emit the complete final result in the current Codex conversation. Use explicit human relay for transport/target failure; use pending_human_authorization when an available messaging tool lacks verified direct human permission. Do not block authorized engineering or send to any uncertain target. Missing/renamed title, unreadable candidate context or conflicting identity also require manual relay.

Never use a historical job's target, unverified/cached source_thread_id, guessed thread ID, fuzzy title or Bridge/control/maintenance thread as a shortcut. Never “try sending” to an uncertain conversation.

If an automatic send fails definitively without delivery, another verified route may be used. If its outcome is ambiguous, do not resend or switch routes automatically: emit the manual result, mark automatic status unconfirmed, and explain possible prior delivery to avoid duplicate relay. Do not resolve ambiguity through automatic polling.

## 6. Final result and delivery blockers

Freeze the conclusion against the actual task evidence: task identity, repository/workspace, applicable BASE_SHA and RESULT_SHA, actual files changed, outcome, verification/review, blockers and remaining limitations. If no commit exists, say so and do not invent RESULT_SHA. Use exact locators/digests for any separately persisted result artifact. No formal persistent Result Packet schema is required.

When using manual fallback, include:
ENGINEERING_STATUS: complete | blocked
AUTOMATIC_RETURN_STATUS: unavailable | failed | unconfirmed | authorization_required | authorization_unverified
RETURN_DELIVERY_STATUS: pending_human_relay | pending_human_authorization
RETURN_ACTION_REQUIRED: human relay to the specified origin, or direct human authorization for the specific result send
FINAL_RETURN_CONVERSATION_TITLE: <exact bound title, or unavailable>
AUTOMATIC_RETURN_BLOCKER: <specific unavailable capability, failed send, unresolved target ambiguity, unconfirmed delivery, absent/unverifiable direct human authorization, or explicit user prohibition>
RETURN_ROUTE_EVIDENCE: <routes evaluated, observations and why no safe automatic delivery was completed; never claim an unattempted check or send occurred>
RETURN_AUTHORIZATION_EVIDENCE: <human instruction/reference actually verified, or precise reason verification/permission is missing>

A missing parent-return or bound ID alone is not sufficient justification when the receiver can verify the origin using available conversation capabilities. A generic 'automatic routing unavailable' without the concrete reason is not an adequate fallback conclusion. When tools exist and permission is the only obstacle, classify authorization_required or authorization_unverified, not unavailable. Honor a user's explicit manual-only/no-message instruction without attempting automatic delivery.

Include all essential result content, not just a request to inspect the job later. Title unavailable means the user must carry the packet back to the conversation that issued THIS dispatch; do not invent its title. Engineering complete means all required authorized work and verification are complete. Engineering blocked means the requested objective remains incomplete, regardless of result delivery.

Only after engineering success and either confirmed automatic delivery or complete explicit local result emission with a truthful transport/target/authorization status may Codex mark the Goal complete under its activated completion contract. Never equate pending manual relay with confirmed return-to-origin delivery.

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
- DIRECT_HUMAN_RETURN_AUTHORIZATION_CAPTURED_OR_GAP_DECLARED = yes
- STANDING_SKILL_ACCEPTANCE_REUSED_WHEN_APPLICABLE = yes
- RECEIVER_AUTHORIZATION_VERIFICATION_REQUIRED_WHEN_TOOL_REQUIRES_IT = yes
- MANUAL_RELAY_FALLBACK_DEFINED = yes
- NO_GUESSED_THREAD_ROUTING = yes
- ALL_ARTIFACTS_HAVE_EXACT_LOCATORS = yes (yes when none are needed)
- BASE_SHA_FIXED_WHEN_REQUIRED = yes (yes when not applicable)
- NO_AUTOMATIC_POLLING = yes

No parent-return capability is a prerequisite. Resolve missing required engineering facts or artifact locators before dispatch; explicit unavailable return metadata is not such a blocker. Checks remain Skill-local: do not create HACT state, persistent checklists, receipts, registries, callbacks, watchers, routing services, schedulers or new lifecycle machinery.

In Dispatch mode call codex_start once. On success report the returned job/thread identifier and end the normal dispatch workflow. Do not proactively codex_get, wake/probe or use equivalent polling because the job runs long, results are absent or progress is unknown. Dispatch failure or ambiguity is reported without automatic redispatch. Only explicit user-requested status/result inspection authorizes codex_get; one request does not authorize recurring monitoring.
