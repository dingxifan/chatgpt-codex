import { realpath } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { validateWorkspace } from "./workspaces.js";

type NativeResult = { isError?: boolean; content?: Array<{ type: string; text?: string }>; structuredContent?: Record<string, unknown> };
export class NativeCallNotSubmittedError extends Error {}
export class DispatchError extends Error {
  readonly error_code: "DISPATCH_REJECTED" | "DISPATCH_OUTCOME_UNKNOWN";
  constructor(readonly creation_status: "not_created" | "unknown", message: string) {
    super(creation_status === "unknown" ? `Creation outcome is unknown; the task may have been created. Do not redispatch automatically; check Codex desktop before any new dispatch. Dispatch token is not a native idempotency key. Native diagnostic: ${message}` : message);
    this.name = "DispatchError";
    this.error_code = creation_status === "unknown" ? "DISPATCH_OUTCOME_UNKNOWN" : "DISPATCH_REJECTED";
  }
}

/** A native error/invalid acknowledgement cannot prove a submitted creation did not happen. */
export function parseNativeResult(name: string, result: NativeResult): Record<string, any> {
  const text = result.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n") ?? "";
  if (result.isError) throw new Error(text || `Desktop ${name} failed`);
  let value: unknown = result.structuredContent;
  if (value === undefined) {
    try { value = JSON.parse(text); } catch { throw new Error(`Desktop ${name} returned no usable JSON acknowledgement`); }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid desktop ${name} response`);
  if (name === "create_thread" && result.structuredContent !== undefined) {
    let textual: unknown;
    try { textual = JSON.parse(text); } catch { /* Natural-language summaries are not a second identity. */ }
    if (textual && typeof textual === "object" && !Array.isArray(textual) &&
        "threadId" in textual && "threadId" in value && textual.threadId !== value.threadId) {
      throw new Error("Desktop create_thread returned contradictory thread identities.");
    }
  }
  return value as Record<string, any>;
}
export type NativeCall = (name: string, args: Record<string, unknown>) => Promise<Record<string, any>>;
export type DispatchResult = { job_id: string; warning?: string };
export interface DispatchBackend {
  start(workspace: string, prompt: string): Promise<DispatchResult>;
  get(jobId: string, options?: { detail?: "compact" | "standard" | "debug" }): Promise<Record<string, unknown>> | Record<string, unknown>;
}

/** Existing desktop App Tools adapter; never starts a Codex execution process. */
export class DesktopCodex implements DispatchBackend {
  private client: Client | null = null;
  private ready = false;
  private readonly call: NativeCall;
  constructor(private readonly roots: string[], private readonly timeoutMs: number, call?: NativeCall) {
    this.call = call ?? ((name, args) => this.callNative(name, args));
  }
  async initialize(): Promise<void> {
    const server = process.env.CODEX_APP_TOOLS_SERVER;
    const node = process.env.CODEX_MCP_NODE_PATH;
    if (!server || !path.isAbsolute(server) || !node || !process.env.CODEX_APP_TOOLS_PIPE_PATH || !process.env.CODEX_THREAD_ID) {
      throw new Error("Launch Bridge from Codex desktop with its existing App Tools server, pipe, Node and caller context. No background Codex fallback.");
    }
    const client = new Client({ name: "codex-bridge-desktop-dispatch", version: "0.3.1" });
    this.client = client;
    client.onerror = () => { this.ready = false; };
    client.onclose = () => { this.ready = false; };
    await client.connect(new StdioClientTransport({
      command: node, args: [server],
      env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
      stderr: "ignore",
    }));
    const tools = await client.listTools();
    for (const name of ["list_projects", "create_thread", "navigate_to_codex_page", "wait_threads"]) {
      if (!tools.tools.some((tool) => tool.name === name)) throw new Error(`Required desktop capability missing: ${name}`);
    }
    this.ready = true;
  }
  isReady(): boolean { return this.ready; }
  async stop(): Promise<void> { this.ready = false; await this.client?.close(); this.client = null; }
  private async callNative(name: string, args: Record<string, unknown>): Promise<Record<string, any>> {
    if (!this.client || !this.ready) throw new NativeCallNotSubmittedError("Codex desktop App Tools are not connected; request was not submitted.");
    let result: NativeResult;
    try {
      result = await this.client.callTool({ name, arguments: args, _meta: { threadId: process.env.CODEX_THREAD_ID } }, undefined, { timeout: this.timeoutMs }) as NativeResult;
    } catch (error) { this.ready = false; throw error; }
    return parseNativeResult(name, result);
  }
  async start(workspace: string, prompt: string): Promise<DispatchResult> {
    let submitted = false;
    try {
      if (typeof prompt !== "string" || !prompt.trim()) throw new Error("prompt must not be empty");
      const canonical = await validateWorkspace(workspace, this.roots);
      const listed = await this.call("list_projects", {});
      if (!Array.isArray(listed.projects)) throw new Error("Desktop list_projects returned no usable project list.");
      const matches: Record<string, any>[] = [];
      for (const item of listed.projects) {
        if (!item || typeof item !== "object") continue;
        if (item.projectKind !== "local" || item.hostId !== "local" || typeof item.path !== "string") continue;
        try { if (path.relative(await realpath(item.path), canonical) === "") matches.push(item); }
        catch { /* An inaccessible saved project cannot match this workspace. */ }
      }
      if (matches.length > 1) throw new Error("Workspace matches multiple local Codex desktop projects after path normalization. Resolve the ambiguous saved project entries in Codex before dispatch; no task was created.");
      const project = matches[0];
      if (!project) throw new Error("Workspace is allowed, but does not match a local project path exposed by Codex desktop list_projects. A saved project's additional roots may not be exposed by this API; create_thread cannot select a root/cwd. Check the project's primary path in Codex. Bridge does not enroll projects, redirect to another root, or fall back to a private app-server.");
      if (typeof project.projectId !== "string" || !project.projectId.trim()) throw new Error("Matching desktop project has no confirmed project identity; no task was submitted.");
      submitted = true;
      const created = await this.call("create_thread", { prompt, target: { type: "project", projectId: project.projectId, environment: { type: "local" } } });
      if (!created || typeof created.threadId !== "string" || !created.threadId.trim()) throw new Error("Desktop creation returned no confirmed thread identity.");
      try { await this.call("navigate_to_codex_page", { threadId: created.threadId }); }
      catch { return { job_id: created.threadId, warning: "Task was created in Codex desktop, but could not be brought into view. Open this task in Codex; do not redispatch." }; }
      return { job_id: created.threadId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DispatchError(submitted && !(error instanceof NativeCallNotSubmittedError) ? "unknown" : "not_created", message);
    }
  }
  async get(jobId: string, options: { detail?: "compact" | "standard" | "debug" } = {}): Promise<Record<string, unknown>> {
    const snapshot = await this.call("wait_threads", { targets: [{ threadId: jobId, hostId: "local" }], timeoutMs: 0 });
    const poll = snapshot.polls?.[0];
    if (!poll) throw new Error(JSON.stringify(snapshot.errors ?? "No desktop task snapshot returned"));
    const result: Record<string, unknown> = { job_id: jobId, status: poll.latestTurn?.status ?? poll.thread?.status?.type ?? "unknown" };
    if (options.detail !== "compact" && poll.latestAssistantMessage?.text) result.final_message = poll.latestAssistantMessage.text;
    if (poll.latestTurn?.error) result.error = poll.latestTurn.error;
    if (options.detail === "debug") result.native_snapshot = poll;
    return result;
  }
}
