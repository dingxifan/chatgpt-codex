import assert from "node:assert/strict";
import test from "node:test";

import { isServerDiscoverRequest, legacyDiscoveryFallback } from "../src/discovery.js";

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

test("modern discovery receives method-not-found so the client can use the legacy handshake", () => {
  const response = legacyDiscoveryFallback("openai-mcp-discover");

  assert.equal(response.id, "openai-mcp-discover");
  assert.deepEqual(response.error, { code: -32601, message: "Method not found" });
});
