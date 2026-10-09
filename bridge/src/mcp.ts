import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ArtifactStore, MAX_ARTIFACT_BYTES } from "./artifacts.js";
import { DispatchError, type DispatchBackend } from "./desktop.js";
import { DISPATCH_TOKEN, SHA256, InstructionStore, readBoundedText, type LoadedInstruction } from "./instruction.js";
import { ReceiptConflictError, ReceiptStore, type ReceiptRecord } from "./receipts.js";

function success(value: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value };
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function failure(error: unknown) { return { isError: true, ...success({ status: "failed", error: message(error) }) }; }

export function createMcpServer(manager: DispatchBackend, artifacts: ArtifactStore, options: { workspaceRoots?: string[]; receipts?: ReceiptStore } = {}): McpServer {
  const server = new McpServer({ name: "Codex Agent", version: "0.3.1" });
  const instructions = new InstructionStore(artifacts, options.workspaceRoots);
  const receipts = options.receipts ?? new ReceiptStore(artifacts);

  server.registerTool("artifact_put", {
    title: "Store local text artifact",
    description: "Create one bounded UTF-8 text file, including the single execution instruction for every dispatch. Never invokes Codex, shell, Git, or approvals. Existing files are not overwritten.",
    inputSchema: {
      filename: z.string().min(1).max(128).describe("Portable flat filename only; paths and directories are rejected."),
      content: z.string().describe(`UTF-8 text content, at most ${MAX_ARTIFACT_BYTES} encoded bytes.`),
      expected_sha256: z.string().regex(SHA256).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ filename, content, expected_sha256 }) => {
    try { return success(await artifacts.put({ filename, content, expected_sha256 })); }
    catch (error) { return failure(error); }
  });

  server.registerTool("codex_start", {
    title: "Dispatch single instruction file to Codex",
    description: "Dispatch from ONE complete codex-instruction/v1 Markdown file in this Bridge's handoff root. Validate exact SHA256, UUID v4 token, metadata, allowed workspace and Goal length before native creation. No separately authored prompt or short-text fallback. Bridge mechanically derives the startup Goal and file-reading instructions; receiving Codex must actually activate the Goal and verify actual permissions and the complete file. Preserve return authorization evidence in that file; metadata does not grant human permission. A same-token receipt correlates the actual job_id; duplicate/unknown tokens never automatically redispatch. creation_status is created, not_created or unknown. A confirmed Job remains created even if receipt saving/navigation fails. A successful dispatch completes the normal Bridge action. Do not poll codex_get automatically or proactively; use codex_get only when the user explicitly asks. No private Codex execution process, callback or wake mechanism.",
    inputSchema: z.strictObject({
      instruction_file: z.string().min(1).describe("Actual absolute path returned by this Bridge's artifact_put, within its handoff root."),
      expected_sha256: z.string().regex(SHA256),
      dispatch_token: z.string().regex(DISPATCH_TOKEN),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async input => {
    let instruction: LoadedInstruction;
    try { instruction = await instructions.load(input, process.env.CODEX_THREAD_ID); }
    catch (error) { return { isError: true, ...success({ status: "failed", creation_status: "not_created", error_code: "DISPATCH_INSTRUCTION_INVALID", error: message(error) }) }; }
    let reserved: ReceiptRecord;
    try { reserved = await receipts.reserve(instruction); }
    catch (error) {
      const existing = error instanceof ReceiptConflictError ? error.existing : null;
      return { isError: true, ...success({
        status: "failed", error_code: "DISPATCH_RECEIPT_CONFLICT", error: message(error),
        creation_status: existing?.value.creation_status ?? "not_created",
        ...(existing ? { job_id: existing.value.job_id, receipt: existing, dispatch_token: input.dispatch_token } : {}),
        attempt_submitted: false,
      }) };
    }
    let result;
    try { result = await manager.start(instruction.workspace, instruction.prompt); }
    catch (error) {
      const classified = error instanceof DispatchError ? error : new DispatchError("unknown", message(error));
      let receipt_error: string | undefined;
      try { reserved = await receipts.finish(reserved, { creation_status: classified.creation_status, job_id: null, diagnostic: classified.message }); }
      catch (saveError) { receipt_error = message(saveError); }
      return { isError: true, ...success({
        status: classified.creation_status === "unknown" ? "unknown" : "failed",
        creation_status: classified.creation_status, error_code: classified.error_code, error: classified.message,
        dispatch_token: input.dispatch_token, receipt_path: reserved.path, ...(receipt_error ? { receipt_error } : {}),
      }) };
    }
    // Once native creation is confirmed, local persistence cannot turn it into not_created.
    let receipt_error: string | undefined;
    try { reserved = await receipts.finish(reserved, { creation_status: "created", job_id: result.job_id, diagnostic: result.warning ?? null }); }
    catch (error) { receipt_error = message(error); }
    return success({
      creation_status: "created", job_id: result.job_id, dispatch_token: input.dispatch_token,
      instruction_file: instruction.path, instruction_sha256: instruction.sha256, receipt_path: reserved.path,
      receipt_saved: receipt_error === undefined,
      ...(result.warning ? { warning: result.warning } : {}), ...(receipt_error ? { receipt_error } : {}),
    });
  });

  async function reportFile(receipt: ReceiptRecord, kind: "status" | "result") {
    const registered = receipt.value[`${kind}_path`];
    const expected = path.join(path.dirname(receipt.value.instruction_file), `${receipt.value.dispatch_token}.${kind}.md`);
    if (path.resolve(registered) !== path.resolve(expected)) return { path: registered, read_status: "refused", error: "Receipt report path does not match this instruction/token." };
    try {
      const file = await readBoundedText(artifacts.configuredRoot, registered, artifacts.maxBytes);
      return { present: true, read_status: "complete", source: "receiver_file_report", ...file };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { present: false, path: registered };
      return { path: registered, read_status: "refused", error: message(error) };
    }
  }

  server.registerTool("codex_get", {
    title: "Query Codex task when requested",
    description: "Read a single status/result snapshot only when the user explicitly asks for a query or diagnosis. Never use as an automatic start/get polling loop. Supply exactly ONE job_id or dispatch_token. Token uses the receipt in this same Bridge, never searches another machine. Native thread/last-turn status and timestamped receiver reports are distinct; a completed turn or result file does not prove whole Goal completion. Goal state is unknown when no supported native Job Goal interface exists.",
    inputSchema: z.strictObject({
      job_id: z.string().min(1).optional(),
      dispatch_token: z.string().regex(DISPATCH_TOKEN).optional(),
      detail: z.enum(["compact", "standard", "debug"]).optional().default("standard"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ job_id, dispatch_token, detail }) => {
    if ((job_id === undefined) === (dispatch_token === undefined)) return failure("Supply exactly one of job_id or dispatch_token.");
    try {
      let receipt: ReceiptRecord | null;
      let lookup_errors: string[] = [];
      if (dispatch_token !== undefined) {
        receipt = await receipts.get(dispatch_token);
        if (!receipt) return failure("No receipt for this token in the selected Bridge; do not probe another Bridge.");
        job_id = receipt.value.job_id ?? undefined;
      } else {
        const found = await receipts.findByJob(job_id!);
        receipt = found.receipt;
        lookup_errors = found.lookup_errors;
      }
      let native: Record<string, unknown> = { job_id: job_id ?? null, thread_status: "unknown", last_turn_status: "unknown", goal_status: "unknown", observed_at: new Date().toISOString() };
      let native_error: string | undefined;
      if (job_id) {
        try { native = await manager.get(job_id, { detail }); }
        catch (error) { native_error = message(error); }
      }
      const value = {
        ...native, job_id: job_id ?? null,
        dispatch_token: receipt?.value.dispatch_token ?? dispatch_token ?? null,
        receipt,
        correlation_status: receipt ? "recorded_at_selected_bridge" : "unavailable",
        goal_status: "unknown",
        goal_status_source: "not_available_in_native_snapshot",
        ...(lookup_errors.length ? { lookup_errors } : {}),
        ...(native_error ? { native_error } : {}),
        ...(receipt ? {
          receiver_status: await reportFile(receipt, "status"),
          result: await reportFile(receipt, "result"),
        } : {}),
      };
      return { ...(native_error ? { isError: true } : {}), ...success(value) };
    } catch (error) { return failure(error); }
  });
  return server;
}
