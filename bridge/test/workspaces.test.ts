import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { configuredWorkspaceRoots, validateWorkspace } from "../src/workspaces.js";

test("canonical workspace stays under the configured root", async () => {
  const result = await validateWorkspace(process.cwd());
  assert.equal(result, realpathSync(process.cwd()));
});

test("workspace traversal, outside path and invalid root are rejected", async () => {
  await assert.rejects(validateWorkspace(`${process.cwd()}/../.codex`), /segmentos '\.\.'/);
  const outside = mkdtempSync(path.join(tmpdir(), "codex-workspace-outside-"));
  await assert.rejects(validateWorkspace(outside, process.cwd()), /dentro de/);
  await assert.rejects(validateWorkspace(outside, "/path/../unsafe"), /absolute paths/);
});

test("multiple roots allow either subtree but reject siblings, parents and drive roots", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "codex-workspace-allowlist-"));
  const first = path.join(parent, "first");
  const second = path.join(parent, "second");
  const sibling = path.join(parent, "first-other");
  for (const root of [first, second, sibling]) mkdirSync(root);
  const projectA = path.join(first, "project-a");
  const projectB = path.join(second, "project-b");
  mkdirSync(projectA); mkdirSync(projectB);
  const roots = [first, second];
  assert.equal(await validateWorkspace(projectA, roots), realpathSync(projectA));
  assert.equal(await validateWorkspace(projectB, roots), realpathSync(projectB));
  await assert.rejects(validateWorkspace(sibling, roots), /configured allowed roots/);
  await assert.rejects(validateWorkspace(parent, roots), /configured allowed roots/);
  await assert.rejects(validateWorkspace(path.parse(parent).root, roots), /configured allowed roots/);
  const escape = path.join(first, "escape");
  symlinkSync(sibling, escape, "dir");
  await assert.rejects(validateWorkspace(escape, roots), /configured allowed roots/);
  await assert.rejects(validateWorkspace(projectA, [first, path.join(parent, "missing-root")]), /Configured workspace root/);
});

test("root configuration is a plain validated filesystem list and fails closed", () => {
  const roots = [path.resolve("first-root"), path.resolve("second-root")];
  assert.deepEqual(configuredWorkspaceRoots({ CODEX_WORKSPACE_ROOTS: JSON.stringify(roots) }), roots);
  assert.deepEqual(configuredWorkspaceRoots({ CODEX_WORKSPACE_ROOT: roots[0] }), [roots[0]]);
  for (const invalid of ["", "not-json", "[]", "{}", '["relative"]', '[null]', JSON.stringify([`${roots[0]}/../escape`])]) {
    assert.throws(() => configuredWorkspaceRoots({ CODEX_WORKSPACE_ROOTS: invalid, CODEX_WORKSPACE_ROOT: roots[0] }), /JSON array|absolute paths/);
  }
});

test("symlink escape is rejected after realpath", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-workspace-root-"));
  const outside = mkdtempSync(path.join(tmpdir(), "codex-workspace-outside-"));
  const link = path.join(root, "escape");
  symlinkSync(outside, link, "dir");
  await assert.rejects(validateWorkspace(link, root), /dentro de/);
  mkdirSync(path.join(root, "valid"));
  assert.equal(await validateWorkspace(path.join(root, "valid"), root), realpathSync(path.join(root, "valid")));
});
