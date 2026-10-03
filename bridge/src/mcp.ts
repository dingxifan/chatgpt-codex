import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ArtifactStore, MAX_ARTIFACT_BYTES } from "./artifacts.js";
import type { DispatchBackend } from "./desktop.js";

function success(value: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, ...success({ status: "failed", error: message }) };
}

export function createMcpServer(manager: DispatchBackend, artifacts: ArtifactStore): McpServer {
  const server = new McpServer({ name: "Codex Agent", version: "0.3.1" });

  server.registerTool(
    "artifact_put",
    {
      title: "Store local text artifact",
      description:
        "Create one bounded UTF-8 text file for long material not already in Git/workspace. Never invokes Codex, shell, Git, or approvals. Existing files are not overwritten.",
      inputSchema: {
        filename: z.string().min(1).max(128).describe("Portable flat filename only; paths and directories are rejected."),
        content: z.string().describe(`UTF-8 text content, at most ${MAX_ARTIFACT_BYTES} encoded bytes.`),
        expected_sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ filename, content, expected_sha256 }) => {
      try { return success(await artifacts.put({ filename, content, expected_sha256 })); }
      catch (error) { return failure(error); }
    },
  );

  server.registerTool(
    "codex_start",
    {
      title: "Dispatch task to Codex",
      description:
        "Dispatch a task to Codex in an allowed local project path exposed by the desktop API. A successful dispatch completes the normal Bridge action. Send the caller prompt unchanged; do not wait for task completion. Do not poll codex_get automatically or proactively; use codex_get only when the user explicitly asks to inspect the job. Codex desktop handles execution and authorization; return instructions belong in the prompt. No private Codex process, callback or wake mechanism.",
      inputSchema: {
        workspace: z.string().min(1).describe("Absolute existing directory under an administratively configured allowed root."),
        prompt: z.string().min(1).describe("Complete task instruction, including any input file paths and return conditions."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ workspace, prompt }) => {
      try {
        const result = await manager.start(workspace, prompt);
        return success({ job_id: result.job_id, ...(result.warning ? { warning: result.warning } : {}) });
      } catch (error) { return failure(error); }
    },
  );

  server.registerTool(
    "codex_get",
    {
      title: "Query Codex task when requested",
      description:
        "Read task status/result only when the user explicitly asks for a query or diagnosis. Never use as an automatic start/get polling loop. job_id is a diagnostic reference, not a collaboration lifecycle.",
      inputSchema: {
        job_id: z.string().min(1),
        detail: z.enum(["compact", "standard", "debug"]).optional().default("standard"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ job_id, detail }) => {
      try { return success(await manager.get(job_id, { detail })); }
      catch (error) { return failure(error); }
    },
  );

  return server;
}
