const LEGACY_MCP_PROTOCOL_VERSION = "2025-11-25";

type JsonRpcId = string | number;

type ServerDiscoverRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: "server/discover";
};

export function isServerDiscoverRequest(value: unknown): value is ServerDiscoverRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    request.jsonrpc === "2.0" &&
    request.method === "server/discover" &&
    (typeof request.id === "string" || typeof request.id === "number")
  );
}

export function serverDiscoverResponse(id: JsonRpcId) {
  return {
    jsonrpc: "2.0" as const,
    id,
    result: {
      resultType: "complete",
      supportedVersions: [LEGACY_MCP_PROTOCOL_VERSION],
      capabilities: {
        tools: { listChanged: false },
      },
      _meta: {
        "io.modelcontextprotocol/serverInfo": {
          name: "Codex Agent",
          version: "0.3.1",
        },
      },
      instructions:
        "Use codex_start to dispatch the complete task prompt unchanged. Use artifact_put for long text not already in Git/workspace. Use codex_get only when the user explicitly requests status or results. Do not poll or expect Bridge callbacks, wake, approval relay, or automatic return delivery.",
    },
  };
}
