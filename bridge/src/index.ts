import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { ArtifactStore } from "./artifacts.js";
import { DesktopCodex } from "./desktop.js";
import { runtimeConfig, SERVICE_NAME } from "./config.js";
import { isServerDiscoverRequest, serverDiscoverResponse } from "./discovery.js";
import { createMcpServer } from "./mcp.js";

type Session = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createMcpServer>;
};

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 2 * 1024 * 1024) throw new Error("cuerpo MCP demasiado grande.");
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body.trim().length === 0 ? undefined : JSON.parse(body);
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  if (response.headersSent) return;
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}

async function main(): Promise<void> {
  const config = runtimeConfig();
  const artifacts = new ArtifactStore(config.handoffRoot);
  const jobs = new DesktopCodex(config.workspaceRoots, config.rpcTimeoutMs);
  const sessions = new Map<string, Session>();

  const handleMcp = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const sessionId = headerValue(request, "mcp-session-id");
    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        writeJson(response, 400, { jsonrpc: "2.0", error: { code: -32700, message: error instanceof Error ? error.message : "JSON inválido." }, id: null });
        return;
      }
      if (!sessionId && isServerDiscoverRequest(body)) {
        writeJson(response, 200, serverDiscoverResponse(body.id));
        return;
      }
      let session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session && !sessionId && isInitializeRequest(body)) {
        let transport: StreamableHTTPServerTransport;
        const server = createMcpServer(jobs, artifacts);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          enableDnsRebindingProtection: true,
          allowedHosts: config.allowedHosts,
          onsessioninitialized: (newSessionId) => { sessions.set(newSessionId, { transport, server }); },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        await server.connect(transport);
        session = { transport, server };
      }
      if (!session) {
        writeJson(response, 400, { jsonrpc: "2.0", error: { code: -32000, message: "Se requiere un mcp-session-id válido." }, id: null });
        return;
      }
      await session.transport.handleRequest(request, response, body);
      return;
    }
    if (request.method === "GET" || request.method === "DELETE") {
      if (!sessionId) {
        writeJson(response, 400, { jsonrpc: "2.0", error: { code: -32000, message: "GET/DELETE requieren mcp-session-id." }, id: null });
        return;
      }
      const session = sessions.get(sessionId);
      if (!session) {
        writeJson(response, 404, { jsonrpc: "2.0", error: { code: -32001, message: "Sesión MCP no encontrada." }, id: null });
        return;
      }
      await session.transport.handleRequest(request, response);
      return;
    }
    response.setHeader("Allow", "GET, POST, DELETE");
    writeJson(response, 405, { jsonrpc: "2.0", error: { code: -32601, message: "Método HTTP no permitido." }, id: null });
  };

  const httpServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (url.pathname === "/healthz") {
        writeJson(response, 200, { ok: true, service: SERVICE_NAME });
      } else if (url.pathname === "/readyz") {
        const ready = jobs.isReady();
        writeJson(response, ready ? 200 : 503, { ready, service: SERVICE_NAME, desktop_connected: ready });
      } else if (url.pathname === "/mcp") {
        await handleMcp(request, response);
      } else {
        writeJson(response, 404, { error: "Not found" });
      }
    } catch (error) {
      if (!response.headersSent) writeJson(response, 500, { jsonrpc: "2.0", error: { code: -32603, message: error instanceof Error ? error.message : "Error interno." }, id: null });
    }
  });

  let shutdownPromise: Promise<void> | null = null;
  const shutdown = (signal: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      console.error(`[${SERVICE_NAME}] cerrando por ${signal}`);
      for (const session of sessions.values()) {
        try { await session.transport.close(); } catch { /* best effort */ }
      }
      await jobs.stop();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    })();
    return shutdownPromise;
  };
  process.once("SIGINT", () => void shutdown("SIGINT").finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown("SIGTERM").finally(() => process.exit(0)));

  httpServer.listen(config.port, config.host, () => {
    console.error(`[${SERVICE_NAME}] MCP Streamable HTTP en http://${config.host}:${config.port}/mcp`);
  });
  void jobs.initialize().catch((error: unknown) => {
    console.error(`[${SERVICE_NAME}] desktop not ready: ${error instanceof Error ? error.message : String(error)}`);
  });
}

void main().catch((error: unknown) => {
  console.error(`[${SERVICE_NAME}] configuración inválida: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
