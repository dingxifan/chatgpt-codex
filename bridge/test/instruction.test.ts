import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { InstructionStore, MAX_GOAL_LENGTH, parseInstruction, parseUniqueJson, readBoundedText } from "../src/instruction.js";
import { AUTHORIZATION, fixture, instructionText, metadata } from "./instruction-fixture.js";

test("load preserves full file and original authorization; Goal only derives from goal_core and exact identity", async () => {
  const f = await fixture();
  const loaded = await new InstructionStore(f.artifacts, [f.root]).load(f.input);
  assert.equal(loaded.text, instructionText(f.metadata));
  assert.equal(loaded.metadata.return.authorization_evidence.original_text, AUTHORIZATION);
  assert.equal(loaded.metadata.return.authorization_evidence.prior_verification.source_read_tool_call_id, "read-call-1");
  assert(loaded.goal.startsWith(f.metadata.goal_core + "\n\n"));
  assert(loaded.goal.includes(f.file.path));
  assert(loaded.goal.includes(f.file.sha256));
  assert(loaded.goal.includes(f.input.dispatch_token));
  assert(loaded.goal.length <= MAX_GOAL_LENGTH);
  assert(loaded.prompt.includes(JSON.stringify(loaded.goal)));
  assert.equal(loaded.prompt.includes("Required access profile"), false);
  assert(loaded.prompt.includes("admit requires goal, goal_activation_record, instruction_read_record"));
  assert.equal(loaded.prompt.includes("Read the fixture only."), false, "Business body remains in its one file.");
  assert.equal(loaded.status_path, path.join(f.root, f.input.dispatch_token + ".status.md"));
});

test("wrong digest/token, missing file, path traversal, outside path and symlink escape fail closed", async () => {
  const f = await fixture();
  const store = new InstructionStore(f.artifacts, [f.root]);
  await assert.rejects(store.load({ ...f.input, expected_sha256: "0".repeat(64) }), /SHA256 mismatch/);
  await assert.rejects(store.load({ ...f.input, dispatch_token: "b3f29391-ef2c-46ed-912f-1c24d981a4d4" }), /token mismatch/);
  await assert.rejects(store.load({ ...f.input, instruction_file: path.join(f.root, "absent.md") }), /ENOENT/);
  await assert.rejects(store.load({ ...f.input, instruction_file: f.root + path.sep + ".." + path.sep + "instruction.md" }), /segments/);
  const outside = mkdtempSync(path.join(tmpdir(), "codex-instruction-outside-"));
  const outsideFile = path.join(outside, "outside.md");
  writeFileSync(outsideFile, instructionText(f.metadata));
  await assert.rejects(store.load({ ...f.input, instruction_file: outsideFile }), /escapes/);
  const alias = path.join(f.root, "alias");
  symlinkSync(outside, alias, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(store.load({ ...f.input, instruction_file: path.join(alias, "outside.md") }), /escapes/);
});

test("ambiguous or missing metadata and duplicate JSON keys are rejected; body JSON is not metadata", () => {
  const value = metadata(path.resolve("fixture"));
  const text = instructionText(value);
  for (const broken of [
    text.replace("## 任务元信息", "## Other"),
    text + "\n## 任务元信息\n\n```json\n{}\n```\n",
    text.replace('"schema":', '"schema":"codex-instruction/v1",\n"schema":'),
    text.replace("## 操作与授权依据", "```json\n{}\n```\n\n## 操作与授权依据"),
    text.split("\n## 操作与授权依据")[0]!,
    text.replace("fixture-001", "<actual-task-id>"),
  ]) assert.throws(() => parseInstruction(broken));
  assert.deepEqual(parseInstruction(text + "\n```json\n{\"workspace\":\"body-example\"}\n```"), value);
  assert.throws(() => parseUniqueJson('{"x":1,"\\u0078":2}'), /Duplicate/);
  assert.deepEqual(parseUniqueJson('{"x":{"y":1},"array":[{"y":2}]}'), { x: { y: 1 }, array: [{ y: 2 }] });
});

test("technical caller is never accepted as source/target; unknown authorization stays unknown", async () => {
  const f = await fixture();
  await assert.rejects(new InstructionStore(f.artifacts, [f.root]).load(f.input, "origin-chat"), /technical Bridge/);
  const value = metadata(f.workspace);
  for (const key of ["original_text", "source_conversation_id", "source_message_id", "allowed_action", "applicable_scope", "explicit_limits"] as const) value.return.authorization_evidence[key] = null;
  value.return.authorization_evidence.prior_verification = { record_locator: null, source_read_tool_call_id: null, checked_target_id: null };
  assert.equal(parseInstruction(instructionText(value)).return.authorization_evidence.original_text, null);
  assert.throws(() => parseInstruction(instructionText({ ...value, return: { ...value.return, authorized: true } } as any)), /authorized/);
});

test("quoted document cannot supply live metadata; body code examples do not redefine it", () => {
  const value = metadata(path.resolve("fixture"));
  const text = instructionText(value);
  assert.throws(() => parseInstruction("~~~~markdown\n" + text + "\n~~~~\n"), /Exactly one/);
  assert.throws(() => parseInstruction(text.split("\n").map(line => "> " + line).join("\n")), /Exactly one/);
  const embedded = instructionText(value, "## 操作与授权依据\nRead only this fixture.\n\n~~~~markdown\n" + text + "\n~~~~\n");
  assert.deepEqual(parseInstruction(embedded), value);
});

test("Goal overflow and disallowed workspace fail before transport; aliases retain declared facts", async () => {
  const long = await fixture("auto", value => { value.goal_core = "x".repeat(MAX_GOAL_LENGTH); });
  await assert.rejects(new InstructionStore(long.artifacts, [long.root]).load(long.input), /Compiled Goal exceeds/);
  const f = await fixture();
  const outside = mkdtempSync(path.join(tmpdir(), "codex-root-denied-"));
  await assert.rejects(new InstructionStore(f.artifacts, [outside]).load(f.input), /allowed roots/);
});

test("text reads reject oversized, invalid UTF-8 and binary data without truncation", async () => {
  const f = await fixture();
  const file = path.join(f.root, "bytes.txt");
  for (const data of [Buffer.alloc(257 * 1024, 97), Buffer.from([0xc3, 0x28]), Buffer.from([97, 0, 98])]) {
    writeFileSync(file, data);
    await assert.rejects(readBoundedText(f.root, file));
  }
});
