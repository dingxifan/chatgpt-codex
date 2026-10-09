import { HandoffKernel, type KernelOperations } from "../src/handoff-kernel.js";
import { InstructionStore } from "../src/instruction.js";
import { ReceiptStore } from "../src/receipts.js";
import { fixture, TOKEN } from "./instruction-fixture.js";

export async function kernelFixture(jobId = "fixture-job", operations?: KernelOperations) {
  const f = await fixture();
  const loaded = await new InstructionStore(f.artifacts, [f.root]).load(f.input);
  const receipts = new ReceiptStore(f.artifacts);
  const reserved = await receipts.reserve(loaded);
  const receipt = await receipts.finish(reserved, { creation_status: "created", job_id: jobId, diagnostic: null });
  const kernel = new HandoffKernel(f.artifacts, operations);
  const goal = { threadId: jobId, objective: loaded.goal, status: "active", createdAt: 1, tokensUsed: 0, updatedAt: 1 };
  const admission = {
    goal, goal_activation_record: "mock:native-goal-activation", execution_context_record: "mock:trusted-context",
    instruction_read_record: "mock:full-file-read",
    execution_context: { sandbox_mode: "read-only", approval_policy: "never", network_access: false },
    summary: "Fixture reception checked", next_action: "Inspect the fixture",
  };
  return { ...f, loaded, receipts, receipt, kernel, goal, admission, jobId };
}
export function advanceData(goal: unknown, checkpoint_id = "inspect", complete = true) {
  return {
    goal, checkpoint_id, complete, summary: "Fixture stage inspected", next_action: "Run next declared check",
    blockers: [], pending_decisions: [], evidence: [{ check_id: checkpoint_id === "inspect" ? "inputs" : "tests", locator: "mock:actual-check-record", outcome: "pass" }],
    verification_records: ["mock:new-verification"],
  };
}
export async function completeChecks(f: Awaited<ReturnType<typeof kernelFixture>>) {
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, advanceData(f.goal));
  await f.kernel.apply(TOKEN, f.jobId, "advance", 2, advanceData(f.goal, "verify"));
}
