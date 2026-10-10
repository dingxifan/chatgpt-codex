import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { HandoffKernel, renderStatus, type TaskStatus } from "../src/handoff-kernel.js";
import { runKernel } from "../src/handoff-kernel-cli.js";
import { TOKEN, AUTHORIZATION } from "./instruction-fixture.js";
import { advanceData, completeChecks, kernelFixture } from "./kernel-fixture.js";

const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
test("one normal path admits, checks, advances declared stages, freezes result and reloads original authority at delivery", async () => {
  const f = await kernelFixture();
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 0, advanceData(f.goal)), /ADMISSION_MISSING/);
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const work = await f.kernel.apply(TOKEN, f.jobId, "check", 1, { goal: f.goal, purpose: "work" });
  assert.equal((work.checkpoint as any).id, "inspect");
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, advanceData(f.goal));
  await f.kernel.apply(TOKEN, f.jobId, "advance", 2, advanceData(f.goal, "verify"));
  const result = "# Fixed complete result\nNo actual native task was run.\n";
  writeFileSync(f.loaded.result_path, result);
  await f.kernel.apply(TOKEN, f.jobId, "finish", 3, { goal: f.goal, result_sha256: hash(result), summary: "Fixture ready", next_action: "Verify real send contract", verification_records: ["mock:return-source-read"] });
  const delivery = await f.kernel.apply(TOKEN, f.jobId, "check", 4, { goal: f.goal, purpose: "delivery" });
  assert.equal((delivery.return_instructions as any).authorization_evidence.original_text, AUTHORIZATION);
  assert((delivery.verification_records as string[]).includes("read-call-1"));
  assert((delivery.verification_records as string[]).includes("mock:return-source-read"));
  assert.equal(delivery.native_authorization, "not_verified_by_kernel");
  const inspected = await f.kernel.inspect(f.receipt);
  assert.equal((inspected.validation as any).status, "valid");
  assert.equal((inspected.frozen_result_file as any).text, result);
  assert.equal(readdirSync(f.root).filter(name => /\.lock$|\.tmp$/.test(name)).length, 0);
});

test("wrong task and changed/paused Goal cannot admit or advance", async () => {
  const f = await kernelFixture();
  await assert.rejects(f.kernel.apply(TOKEN, "other-job", "admit", 0, f.admission), /TASK_BINDING_INVALID/);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "admit", 0, { ...f.admission, goal: { ...f.goal, objective: "other objective" } }), /GOAL_OBJECTIVE_MISMATCH/);
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "check", 1, { goal: { ...f.goal, createdAt: 2 }, purpose: "work" }), /GOAL_CHANGED/);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "check", 1, { goal: { ...f.goal, status: "paused" }, purpose: "work" }));
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "admit", 1, f.admission), /ALREADY_ADMITTED/);
});

test("missing, FAIL, NOT_RUN and undeclared checks cannot complete a checkpoint", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const data = advanceData(f.goal);
  for (const evidence of [[], [{ ...data.evidence[0], outcome: "fail" }], [{ ...data.evidence[0], outcome: "not_run" }], [{ ...data.evidence[0], check_id: "other" }]]) {
    await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 1, { ...data, evidence }), /CHECKPOINT_CHECKS_INCOMPLETE|CHECK_ID_INVALID/);
  }
  const before = readFileSync(f.loaded.status_path, "utf8");
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 1, advanceData(f.goal, "verify")), /CHECKPOINT_MISMATCH/);
  assert.equal(readFileSync(f.loaded.status_path, "utf8"), before);
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, data);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 1, data), /STATUS_REVISION_CONFLICT/);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 2, data), /CHECKPOINT_MISMATCH/);
});

