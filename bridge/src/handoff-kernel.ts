import { createHash, randomUUID } from "node:crypto";
import { lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ArtifactStore } from "./artifacts.js";
import { DISPATCH_TOKEN, parseInstruction, parseUniqueJson, readBoundedText, SHA256, type InstructionMetadata, type TextFile } from "./instruction.js";
import { ReceiptStore, type ReceiptRecord } from "./receipts.js";
import { resolveWorkspacePath } from "./workspaces.js";

const text = z.string().min(1).refine(value => value.trim().length > 0, "Blank values are not evidence or progress.");
const references = z.array(text);
const checkEvidence = z.strictObject({ check_id: text, locator: text, outcome: z.enum(["pass", "fail", "not_run"]) });
const statusSchema = z.strictObject({
  schema: z.literal("codex-status/v1"),
  dispatch_token: z.string().regex(DISPATCH_TOKEN),
  job_id: text,
  instruction_sha256: z.string().regex(SHA256),
  goal_sha256: z.string().regex(SHA256),
  revision: z.number().int().min(1),
  updated_at: z.string().datetime(),
  admission: z.strictObject({
    source: z.literal("receiver_report"),
    goal_created_at: z.number().nonnegative(),
    execution_context: z.strictObject({ sandbox_mode: z.enum(["danger-full-access", "workspace-write", "read-only"]), approval_policy: text, network_access: z.boolean() }),
    goal_activation_record: text,
    execution_context_record: text,
    instruction_read_record: text,
  }),
  completed: z.array(z.strictObject({ id: text, evidence: z.array(checkEvidence).min(1) })),
  evidence_records: z.array(checkEvidence.extend({ checkpoint_id: text, recorded_at: z.string().datetime() })),
  current_checkpoint: text.nullable(),
  summary: text,
  next_action: text,
  blockers: references,
  pending_decisions: references,
  verification_records: references,
  frozen_result: z.strictObject({ path: text, sha256: z.string().regex(SHA256) }).nullable(),
});
export type TaskStatus = z.infer<typeof statusSchema>;
export type KernelAction = "admit" | "advance" | "finish" | "check";
const goalSnapshot = z.object({ threadId: text, objective: text, status: z.literal("active"), createdAt: z.number().nonnegative() });
const admitSchema = z.strictObject({
  goal: goalSnapshot, goal_activation_record: text,
  execution_context_record: text, instruction_read_record: text, summary: text, next_action: text,
  execution_context: z.strictObject({ sandbox_mode: z.enum(["danger-full-access", "workspace-write", "read-only"]), approval_policy: text, network_access: z.boolean() }),
});
const advanceSchema = z.strictObject({
  goal: goalSnapshot, checkpoint_id: text, complete: z.boolean(),
  summary: text, next_action: text, blockers: references, pending_decisions: references,
  evidence: z.array(checkEvidence), verification_records: references,
});
const finishSchema = z.strictObject({ goal: goalSnapshot, result_sha256: z.string().regex(SHA256), summary: text, next_action: text, verification_records: references });
const checkSchema = z.strictObject({ goal: goalSnapshot, purpose: z.enum(["work", "delivery"]) });
type Binding = { receipt: ReceiptRecord; metadata: InstructionMetadata };
type StatusRead = { file: TextFile; value: TaskStatus; frozenFile?: TextFile };
export type KernelOperations = { rename(source: string, destination: string): Promise<void> };

