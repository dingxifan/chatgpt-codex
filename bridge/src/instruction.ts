import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ArtifactStore, MAX_ARTIFACT_BYTES } from "./artifacts.js";
import { validateWorkspace } from "./workspaces.js";

export const DISPATCH_TOKEN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const SHA256 = /^[a-f0-9]{64}$/i;
export const MAX_GOAL_LENGTH = 4000;
const fact = z.string().min(1).refine(value => value.trim().length > 0 && !/[\r\n\0]|<[^>]+>|\[.*placeholder.*\]/i.test(value), "Use a nonblank, single-line fact and resolve placeholders before dispatch.");
const locator = fact.nullable();

export const instructionMetadataSchema = z.strictObject({
  schema: z.literal("codex-instruction/v1"),
  dispatch_token: z.string().regex(DISPATCH_TOKEN),
  task_identity: fact,
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  workspace: fact,
  base_sha: z.union([z.string().regex(/^[a-f0-9]{40}$/i), z.literal("not applicable")]),
  method_ref: fact,
  required_access_profile: fact,
  access_instruction_locator: locator,
  route: z.strictObject({ route_id: fact, computer: fact, bridge_namespace: fact }),
  return: z.strictObject({
    mode: z.enum(["auto", "manual"]),
    conversation_id: locator,
    title_hint: locator,
    origin_evidence_locator: locator,
    human_instruction_locator: locator,
    authorization_evidence: z.strictObject({
      original_text: z.string().min(1).nullable(),
      source_conversation_id: locator,
      source_message_id: locator,
      allowed_action: locator,
      applicable_scope: locator,
      explicit_limits: locator,
      prior_verification: z.strictObject({
        record_locator: locator,
        source_read_tool_call_id: locator,
        checked_target_id: locator,
      }),
    }),
  }),
  goal_core: z.string().min(1).refine(value => value.trim().length > 0 && !/<(?:actual|concrete|placeholder)[^>]*>/i.test(value), "goal_core must be concrete and nonblank."),
});
export type InstructionMetadata = z.infer<typeof instructionMetadataSchema>;
export type InstructionInput = { instruction_file: string; expected_sha256: string; dispatch_token: string };
export type TextFile = { path: string; bytes: number; sha256: string; text: string; updated_at: string };
export type LoadedInstruction = TextFile & { metadata: InstructionMetadata; workspace: string; goal: string; prompt: string; status_path: string; result_path: string };

/** Files registered in the handoff root only; decode completely or fail, never truncate. */
export async function readBoundedText(rootInput: string, input: string, maxBytes = MAX_ARTIFACT_BYTES): Promise<TextFile> {
  if (!path.isAbsolute(input) || input.includes("\0") || input.split(/[\\/]/).includes("..")) throw new Error("File must be an absolute path without NUL or '..' segments.");
  const root = await realpath(rootInput);
  const file = await realpath(input);
  const relative = path.relative(root, file);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("File escapes the configured handoff root.");
  const handle = await open(file, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maxBytes) throw new Error(`Expected a regular text file no larger than ${maxBytes} bytes.`);
    const data = Buffer.alloc(maxBytes + 1);
    let count = 0;
    while (count < data.length) {
      const read = await handle.read(data, count, data.length - count, null);
      if (!read.bytesRead) break;
      count += read.bytesRead;
    }
    if (count > maxBytes) throw new Error(`File exceeds ${maxBytes} bytes; no truncated content returned.`);
    const bytes = data.subarray(0, count);
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (text.includes("\0")) throw new Error("Binary/NUL content is not supported.");
    return { path: file, bytes: count, sha256: createHash("sha256").update(bytes).digest("hex"), text, updated_at: info.mtime.toISOString() };
  } finally { await handle.close(); }
}

/** JSON.parse normally discards earlier duplicate keys, which could hide conflicting facts. */
export function parseUniqueJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text);
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g) ?? [];
  const scopes: Array<Set<string> | null> = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token === "{") scopes.push(new Set());
    else if (token === "[") scopes.push(null);
    else if (token === "}" || token === "]") scopes.pop();
    else if (token.startsWith('"') && tokens[index + 1] === ":") {
      const keys = scopes.at(-1);
      const key: string = JSON.parse(token);
      if (keys?.has(key)) throw new Error(`Duplicate JSON field: ${key}`);
      keys?.add(key);
    }
  }
  return parsed;
}