test("ordinary failed checks can be repaired in the same stage; evidence history is preserved", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const data = advanceData(f.goal, "inspect", false);
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, { ...data, evidence: [{ ...data.evidence[0], outcome: "fail", locator: "mock:failed-check" }] });
  await f.kernel.apply(TOKEN, f.jobId, "check", 2, { goal: f.goal, purpose: "work" });
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 2, { ...data, complete: true, evidence: [] }), /CHECKPOINT_CHECKS_INCOMPLETE/);
  await f.kernel.apply(TOKEN, f.jobId, "advance", 2, advanceData(f.goal));
  const value = (await f.kernel.inspect(f.receipt)).record as TaskStatus;
  assert.deepEqual(value.evidence_records.map(item => item.outcome), ["fail", "pass"]);
  assert(value.verification_records.includes("read-call-1"));
});

test("required decisions block work/advancement; clearing them requires a resolution record", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const data = { ...advanceData(f.goal, "inspect", false), evidence: [], verification_records: [] };
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, { ...data, pending_decisions: ["required-human-choice"] });
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "check", 2, { goal: f.goal, purpose: "work" }), /OUTSTANDING_WORK/);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 2, data), /RESOLUTION_EVIDENCE_REQUIRED/);
  await f.kernel.apply(TOKEN, f.jobId, "advance", 2, { ...data, verification_records: ["mock:actual-human-reply"] });
  const current = (await f.kernel.inspect(f.receipt)).record as TaskStatus;
  assert(current.verification_records.includes("mock:actual-human-reply"));
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "finish", 3, { goal: f.goal, result_sha256: "0".repeat(64), summary: "premature", next_action: "send", verification_records: [] }), /CHECKPOINTS_INCOMPLETE/);
});

test("two writers cannot silently overwrite the same revision", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const second = new HandoffKernel(f.artifacts);
  const data = advanceData(f.goal, "inspect", false);
  const results = await Promise.allSettled([f.kernel.apply(TOKEN, f.jobId, "advance", 1, data), second.apply(TOKEN, f.jobId, "advance", 1, data)]);
  assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(((await f.kernel.inspect(f.receipt)).record as TaskStatus).revision, 2);
  assert.equal(readdirSync(f.root).some(name => /\.lock$|\.tmp$/.test(name)), false);
});

test("atomic replace failure leaves the original status intact and cleans transient files", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const before = readFileSync(f.loaded.status_path, "utf8");
  const failing = new HandoffKernel(f.artifacts, { async rename() { throw new Error("forced atomic replace failure"); } });
  await assert.rejects(failing.apply(TOKEN, f.jobId, "advance", 1, advanceData(f.goal)), /forced/);
  assert.equal(readFileSync(f.loaded.status_path, "utf8"), before);
  assert.equal(readdirSync(f.root).some(name => /\.lock$|\.tmp$/.test(name)), false);
});

test("malformed/manual status, lost original verification and changed instruction are rejected", async () => {
  const f = await kernelFixture();
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission);
  const original = (await f.kernel.inspect(f.receipt)).record as TaskStatus;
  writeFileSync(f.loaded.status_path, "# status\nEverything complete.");
  assert.equal(((await f.kernel.inspect(f.receipt)).validation as any).status, "invalid");
  writeFileSync(f.loaded.status_path, renderStatus({ ...original, verification_records: [] }));
  assert.match(String((await f.kernel.inspect(f.receipt)).error), /VERIFICATION_RECORD_LOST/);
  writeFileSync(f.loaded.status_path, renderStatus(original));
  writeFileSync(f.file.path, readFileSync(f.file.path, "utf8") + "\nchanged");
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "check", 1, { goal: f.goal, purpose: "work" }), /INSTRUCTION_CHANGED/);
});

test("result stays unavailable before freeze; later mutation invalidates the delivery check", async () => {
  const f = await kernelFixture();
  await completeChecks(f);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "check", 3, { goal: f.goal, purpose: "delivery" }), /RESULT_NOT_FROZEN/);
  const result = "# Fixed fixture result\n";
  writeFileSync(f.loaded.result_path, result);
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "finish", 3, { goal: f.goal, result_sha256: "0".repeat(64), summary: "done", next_action: "verify return", verification_records: [] }), /RESULT_DIGEST_MISMATCH/);
  await f.kernel.apply(TOKEN, f.jobId, "finish", 3, { goal: f.goal, result_sha256: hash(result), summary: "done", next_action: "verify return", verification_records: [] });
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "advance", 4, advanceData(f.goal, "verify")), /RESULT_ALREADY_FROZEN/);
  writeFileSync(f.loaded.result_path, result + "changed");
  assert.match(String((await f.kernel.inspect(f.receipt)).error), /FROZEN_RESULT_CHANGED/);
});

