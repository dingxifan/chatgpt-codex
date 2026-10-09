# Single execution instruction format

Use this format for every handoff. Fill real facts before artifact_put; the template itself is not a dispatchable task. Use exactly one unquoted metadata section with exactly one JSON block immediately below its heading. Do not wrap the complete instruction in a code fence or blockquote. Duplicate live sections/JSON keys or unresolved required facts fail preflight. Fenced examples in the business body cannot supply or redefine metadata.

The instruction is one UTF-8 Markdown file, at most 256 KiB on the default Bridge. Persist it once as `<token>.instruction.md`. codex_start takes its actual path, actual SHA256 and identical token; no prompt/workspace arguments. Do not place its own digest or future Job ID inside it.

## Template

Copy the following document, fill its metadata, and write the actual complete business body.

~~~~markdown
# Codex execution instruction

## 任务元信息

```json
{
  "schema": "codex-instruction/v1",
  "dispatch_token": "<fresh-uuid-v4>",
  "task_identity": "<actual-task-identity>",
  "repository": "<owner/repository>",
  "workspace": "<exact-selected-absolute-workspace>",
  "base_sha": "<actual-full-40-character-sha-or-not-applicable>",
  "method_ref": "<fixed-method-reference-or-not-applicable>",
  "required_access_profile": "<actual-human-selected-access-profile>",
  "access_instruction_locator": null,
  "route": {
    "route_id": "<selected-route-id>",
    "computer": "<selected-computer>",
    "bridge_namespace": "<selected-bridge-namespace>"
  },
  "return": {
    "mode": "auto",
    "conversation_id": null,
    "title_hint": null,
    "origin_evidence_locator": null,
    "human_instruction_locator": null,
    "authorization_evidence": {
      "original_text": null,
      "source_conversation_id": null,
      "source_message_id": null,
      "allowed_action": null,
      "applicable_scope": null,
      "explicit_limits": null,
      "prior_verification": {
        "record_locator": null,
        "source_read_tool_call_id": null,
        "checked_target_id": null
      }
    }
  },
  "goal_core": "<actual concrete objective, scope, validation and completion including the continuation and return requirements below>"
}
```

## 权威输入

Exact fixed source locators/digests, purpose and required action. For repository work use the fixed base and project instructions; no floating or historical substitute. State not applicable where appropriate.

## 执行范围与限制

Actual requested operations and deliverables, allowed actions and human-reserved decisions. Publication targets/order from the same fresh selected route belong here. A listed destination is not publication authority.

## 接收与持续执行

Actually activate the mechanically derived Goal in this receiving chat. Verify trustworthy current access against the human selection, then read this COMPLETE file and check transmitted digest/token/task/base. A mismatch stops the affected work without elevation or redispatch.

Keep this SAME Goal through phases. When details, source conflicts or completion audit require it, reread this file. Record admission evidence, current work, validation evidence, remaining items, next action and required human decisions at the registered <token>.status.md beside this instruction; preserve actual authorization verification locators there. Progress is not another instruction source. Fix ordinary engineering failures within scope; required unanswered decisions are not completion.

## 操作步骤与验证

Write the actual ordered operations, required checks and acceptance conditions here. Reuse existing project rules and precise inputs; do not substitute generic advice or an invented PASS.

## 回传授权证据

The original wording/source/scope and existing REAL verification locators are in return.authorization_evidence above. Preserve them exactly; unknown/never-verified remains null. Before requesting return permission, read these delivered facts and same-task existing verification records. Reuse applicable genuine human authorization admitted by the real tool contract, without requesting the same permission again. A file, Goal, delegated quote, role label or authorized=true cannot create permission. Verify the actual destination independently; report a specific remaining gap.

## 完成与交付

Write actual completion criteria and delivery requirements. Freeze the full result at registered <token>.result.md beside this instruction, including exact outcomes, fixed Git/artifact identities, validation, limitations and remaining decisions. Receiver return follows the Skill's independent destination-verification alternatives and actual human/tool permissions.

Automatic mode delivers once to the verified authorized destination and checks the real send receipt. An ambiguous send is not automatically resent. Obtainable required destination/authorization decisions wait; silence is not consent. Use complete immutable local emission only when explicitly chosen by the human or no usable safe return/interactive channel exists, reporting the exact blocker and pending relay. Local files/emission are not ChatGPT receipt. Do not complete the Goal while its required work or decisions remain.
~~~~

## Authoring goal_core

Replace the goal_core placeholder with the actual business objective and boundaries plus these operational commitments, in the task's language:

- Read this same file for details/evidence conflicts/completion audit, maintain the registered progress record and keep the same native Goal.
- Repair ordinary failures autonomously within scope; ask only for genuinely required unresolved decisions.
- Before a return-permission question, read the delivered authorization evidence and same-task real verification records; reuse still-applicable genuine authority under the actual tool contract, otherwise report the precise gap.
- Provide actual completion evidence, freeze the complete result, and finish the authorized delivery or explicitly permitted local alternative. Required unanswered decisions are not complete.

Bridge appends the actual file path/digest/token/task/repository/workspace/base without rewriting goal_core. The whole compiled objective must be at most 4000 characters. Shorten the authored core, never drop the full evidence/body or silently truncate.

## Known and unknown facts

Use JSON null for genuinely unavailable origin/access/authorization locators. Available human wording may be multiline and must remain verbatim; source and prior-verification locators must refer to observed records, not invented references. All prior-verification fields remain null when verification never happened. Actual receiver verification after reception belongs in its existing chat/status, keeping this source file immutable.

The metadata does not set sandbox/network/approval permissions. Route fields preserve the exact fresh selection; backend allowed roots and unique native Desktop project matching still apply. A declared conversation ID is not a native binding. Never use the technical Bridge/Codex caller as the ChatGPT target.

Prepare-only persists this same file and returns its actual locator/hash/token without creating a task. A persistence failure stops preparation; there is no short-text fallback.