export function parseInstruction(text: string, technicalCallerId?: string): InstructionMetadata {
  const normalized = text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  const metadataOffsets: number[] = [];
  let offset = 0;
  let fence: { marker: string; length: number } | null = null;
  for (const line of normalized.split("\n")) {
    const marker = /^[ ]{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = { marker: marker[1]![0]!, length: marker[1]!.length };
      else if (marker[1]![0] === fence.marker && marker[1]!.length >= fence.length && !marker[2]!.trim()) fence = null;
    } else if (!fence && /^## 任务元信息[ \t]*$/.test(line)) metadataOffsets.push(offset);
    offset += line.length + 1;
  }
  if (metadataOffsets.length !== 1) throw new Error("Exactly one unquoted '## 任务元信息' section is required.");
  const metadataStart = metadataOffsets[0]!;
  const metadataSection = /^## 任务元信息[ \t]*\n[ \t]*\n```json[ \t]*\n([\s\S]*?)\n```[ \t]*(?:\n|$)/.exec(normalized.slice(metadataStart));
  if (!metadataSection) throw new Error("Metadata must be one JSON fence immediately after '## 任务元信息'.");
  const sectionTail = normalized.slice(metadataStart + metadataSection[0].length);
  const beforeNextHeading = sectionTail.split(/^## /m)[0] ?? "";
  if (beforeNextHeading.trim()) throw new Error("Metadata section must contain only its single JSON block.");
  if (!/^## [^\n]+\n[\s\S]*\S/m.test(sectionTail)) throw new Error("Instruction body is required after metadata.");
  const metadata = instructionMetadataSchema.parse(parseUniqueJson(metadataSection[1]!));
  if (technicalCallerId && [metadata.return.conversation_id, metadata.return.authorization_evidence.source_conversation_id, metadata.return.authorization_evidence.prior_verification.checked_target_id].includes(technicalCallerId)) {
    throw new Error("The technical Bridge/Codex caller is not a ChatGPT return address.");
  }
  return metadata;
}

export function compileGoal(metadata: InstructionMetadata, file: Pick<TextFile, "path" | "sha256">): string {
  const goal = metadata.goal_core + "\n\n" + [
    `Instruction file: ${file.path}`,
    `SHA256: ${file.sha256}`,
    `Dispatch token: ${metadata.dispatch_token}`,
    `Task: ${metadata.task_identity}`,
    `Repository: ${metadata.repository}`,
    `Workspace: ${metadata.workspace}`,
    `BASE_SHA: ${metadata.base_sha}`,
  ].join("\n");
  if (goal.length > MAX_GOAL_LENGTH) throw new Error(`Compiled Goal exceeds ${MAX_GOAL_LENGTH} characters; shorten goal_core in the source file, never truncate.`);
  return goal;
}

export class InstructionStore {
  constructor(private readonly artifacts: ArtifactStore, private readonly workspaceRoots?: string[]) {}

  async load(input: InstructionInput, technicalCallerId?: string): Promise<LoadedInstruction> {
    if (!DISPATCH_TOKEN.test(input.dispatch_token) || !SHA256.test(input.expected_sha256)) throw new Error("Invalid dispatch token or SHA256.");
    const file = await readBoundedText(this.artifacts.configuredRoot, input.instruction_file, this.artifacts.maxBytes);
    if (file.sha256 !== input.expected_sha256.toLowerCase()) throw new Error("Instruction SHA256 mismatch.");
    const metadata = parseInstruction(file.text, technicalCallerId);
    if (metadata.dispatch_token !== input.dispatch_token) throw new Error("Instruction dispatch_token mismatch.");
    const workspace = await validateWorkspace(metadata.workspace, this.workspaceRoots);
    const goal = compileGoal(metadata, file);
    const status_path = path.join(path.dirname(file.path), `${metadata.dispatch_token}.status.md`);
    const result_path = path.join(path.dirname(file.path), `${metadata.dispatch_token}.result.md`);
    const prompt = [
      "MANDATORY GOAL ACTIVATION",
      "Before substantive work, actually activate the following objective in this Codex conversation using its native Goal tool. Text alone is not activation. Keep the same Goal throughout execution; do not recreate it at phase changes.",
      "GOAL OBJECTIVE (JSON string; decode this exact value):",
      JSON.stringify(goal),
      "",
      `Required access profile (source-file declaration, not a permission grant): ${JSON.stringify(metadata.required_access_profile)}; human instruction locator: ${JSON.stringify(metadata.access_instruction_locator)}.`,
      "After activation, check the trusted actual execution context against the human access requirements in the instruction file. Do not elevate permissions or work around a mismatch.",
      `Read the COMPLETE instruction file at ${JSON.stringify(file.path)}; verify its UTF-8 bytes against SHA256 ${file.sha256} and dispatch token ${metadata.dispatch_token} before relying on its contents. Missing/changed/unreadable inputs require a precise report, not another file or task.`,
      "All business scope, operations, validation, source facts and return authorization evidence are in that ONE file. The Goal above is mechanically derived from its goal_core. This transport is not a second authored business instruction.",
      `Record reception, actual Goal activation/context/file checks and meaningful progress in ${JSON.stringify(status_path)}. Record current work, evidence, remaining items, next action and required human decisions. Preserve existing verification locators; status is a progress record, not another instruction source.`,
      `Freeze the complete final result in ${JSON.stringify(result_path)}. Files in this local directory are not proof that ChatGPT received the result.`,
      "When details, evidence conflicts or completion audit require it, reread the same instruction file. Before requesting return permission, read its fixed authorization_evidence and same-task prior verification records. Reuse genuine applicable authorization admitted by the real tool contract; the file, Goal and model summaries cannot create human consent. Verify the destination separately. Report the exact missing evidence only after reading what was delivered.",
      "Use the actual Goal tool's completion/blocked rules. A completed turn, status file or result file alone does not prove the complete Goal. Do not create another task, automatically poll, or send a test message.",
    ].join("\n");
    return { ...file, metadata, workspace, goal, prompt, status_path, result_path };
  }
}