export function renderStatus(value: TaskStatus): string {
  return "# Codex status\n\n```json\n" + JSON.stringify(value, null, 2) + "\n```\n";
}
function parseStatus(content: string): TaskStatus {
  const normalized = content.replaceAll("\r\n", "\n");
  const match = /^# Codex status\n\n```json\n([\s\S]+)\n```\n$/.exec(normalized);
  if (!match) throw new Error("STATUS_FORMAT_INVALID: use the installed kernel, not free-form status text.");
  return statusSchema.parse(parseUniqueJson(match[1]!));
}
async function exists(file: string): Promise<boolean> {
  try { await lstat(file); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

/** One local entry for admission, declared checkpoint progression and result integrity.
 * It does not authenticate native Goal events, human authorization or semantic evidence.
 */
export class HandoffKernel {
  private readonly receipts: ReceiptStore;
  constructor(private readonly artifacts: ArtifactStore, private readonly operations: KernelOperations = { rename }) {
    this.receipts = new ReceiptStore(artifacts);
  }
  private async binding(token: string, jobId: string): Promise<Binding> {
    const receipt = await this.receipts.get(token);
    if (!receipt || receipt.value.creation_status !== "created" || receipt.value.job_id !== jobId) throw new Error("TASK_BINDING_INVALID: a confirmed receipt for THIS receiving task is required; do not copy caller context or redispatch.");
    const r = receipt.value;
    const file = await readBoundedText(this.artifacts.configuredRoot, r.instruction_file, this.artifacts.maxBytes);
    if (file.sha256 !== r.instruction_sha256) throw new Error("INSTRUCTION_CHANGED: repair the actual input conflict; do not use another file.");
    const metadata = parseInstruction(file.text);
    if (metadata.dispatch_token !== token || metadata.task_identity !== r.task_identity || await resolveWorkspacePath(metadata.workspace) !== r.workspace) throw new Error("INSTRUCTION_BINDING_INVALID");
    const parent = path.dirname(file.path);
    if (path.resolve(r.status_path) !== path.join(parent, token + ".status.md") ||
        path.resolve(r.result_path) !== path.join(parent, token + ".result.md")) throw new Error("REPORT_PATH_INVALID");
    return { receipt, metadata };
  }
  private async current(binding: Binding): Promise<StatusRead | null> {
    const r = binding.receipt.value;
    let file: TextFile;
    try { file = await readBoundedText(this.artifacts.configuredRoot, r.status_path, this.artifacts.maxBytes); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && !await exists(r.status_path)) return null;
      throw error;
    }
    const value = parseStatus(file.text);
    if (value.dispatch_token !== r.dispatch_token || value.job_id !== r.job_id ||
        value.instruction_sha256 !== r.instruction_sha256 || value.goal_sha256 !== r.goal_sha256) throw new Error("STATUS_BINDING_INVALID");
    const checkpoints = binding.metadata.checkpoints;
    if (value.completed.length > checkpoints.length ||
        value.completed.some((item, index) => item.id !== checkpoints[index]!.id) ||
        value.current_checkpoint !== (checkpoints[value.completed.length]?.id ?? null)) throw new Error("CHECKPOINT_ORDER_INVALID");
    if (value.admission.execution_context.sandbox_mode !== binding.metadata.required_access_profile) throw new Error("ACCESS_PROFILE_MISMATCH");
    if (value.evidence_records.some(record => {
      const checkpoint = checkpoints.find(item => item.id === record.checkpoint_id);
      return !checkpoint || !checkpoint.required_checks.includes(record.check_id);
    })) throw new Error("EVIDENCE_CHECK_ID_INVALID");
    for (const completed of value.completed) {
      const checkpoint = checkpoints.find(item => item.id === completed.id)!;
      const latest = new Map(value.evidence_records.filter(item => item.checkpoint_id === completed.id).map(item => [item.check_id, item]));
      if (completed.evidence.some(item => item.outcome !== "pass" || !checkpoint.required_checks.includes(item.check_id)) ||
          new Set(completed.evidence.map(item => item.check_id)).size !== completed.evidence.length ||
          checkpoint.required_checks.some(id => !completed.evidence.some(item => item.check_id === id && item.outcome === "pass" && latest.get(id)?.outcome === "pass" && latest.get(id)?.locator === item.locator))) throw new Error("CHECKPOINT_CHECKS_INCOMPLETE");
    }
    const prior = binding.metadata.return.authorization_evidence.prior_verification;
    if ([prior.record_locator, prior.source_read_tool_call_id].some(item => item !== null && !value.verification_records.includes(item))) throw new Error("VERIFICATION_RECORD_LOST");
    let frozenFile: TextFile | undefined;
    if (value.frozen_result) {
      this.requireNoOutstanding(value);
      if (value.current_checkpoint !== null || value.frozen_result.path !== r.result_path) throw new Error("RESULT_NOT_READY");
      const result = await readBoundedText(this.artifacts.configuredRoot, r.result_path, this.artifacts.maxBytes);
      if (result.sha256 !== value.frozen_result.sha256) throw new Error("FROZEN_RESULT_CHANGED");
      frozenFile = result;
    }
    return { file, value, frozenFile };
  }
  private requireNoOutstanding(value: TaskStatus): void {
    if (value.blockers.length || value.pending_decisions.length) throw new Error("OUTSTANDING_WORK: blockers/required decisions prevent advancement or delivery.");
  }
  private requireGoal(value: TaskStatus, goal: z.infer<typeof goalSnapshot>): void {
    if (value.job_id !== goal.threadId || value.admission.goal_created_at !== goal.createdAt || createHash("sha256").update(goal.objective, "utf8").digest("hex") !== value.goal_sha256) throw new Error("GOAL_CHANGED: preserve the same Goal; resolve the conflict rather than overwriting it.");
  }
  async inspect(receipt: ReceiptRecord): Promise<Record<string, unknown>> {
    try {
      const binding = await this.binding(receipt.value.dispatch_token, receipt.value.job_id ?? "");
      const current = await this.current(binding);
      if (!current) return { path: receipt.value.status_path, present: false, validation: { status: "missing", source: "kernel_structure" } };
      return {
        ...current.file, present: true, read_status: "complete", source: "receiver_file_report",
        validation: { status: "valid", source: "kernel_structure", evidence_authenticity: "not_verified_by_kernel" },
        record: current.value,
        ...(current.frozenFile ? { frozen_result_file: { ...current.frozenFile, present: true, read_status: "complete", source: "receiver_file_report" } } : {}),
      };
    } catch (error) {
      return { path: receipt.value.status_path, read_status: "refused", validation: { status: "invalid", source: "kernel_structure" }, error: error instanceof Error ? error.message : String(error) };
    }
  }
  async apply(token: string, jobId: string, action: KernelAction, expectedRevision: number, payload: unknown): Promise<Record<string, unknown>> {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("EXPECTED_REVISION_INVALID");
    const binding = await this.binding(token, jobId);
    const r = binding.receipt.value;
    const lockPath = r.status_path + ".lock";
    let lock;
    try { lock = await open(lockPath, "wx", 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("STATUS_BUSY: another same-task operation holds the lock; do not bypass or remove an active lock.");
      throw new Error(`STATUS_LOCK_FAILED: ${error instanceof Error ? error.message : String(error)}; do not change permissions or choose another path.`);
    }
    let temporary: string | undefined;
    try {
      const previous = await this.current(binding);
      if ((previous?.value.revision ?? 0) !== expectedRevision) throw new Error("STATUS_REVISION_CONFLICT: read the actual record before further action.");
      if (action === "check") {
        const data = checkSchema.parse(payload);
        if (!previous) throw new Error("ADMISSION_MISSING");
        this.requireGoal(previous.value, data.goal);
        this.requireNoOutstanding(previous.value);
        if (data.purpose === "work" && (previous.value.current_checkpoint === null || previous.value.frozen_result)) throw new Error("NO_CURRENT_CHECKPOINT");
        if (data.purpose === "delivery" && !previous.value.frozen_result) throw new Error("RESULT_NOT_FROZEN");
        return {
          checked: true, purpose: data.purpose, revision: previous.value.revision,
          current_checkpoint: previous.value.current_checkpoint, frozen_result: previous.value.frozen_result,
          verification_records: previous.value.verification_records,
          ...(data.purpose === "delivery" ? { return_instructions: binding.metadata.return } : { checkpoint: binding.metadata.checkpoints[previous.value.completed.length] }),
          evidence_authenticity: "not_verified_by_kernel", native_authorization: "not_verified_by_kernel",
        };
      }
      let value: TaskStatus;
      if (action === "admit") {
        if (previous) throw new Error("ALREADY_ADMITTED: do not reset the same task.");
        const data = admitSchema.parse(payload);
        if (data.goal.threadId !== jobId || createHash("sha256").update(data.goal.objective, "utf8").digest("hex") !== r.goal_sha256) throw new Error("GOAL_OBJECTIVE_MISMATCH");
        if (data.execution_context.sandbox_mode !== binding.metadata.required_access_profile) throw new Error("ACCESS_PROFILE_MISMATCH: use the actual human-selected profile; never elevate it here.");
        const prior = binding.metadata.return.authorization_evidence.prior_verification;
        value = {
          schema: "codex-status/v1", dispatch_token: token, job_id: jobId, instruction_sha256: r.instruction_sha256,
          goal_sha256: r.goal_sha256, revision: 1, updated_at: new Date().toISOString(),
          admission: { source: "receiver_report", goal_created_at: data.goal.createdAt, execution_context: data.execution_context, goal_activation_record: data.goal_activation_record, execution_context_record: data.execution_context_record, instruction_read_record: data.instruction_read_record },
          completed: [], current_checkpoint: binding.metadata.checkpoints[0]!.id, summary: data.summary, next_action: data.next_action,
          blockers: [], pending_decisions: [], evidence_records: [], verification_records: [prior.record_locator, prior.source_read_tool_call_id].filter((item): item is string => item !== null), frozen_result: null,
        };
      } else {
        if (!previous) throw new Error("ADMISSION_MISSING");
        if (previous.value.frozen_result) throw new Error("RESULT_ALREADY_FROZEN: no further phase updates or re-finalization.");
        value = structuredClone(previous.value);
        value.revision++;
        value.updated_at = new Date().toISOString();
        if (action === "advance") {
          const data = advanceSchema.parse(payload);
          this.requireGoal(value, data.goal);
          if (value.current_checkpoint === null || data.checkpoint_id !== value.current_checkpoint) throw new Error("CHECKPOINT_MISMATCH: cannot skip or repeat a declared stage.");
          if ((value.blockers.length || value.pending_decisions.length) && !(data.blockers.length || data.pending_decisions.length) && !data.evidence.some(item => item.outcome === "pass") && !data.verification_records.length) throw new Error("RESOLUTION_EVIDENCE_REQUIRED");
          const checkpoint = binding.metadata.checkpoints[value.completed.length]!;
          if (data.evidence.some(item => !checkpoint.required_checks.includes(item.check_id)) || new Set(data.evidence.map(item => item.check_id)).size !== data.evidence.length) throw new Error("CHECK_ID_INVALID");
          value.evidence_records.push(...data.evidence.map(item => ({ ...item, checkpoint_id: data.checkpoint_id, recorded_at: value.updated_at })));
          Object.assign(value, { summary: data.summary, next_action: data.next_action, blockers: data.blockers, pending_decisions: data.pending_decisions });
          value.verification_records = [...new Set([...value.verification_records, ...data.verification_records])];
          if (data.complete) {
            this.requireNoOutstanding(value);
            const latest = new Map(value.evidence_records.filter(item => item.checkpoint_id === data.checkpoint_id).map(item => [item.check_id, item]));
            const passed = checkpoint.required_checks.map(id => latest.get(id));
            if (passed.some(item => !item || item.outcome !== "pass")) throw new Error("CHECKPOINT_CHECKS_INCOMPLETE: every declared check requires a reported PASS, not FAIL/NOT_RUN.");
            value.completed.push({ id: data.checkpoint_id, evidence: passed.map(item => ({ check_id: item!.check_id, locator: item!.locator, outcome: item!.outcome })) });
            value.current_checkpoint = binding.metadata.checkpoints[value.completed.length]?.id ?? null;
          }
        } else if (action === "finish") {
          const data = finishSchema.parse(payload);
          this.requireGoal(value, data.goal);
          this.requireNoOutstanding(value);
          if (value.current_checkpoint !== null) throw new Error("CHECKPOINTS_INCOMPLETE");
          const result = await readBoundedText(this.artifacts.configuredRoot, r.result_path, this.artifacts.maxBytes);
          if (!result.text.trim() || result.sha256 !== data.result_sha256.toLowerCase()) throw new Error("RESULT_DIGEST_MISMATCH");
          value.summary = data.summary;
          value.next_action = data.next_action;
          value.verification_records = [...new Set([...value.verification_records, ...data.verification_records])];
          value.frozen_result = { path: result.path, sha256: result.sha256 };
        } else throw new Error("KERNEL_ACTION_INVALID");
      }
      statusSchema.parse(value);
      const staged = await this.artifacts.put({ filename: `kernel-status-${randomUUID()}.tmp`, content: renderStatus(value) });
      temporary = staged.path;
      const unchanged = await this.current(binding);
      if ((unchanged?.file.sha256 ?? null) !== (previous?.file.sha256 ?? null)) throw new Error("STATUS_CHANGED_DURING_WRITE");
      await this.operations.rename(staged.path, r.status_path);
      temporary = undefined;
      const verified = await this.current(binding);
      if (!verified || verified.value.revision !== value.revision) throw new Error("STATUS_WRITE_UNCONFIRMED: inspect the actual revision before continuing.");
      return { written: true, path: r.status_path, revision: value.revision, current_checkpoint: value.current_checkpoint, frozen_result: value.frozen_result };
    } finally {
      if (temporary) await unlink(temporary).catch(() => undefined);
      await lock.close();
      try { await unlink(lockPath); }
      catch { throw new Error("STATUS_LOCK_CLEANUP_FAILED: a write may have committed; inspect the actual revision, do not blindly repeat."); }
    }
  }
}
