import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { link, unlink } from "node:fs/promises";

import { ArtifactStore, MAX_ARTIFACT_BYTES, validateArtifactFilename } from "../src/artifacts.js";

function temporaryRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "codex-artifacts-"));
}

test("artifact_put writes exact UTF-8 bytes and returns path, size, filename, and digest", async () => {
  const root = temporaryRoot();
  const content = "# Handoff\n\nUnicode: 你好 🌍\n";
  const bytes = Buffer.from(content, "utf8");
  const expected = createHash("sha256").update(bytes).digest("hex");

  const result = await new ArtifactStore(root).put({
    filename: "design-v1.md",
    content,
    expected_sha256: expected.toUpperCase(),
  });

  assert.equal(result.path, path.join(await realpath(root), "design-v1.md"));
  assert.equal(result.filename, "design-v1.md");
  assert.equal(result.bytes, bytes.byteLength);
  assert.equal(result.sha256, expected);
  assert.deepEqual(readFileSync(result.path), bytes);
  assert.deepEqual(readdirSync(root), ["design-v1.md"]);
  if (process.platform !== "win32") assert.equal(statSync(result.path).mode & 0o777, 0o600);
});

test("expected hash mismatch and oversized content fail before publication", async () => {
  const root = temporaryRoot();
  const store = new ArtifactStore(root);

  await assert.rejects(
    store.put({ filename: "mismatch.md", content: "body", expected_sha256: "0".repeat(64) }),
    /expected_sha256 mismatch/,
  );
  await assert.rejects(
    store.put({ filename: "large.md", content: "x".repeat(MAX_ARTIFACT_BYTES + 1) }),
    /maximum is 262144 bytes/,
  );
  assert.deepEqual(readdirSync(root), []);
});

test("the exact 256 KiB UTF-8 byte limit is accepted", async () => {
  const root = temporaryRoot();
  const result = await new ArtifactStore(root).put({ filename: "at-limit.md", content: "x".repeat(MAX_ARTIFACT_BYTES) });
  assert.equal(result.bytes, MAX_ARTIFACT_BYTES);
  assert.equal(statSync(result.path).size, MAX_ARTIFACT_BYTES);
});

test("flat filename policy rejects traversal, separators, absolute paths, and Windows reserved names", () => {
  for (const filename of [
    "../escape.md",
    "sub/file.md",
    "sub\\file.md",
    "/absolute.md",
    "C:\\absolute.md",
    "CON",
    "con.txt",
    "LPT9.md",
    "trailing.",
    ".hidden",
    "name with spaces.md",
  ]) {
    assert.throws(() => validateArtifactFilename(filename), /portable flat name/);
  }
  assert.doesNotThrow(() => validateArtifactFilename("handoff_2026-09-21.v1.md"));
});

test("existing destination is never overwritten", async () => {
  const root = temporaryRoot();
  const destination = path.join(root, "existing.md");
  writeFileSync(destination, "original", "utf8");

  await assert.rejects(
    new ArtifactStore(root).put({ filename: "existing.md", content: "replacement" }),
    /already exists and overwrite is disabled/,
  );
  assert.equal(readFileSync(destination, "utf8"), "original");
  assert.deepEqual(readdirSync(root), ["existing.md"]);
});

test("concurrent publication of one filename has exactly one winner and leaves no temp files", async () => {
  const root = temporaryRoot();
  const store = new ArtifactStore(root);
  const outcomes = await Promise.allSettled([
    store.put({ filename: "race.md", content: "first" }),
    store.put({ filename: "race.md", content: "second" }),
  ]);

  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((item) => item.status === "rejected").length, 1);
  assert.ok(["first", "second"].includes(readFileSync(path.join(root, "race.md"), "utf8")));
  assert.deepEqual(readdirSync(root), ["race.md"]);
});

test("temp unlink failure after publication returns failure and rolls back both links", async () => {
  const root = temporaryRoot();
  let forcedFailure = false;
  const store = new ArtifactStore(root, MAX_ARTIFACT_BYTES, {
    link,
    async unlink(filePath) {
      if (!forcedFailure && filePath.endsWith(".tmp")) {
        forcedFailure = true;
        const error = new Error("forced temp unlink failure") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      await unlink(filePath);
    },
  });

  await assert.rejects(
    store.put({ filename: "rollback.md", content: "must not be reported as published" }),
    /Rollback attempted; possible residual paths: none/,
  );
  assert.equal(forcedFailure, true);
  assert.deepEqual(readdirSync(root), []);
});
