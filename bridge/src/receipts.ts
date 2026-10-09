import { randomUUID } from "node:crypto";
import { lstat, readdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ArtifactStore } from "./artifacts.js";
import { DISPATCH_TOKEN, readBoundedText, SHA256, parseUniqueJson, type LoadedInstruction } from "./instruction.js";

const receiptSchema = z.strictObject({
  schema: z.literal("codex-receipt/v1"),
  dispatch_token: z.string().regex(DISPATCH_TOKEN),
  creation_status: z.enum(["created", "not_created", "unknown"]),
  job_id: z.string().min(1).nullable(),
  instruction_file: z.string().min(1),
  instruction_sha256: z.string().regex(SHA256),
  task_identity: z.string().min(1),
  workspace: z.string().min(1),
  route: z.strictObject({ route_id: z.string(), computer: z.string(), bridge_namespace: z.string() }),
  origin: z.strictObject({
    verification: z.literal("unverified_at_bridge"),
    declared_conversation_id: z.string().nullable(),
    declared_title: z.string().nullable(),
    evidence_locator: z.string().nullable(),
  }),
  status_path: z.string().min(1),
  result_path: z.string().min(1),
  updated_at: z.string().datetime(),
  diagnostic: z.string().nullable(),
});
export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptRecord = { path: string; value: Receipt };
export class ReceiptConflictError extends Error {
  constructor(readonly existing: ReceiptRecord | null, message: string, readonly creation_status = existing?.value.creation_status ?? "not_created") { super(message); }
}
export type ReceiptOperations = { rename(source: string, destination: string): Promise<void> };

/** Same-Bridge correlation only, not a native parent binding or an authorization service. */
export class ReceiptStore {
  constructor(private readonly artifacts: ArtifactStore, private readonly operations: ReceiptOperations = { rename }) {}

  private filename(token: string): string {
    if (!DISPATCH_TOKEN.test(token)) throw new Error("Invalid dispatch token.");
    return `${token}.receipt.json`;
  }

  async get(token: string): Promise<ReceiptRecord | null> {
    const filePath = path.join(this.artifacts.configuredRoot, this.filename(token));
    let file;
    try { file = await readBoundedText(this.artifacts.configuredRoot, filePath, this.artifacts.maxBytes); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // A dangling entry is an unreadable prior record, not proof of absence.
        try { await lstat(filePath); }
        catch (missing) { if ((missing as NodeJS.ErrnoException).code === "ENOENT") return null; throw missing; }
      }
      throw error;
    }
    const value = receiptSchema.parse(parseUniqueJson(file.text));
    if (value.dispatch_token !== token || (value.creation_status === "created") !== (value.job_id !== null)) throw new Error("Receipt identity/outcome is inconsistent.");
    return { path: file.path, value };
  }

  async reserve(instruction: LoadedInstruction): Promise<ReceiptRecord> {
    const m = instruction.metadata;
    const value: Receipt = {
      schema: "codex-receipt/v1", dispatch_token: m.dispatch_token,
      creation_status: "unknown", job_id: null,
      instruction_file: instruction.path, instruction_sha256: instruction.sha256,
      task_identity: m.task_identity, workspace: instruction.workspace, route: m.route,
      origin: { verification: "unverified_at_bridge", declared_conversation_id: m.return.conversation_id, declared_title: m.return.title_hint, evidence_locator: m.return.origin_evidence_locator },
      status_path: instruction.status_path, result_path: instruction.result_path,
      updated_at: new Date().toISOString(),
      diagnostic: "Token reserved before native submission; no confirmed creation outcome. Do not automatically redispatch.",
    };
    try {
      const file = await this.artifacts.put({ filename: this.filename(m.dispatch_token), content: JSON.stringify(value, null, 2) + "\n" });
      return { path: file.path, value };
    } catch (error) {
      // Exclusive publication also rejects simultaneous submissions in another MCP session.
      let existing: ReceiptRecord | null;
      try { existing = await this.get(m.dispatch_token); }
      catch (readError) {
        throw new ReceiptConflictError(null, `Receipt is unreadable; prior creation outcome remains unknown. No new native request submitted. ${readError instanceof Error ? readError.message : String(readError)}`, "unknown");
      }
      if (existing) throw new ReceiptConflictError(existing, "Token already reserved or used; inspect the existing receipt, do not create another task.");
      throw new ReceiptConflictError(null, `Receipt could not be reserved; no native request submitted. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async finish(record: ReceiptRecord, update: Pick<Receipt, "creation_status" | "job_id" | "diagnostic">): Promise<ReceiptRecord> {
    const current = await this.get(record.value.dispatch_token);
    if (!current || current.path !== record.path || current.value.instruction_sha256 !== record.value.instruction_sha256) throw new Error("Receipt changed or became unreadable.");
    const value = receiptSchema.parse({ ...record.value, ...update, updated_at: new Date().toISOString() });
    const temporary = await this.artifacts.put({ filename: `receipt-${randomUUID()}.tmp`, content: JSON.stringify(value, null, 2) + "\n" });
    try { await this.operations.rename(temporary.path, current.path); }
    catch (error) {
      await unlink(temporary.path).catch(() => undefined);
      throw error;
    }
    return { path: current.path, value };
  }

  async findByJob(jobId: string): Promise<{ receipt: ReceiptRecord | null; lookup_errors: string[] }> {
    let names: string[];
    try { names = await readdir(this.artifacts.configuredRoot); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { receipt: null, lookup_errors: [] }; throw error; }
    const matches: ReceiptRecord[] = [];
    const lookup_errors: string[] = [];
    for (const name of names) {
      if (!name.endsWith(".receipt.json") || !DISPATCH_TOKEN.test(name.slice(0, -".receipt.json".length))) continue;
      try {
        const receipt = await this.get(name.slice(0, -".receipt.json".length));
        if (receipt?.value.job_id === jobId) matches.push(receipt);
      } catch { lookup_errors.push(`Unreadable receipt: ${name}`); }
    }
    if (matches.length > 1) throw new Error("Multiple receipts claim this Job; correlation is ambiguous.");
    return { receipt: matches[0] ?? null, lookup_errors };
  }
}
