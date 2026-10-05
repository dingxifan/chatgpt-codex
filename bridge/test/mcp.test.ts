import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { link, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { ArtifactStore } from "../src/artifacts.js";
import type { DispatchBackend } from "../src/desktop.js";
import { createMcpServer } from "../src/mcp.js";

const validHandoff = `MANDATORY GOAL ACTIVATION
Activate the Goal before substantive work.
/goal Verify the fixture and deliver the result to FINAL RETURN TARGET using RETURN ROUTING.

EXECUTION BRIEF
Task identity: fixture-001
Repository / workspace: example/project / /allowed/project
BASE_SHA: ${"a".repeat(40)}
Artifacts: none

FINAL RETURN TARGET
Conversation kind: ChatGPT
Conversation title: Fixture origin chat
Bound conversation ID: unavailable
Task identity: fixture-001
Repository / workspace: example/project / /allowed/project
BASE_SHA: ${"a".repeat(40)}

RETURN ROUTING
Return mode: auto
Verify the origin; never substitute the technical parent.
`;

test("MCP exposes only dispatch, text drop and explicit query", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-mcp-artifacts-"));
  let managerAccessed = false;
  const manager = new Proxy({}, {
    get() {
      managerAccessed = true;
      throw new Error("artifact_put must not access JobManager");
    },
  }) as DispatchBackend;
  const server = createMcpServer(manager, new ArtifactStore(root));
  const client = new Client({ name: "artifact-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name), [
      "artifact_put",
      "codex_start",
      "codex_get",
    ]);

    const schemas = Object.fromEntries(listed.tools.map((tool) => [tool.name, tool.inputSchema]));
    const descriptions = Object.fromEntries(listed.tools.map((tool) => [tool.name, tool.description ?? ""]));
    assert.match(descriptions.codex_start!, /successful dispatch completes the normal Bridge action/);
    assert.match(descriptions.codex_start!, /Do not poll codex_get automatically or proactively/);
    assert.match(descriptions.codex_get!, /only when the user explicitly asks/);
    const propertyNames = (name: string): string[] => Object.keys(schemas[name]?.properties ?? {});
    assert.deepEqual(propertyNames("codex_start"), ["workspace", "prompt"]);
    assert.deepEqual(propertyNames("codex_get"), ["job_id", "detail"]);
    assert.deepEqual(schemas.codex_start?.required, ["workspace", "prompt"]);
    assert.deepEqual(schemas.codex_get?.required, ["job_id"]);
    assert.equal(client.getServerCapabilities()?.resources, undefined);
    for (const removed of ["codex_continue", "codex_interrupt", "codex_respond_approval", "wake_probe", "codex_wake_wait"]) {
      const rejected = await client.callTool({ name: removed, arguments: {} });
      assert.equal(rejected.isError, true, `${removed} must not remain callable`);
    }

    const result = await client.callTool({
      name: "artifact_put",
      arguments: { filename: "through-mcp.md", content: "# Through MCP\n" },
    });
    assert.equal("isError" in result ? result.isError : undefined, undefined);
    assert.equal("structuredContent" in result ? result.structuredContent?.filename : undefined, "through-mcp.md");
    assert.equal(readFileSync(path.join(root, "through-mcp.md"), "utf8"), "# Through MCP\n");
    assert.equal(managerAccessed, false);
  } finally {
    await client.close();
    await server.close();
  }
});

