import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { allowedHosts, assertSafeHost, isLoopbackHost, runtimeConfig } from "../src/config.js";

test("HOST sólo permite loopback sin opt-in", () => {
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("localhost"), true);
  assert.equal(isLoopbackHost("0.0.0.0"), false);
  assert.throws(() => assertSafeHost("0.0.0.0", false), /no es loopback/);
  assert.doesNotThrow(() => assertSafeHost("0.0.0.0", true));
});

test("runtime config valida duraciones y requiere opt-in para bind externo", () => {
  assert.throws(() => runtimeConfig({ HOST: "0.0.0.0" }), /no es loopback/);
  const config = runtimeConfig({ HOST: "0.0.0.0", CODEX_AGENT_ALLOW_NON_LOOPBACK: "1", PORT: "9000", CODEX_RPC_TIMEOUT_MS: "17" });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 9000);
  assert.equal(config.rpcTimeoutMs, 17);
});

test("handoff root uses an administrative absolute path", () => {
  const configured = runtimeConfig({ CODEX_AGENT_HANDOFF_ROOT: path.resolve("handoff-test") });
  assert.equal(configured.handoffRoot, path.resolve("handoff-test"));
  assert.throws(() => runtimeConfig({ CODEX_AGENT_HANDOFF_ROOT: "relative/handoff" }), /must be an absolute path/);
});

test("runtime accepts multiple workspace roots without a project registry", () => {
  const roots = [path.resolve("projects"), path.resolve("tools")];
  assert.deepEqual(runtimeConfig({ CODEX_WORKSPACE_ROOTS: JSON.stringify(roots) }).workspaceRoots, roots);
  assert.throws(() => runtimeConfig({ CODEX_WORKSPACE_ROOTS: "[]" }), /nonempty array/);
});

test("allowedHosts sigue al PORT configurado y admite el host del túnel", () => {
  const loopback = allowedHosts("127.0.0.1", 9000, {});
  assert.ok(loopback.includes("127.0.0.1:9000"));
  assert.ok(loopback.includes("localhost:9000"));
  assert.ok(!loopback.some((host) => host.endsWith(":8787")));

  const external = allowedHosts("0.0.0.0", 9000, {});
  assert.deepEqual(external, ["0.0.0.0:9000"]);

  // El SDK compara la cabecera Host cruda: hacen falta ambas formas.
  const tunneled = allowedHosts("127.0.0.1", 9000, { CODEX_AGENT_ALLOWED_HOSTS: "Tunnel.Example.Com, ,," });
  assert.ok(tunneled.includes("tunnel.example.com"));
  assert.ok(tunneled.includes("Tunnel.Example.Com"));
  assert.ok(!tunneled.includes(""), "una entrada vacía desactivaría la validación en el SDK");

  // '*' no es un comodín para el SDK, pero la lista nunca debe quedar vacía.
  for (const env of [{}, { CODEX_AGENT_ALLOWED_HOSTS: "" }, { CODEX_AGENT_ALLOWED_HOSTS: ",, " }]) {
    assert.ok(allowedHosts("127.0.0.1", 9000, env).length > 0);
  }

  assert.deepEqual(runtimeConfig({ PORT: "9000" }).allowedHosts, loopback);
});
