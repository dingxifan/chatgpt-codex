import { mkdtempSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ArtifactStore } from "../src/artifacts.js";
import type { InstructionMetadata } from "../src/instruction.js";

export const TOKEN = "b3f29391-ef2c-46ed-912f-1c24d981a4d3";
export const AUTHORIZATION = "提前给予本窗口最终结果回传授权。\n仅本窗口，不包括发布或其他收件人。";
export function metadata(workspace: string, mode: "auto" | "manual" = "auto"): InstructionMetadata {
  return {
    schema: "codex-instruction/v1", dispatch_token: TOKEN, task_identity: "fixture-001",
    repository: "example/project", workspace, base_sha: "a".repeat(40), method_ref: "not applicable",
    route: { route_id: "fixture-route", computer: "fixture-computer", bridge_namespace: "fixture-bridge" },
    checkpoints: [{ id: "inspect", title: "Inspect fixture", required_checks: ["inputs"] }, { id: "verify", title: "Verify result", required_checks: ["tests"] }],
    return: {
      mode, conversation_id: "origin-chat", title_hint: "Fixture origin chat",
      origin_evidence_locator: "original-dispatch-record", human_instruction_locator: "original-human-request",
      authorization_evidence: {
        original_text: AUTHORIZATION, source_conversation_id: "origin-chat", source_message_id: "human-message",
        allowed_action: "send this complete result", applicable_scope: "same originating chat", explicit_limits: "no publication",
        prior_verification: { record_locator: "same-task-status:verification-1", source_read_tool_call_id: "read-call-1", checked_target_id: "origin-chat" },
      },
    },
    goal_core: "Inspect only this fixture and provide actual validation evidence. Read the same instruction file for details, maintain status and reuse applicable original authorization evidence under the real tool contract. Keep required unresolved decisions pending; freeze and deliver the full result under the selected return mode.",
  };
}
export function instructionText(value: InstructionMetadata, body = "## 操作与授权依据\nRead the fixture only. Preserve original authorization and real verification locators.\n") {
  return "# Fixture instruction\n\n## 任务元信息\n\n```json\n" + JSON.stringify(value, null, 2) + "\n```\n\n" + body;
}
export async function fixture(mode: "auto" | "manual" = "auto", change?: (value: InstructionMetadata) => void) {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), "codex-file-handoff-")));
  const workspace = path.join(root, "project");
  mkdirSync(workspace);
  const artifacts = new ArtifactStore(root);
  const value = metadata(workspace, mode);
  change?.(value);
  const file = await artifacts.put({ filename: "instruction.md", content: instructionText(value) });
  return { root, workspace, artifacts, metadata: value, file, input: { instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: TOKEN } };
}
