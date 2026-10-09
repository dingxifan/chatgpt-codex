# Single normal path through the handoff kernel

Use the actual installed executable prefix, handoff root and token from the generated transport. Pass literal argument values safely through the receiving task's shell; do not guess an installation path or create another instruction/request file. The compiled kernel is shipped with the existing Bridge build. It uses no native RPC, messaging, private Codex execution process or background service.

Arguments: action, actual handoff root, token, expected revision. Supply the action's JSON data on stdin. Native receiving identity comes from this task's CODEX_THREAD_ID; never set it to another task to make a check pass. Missing/mismatching identity is a real admission failure. Receiving admission also requires the confirmed same-task creation receipt; a still-unknown receipt is not a confirmed creation and does not permit another dispatch.

Read get_goal. For every action pass its actual goal object as goal, including threadId, objective, active status and createdAt. Additional native usage fields are accepted. This interface has no separate Goal ID. Pass actual trusted execution context, not a UI label or invented assertion. The kernel validates these reported values against the frozen binding; it cannot authenticate their provenance.

## admit — revision 0 only

Required JSON fields:

- goal: actual get_goal goal object.
- goal_activation_record, execution_context_record, instruction_read_record: actual native record/tool-call locators for activation, trusted context and full file/digest check.
- execution_context: sandbox_mode (danger-full-access/workspace-write/read-only), approval_policy (actual value), network_access (actual boolean).
- summary, next_action: concrete nonblank reception facts and first action.

Creates revision 1 at the registered status path. Conflicting task/file/Goal/profile, incomplete inputs or a pre-existing status refuses admission/reset. Metadata does not change actual permissions; the process stays within the receiving task's execution environment.

## check — current revision

JSON fields: goal and purpose (work or delivery).

work requires admission, the same active Goal and no necessary external blockers/unanswered decisions. It returns the actual current checkpoint and its required checks. Read relevant source details, then do authorized work inside that checkpoint.

delivery additionally requires all checkpoints closed and the unchanged frozen result. It returns the original return metadata/authorization evidence and preserved verification-record locators. These are inputs to actual native target/permission verification, not a generated grant.

## advance — current revision

Required fields: goal, checkpoint_id, complete (boolean), summary, next_action, blockers, pending_decisions, evidence and verification_records.

blockers/pending_decisions and verification_records are arrays of concrete strings/real locators. Only necessary external conditions/required human decisions block work. Ordinary verification failures stay in the current checkpoint for repair.

evidence is an array of objects with check_id, locator and outcome (pass/fail/not_run). Check IDs must come from this checkpoint's required_checks; use real evidence, never a claim substituted for a performed check.

- complete=false records progress and failed/passed checks, preserving evidence history and verification locators.
- complete=true advances exactly the current checkpoint only when every required check's latest reported outcome is pass, no required decisions/blockers remain, and the expected revision matches.
- Clearing a previously recorded blocker/decision requires a passing resolution check or a new real verification/decision locator. That locator is retained; it does not become authorization by itself.

Normal phase changes do not recreate the Goal or modify the instruction. A reported fail/not_run cannot be rewritten as a passed checkpoint without a later pass record. Check evidence remains receiver-reported; project verifiers/reviewers establish actual correctness.

## finish — current revision, all checkpoints closed

Required fields: goal, result_sha256, summary, next_action and verification_records.

Prepare the COMPLETE UTF-8 result at the registered result path first. finish reads that same file and binds its actual hash after checking all declared work and necessary decisions. Existing unbound result text alone does not pass the delivery gate. A frozen result rejects further stage updates/re-finalization; later byte changes invalidate checks and query delivery.

After finish, run check(delivery) with the new revision. Verify the real destination and human permission under the actual tool contract, use the unchanged complete result, check the real send outcome, then apply actual Goal completion rules. An unresolved required decision or uncertain delivery is not completion.

## Mechanical enforcement and limits

The writer serializes same-task actions with a transient lock, checks revision and prior file digest, publishes status via atomic replacement and rereads it before reporting success. Errors return nonzero. Normal cleanup removes lock/temp files; these are not additional persistent task documents. Do not remove an active lock or retry a possibly committed update blindly; inspect the actual record and resolve the specific failure in the same task.

codex_get uses the same structural validator. Missing/invalid status is explicit; it withholds result contents until the checkpoint record and frozen result pass. It does not equate turn completion or file existence with whole Goal completion.

This kernel cannot intercept arbitrary direct native tools, prove an opaque locator's truth, authenticate copied Goal/context data, or authorize sending. Native tool contracts, project checks and native Goal completion audit remain responsible for those boundaries. No fallback runtime/authority service, automatic alternate target or background observer is added.
