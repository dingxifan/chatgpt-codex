import assert from "node:assert/strict";
import test from "node:test";

import { isServerDiscoverRequest, serverDiscoverResponse } from "../src/discovery.js";

test("recognizes a modern MCP server/discover request", () => {
  assert.equal(
    isServerDiscoverRequest({
      jsonrpc: "2.0",
      id: "openai-mcp-discover",
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        },
      },
    }),
    true,
  );
  assert.equal(isServerDiscoverRequest({ jsonrpc: "2.0", method: "server/discover" }), false);
  assert.equal(isServerDiscoverRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }), false);
});

test("discovery advertises the supported legacy handshake protocol", () => {
  const response = serverDiscoverResponse("openai-mcp-discover");

  assert.equal(response.id, "openai-mcp-discover");
  assert.equal(response.result.resultType, "complete");
  assert.deepEqual(response.result.supportedVersions, ["2025-11-25"]);
  assert.deepEqual(response.result.capabilities, { tools: { listChanged: false } });
  assert.deepEqual(response.result._meta["io.modelcontextprotocol/serverInfo"], {
    name: "Codex Agent",
    version: "0.3.1",
  });
});
