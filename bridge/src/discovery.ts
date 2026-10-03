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

export function legacyDiscoveryFallback(id: JsonRpcId) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: { code: -32601, message: "Method not found" },
  };
}