for (const mode of ["auto", "manual"] as const) for (const shape of ["legacy", "project"] as const) test(`valid ${mode} ${shape} dispatch acknowledges once without waiting or reading results`, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-mcp-dispatch-"));
  const handoff = shape === "legacy" ? validHandoff : validHandoff
    .replaceAll("Task identity: fixture-001", "Task identity: fixture-001\nDispatch token: b3f29391-ef2c-46ed-912f-1c24d981a4d3")
    .replace("Conversation title: Fixture origin chat", "Conversation title: unavailable\nOrigin project: Codex Bridge");
  const prompt = handoff.replace("Return mode: auto", `Return mode: ${mode}`).replaceAll("\n", "\r\n") + "补充说明：保留原始文本。\r\n";
  const calls: string[] = [];
  const manager = {
    async start(workspace: string, received: string) {
      calls.push("start");
      assert.equal(workspace, "/allowed/project");
      assert.equal(received, prompt);
      return { job_id: "diagnostic-id", thread_id: "internal-thread", turn_id: "internal-turn", status: "running", revision: 1 };
    },
    get() { calls.push("get"); throw new Error("dispatch must not read results"); },
  } as unknown as DispatchBackend;
  const server = createMcpServer(manager, new ArtifactStore(root));
  const client = new Client({ name: "dispatch-test", version: "1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: "codex_start", arguments: { workspace: "/allowed/project", prompt } });
    assert.deepEqual(result.structuredContent, { job_id: "diagnostic-id" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(calls, ["start"]);
  } finally { await client.close(); await server.close(); }
});

test("LINT rejection creates no task, returns all findings and no job ID", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-mcp-lint-"));
  let calls = 0;
  const manager = { start() { calls++; throw new Error("invalid handoff must never reach backend"); }, get() { calls++; throw new Error("LINT must not query jobs"); } } as unknown as DispatchBackend;
  const server = createMcpServer(manager, new ArtifactStore(root));
  const client = new Client({ name: "lint-test", version: "1.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
  const previousCaller = process.env.CODEX_THREAD_ID;
  process.env.CODEX_THREAD_ID = "caller-codex-id";
  try {
    for (const prompt of [
      "/goal Retire the feature and return its immutable result to the parent window.\nTASK\nPreserve historical evidence.",
      validHandoff.replace("Bound conversation ID: unavailable", "Bound conversation ID: caller-codex-id"),
      validHandoff.replace("Fixture origin chat", "unavailable"),
      validHandoff.replaceAll("Task identity: fixture-001", "Task identity: fixture-001\nDispatch token: b3f29391-ef2c-46ed-912f-1c24d981a4d3")
        .replace("Conversation title: Fixture origin chat", "Conversation title: unavailable\nOrigin project: Codex Bridge")
        .replace("b3f29391-ef2c-46ed-912f-1c24d981a4d3", "b3f29391-ef2c-46ed-912f-1c24d981a4d4"),
    ]) {
      const result = await client.callTool({ name: "codex_start", arguments: { workspace: "/allowed/project", prompt } });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent?.status, "failed");
      assert.equal(result.structuredContent?.error_code, "DISPATCH_LINT_FAILED");
      assert(Array.isArray(result.structuredContent?.errors));
      if (prompt.startsWith("/goal")) assert((result.structuredContent!.errors as unknown[]).length > 1);
      assert.equal("job_id" in result.structuredContent!, false);
    }
    assert.equal(calls, 0);
  } finally {
    if (previousCaller === undefined) delete process.env.CODEX_THREAD_ID;
    else process.env.CODEX_THREAD_ID = previousCaller;
    await client.close(); await server.close();
  }
});

test("MCP artifact cleanup failure has an explicit error shape and no false success", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-mcp-artifact-failure-"));
  let forcedFailure = false;
  const artifacts = new ArtifactStore(root, undefined, {
    link,
    async unlink(filePath) {
      if (!forcedFailure && filePath.endsWith(".tmp")) {
        forcedFailure = true;
        const error = new Error("forced MCP temp unlink failure") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      await unlink(filePath);
    },
  });
  const manager = new Proxy({}, { get() { throw new Error("artifact_put must not access dispatch backend"); } }) as DispatchBackend;
  const server = createMcpServer(manager, artifacts);
  const client = new Client({ name: "artifact-failure-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "artifact_put",
      arguments: { filename: "cleanup-failure.md", content: "body" },
    });
    assert.equal("isError" in result ? result.isError : undefined, true);
    const structured = "structuredContent" in result ? result.structuredContent : undefined;
    assert.equal(structured?.status, "failed");
    assert.match(String(structured?.error), /Rollback attempted; possible residual paths: none/);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    await client.close();
    await server.close();
  }
});