test("a manual completed claim contradicting recorded FAIL cannot pass inspection", async () => {
  const f = await kernelFixture();
  await completeChecks(f);
  const current = (await f.kernel.inspect(f.receipt)).record as TaskStatus;
  current.evidence_records[0]!.outcome = "fail";
  writeFileSync(f.loaded.status_path, renderStatus(current));
  assert.match(String((await f.kernel.inspect(f.receipt)).error), /CHECKPOINT_CHECKS_INCOMPLETE/);
});

test("an unconfirmed creation cannot admit using a copied context or choose another task", async () => {
  const f = await kernelFixture();
  writeFileSync(f.receipt.path, JSON.stringify({ ...f.receipt.value, creation_status: "unknown", job_id: null }));
  await assert.rejects(f.kernel.apply(TOKEN, f.jobId, "admit", 0, f.admission), /TASK_BINDING_INVALID/);
});

test("CLI rejects missing/wrong receiving context and unknown action rather than choosing a fallback", async () => {
  const f = await kernelFixture();
  const input = JSON.stringify(f.admission);
  await assert.rejects(runKernel(["admit", f.root, TOKEN, "0"], input), /RECEIVING_CONTEXT_MISSING/);
  await assert.rejects(runKernel(["admit", f.root, TOKEN, "0"], input, "other-job"), /TASK_BINDING_INVALID/);
  await assert.rejects(runKernel(["retry", f.root, TOKEN, "0"], input, f.jobId), /Usage/);
  assert.equal((await runKernel(["admit", f.root, TOKEN, "0"], input, f.jobId)).written, true);
});

test("admission needs no access report; legacy profile mismatch is diagnostic only", async () => {
  const f = await kernelFixture();
  const { execution_context, execution_context_record, ...admission } = f.admission;
  await f.kernel.apply(TOKEN, f.jobId, "admit", 0, admission);
  assert.equal(((await f.kernel.inspect(f.receipt)).validation as any).status, "valid");
  await f.kernel.apply(TOKEN, f.jobId, "advance", 1, advanceData(f.goal));
  const legacy = await kernelFixture();
  const raw = readFileSync(legacy.file.path, "utf8").replace('"method_ref": "not applicable",', '"method_ref": "not applicable", "required_access_profile": "read-only", "access_instruction_locator": null,');
  // Use a new immutable fixture/receipt so the original digest binding remains real.
  const file = await legacy.artifacts.put({ filename: "legacy.instruction.md", content: raw.replaceAll(TOKEN, "b3f29391-ef2c-46ed-912f-1c24d981a4d4") });
  const { InstructionStore } = await import("../src/instruction.js");
  const loaded = await new InstructionStore(legacy.artifacts, [legacy.root]).load({ instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: "b3f29391-ef2c-46ed-912f-1c24d981a4d4" });
  const receipt = await legacy.receipts.reserve(loaded);
  await legacy.receipts.finish(receipt, { creation_status: "created", job_id: legacy.jobId, diagnostic: null });
  const goal = { ...legacy.goal, objective: loaded.goal };
  await legacy.kernel.apply(loaded.metadata.dispatch_token, legacy.jobId, "admit", 0, { ...legacy.admission, goal, execution_context: { ...legacy.admission.execution_context, sandbox_mode: "danger-full-access" } });
  const checked = await legacy.kernel.apply(loaded.metadata.dispatch_token, legacy.jobId, "check", 1, { goal, purpose: "work" });
  assert.equal(checked.checked, true);
});
