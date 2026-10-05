import assert from "node:assert/strict";
import test from "node:test";
import { lintDispatchPrompt } from "../src/dispatch-lint.js";

const validHandoff = `MANDATORY GOAL ACTIVATION
Activate the Goal before substantive work.
/goal Verify the fixture and deliver its result to FINAL RETURN TARGET using RETURN ROUTING.

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
Verify the origin and use the available return capability. Never substitute the technical parent.
`;

test("exact title without a known ID and explicit manual mode are supported", () => {
  assert.deepEqual(lintDispatchPrompt(validHandoff), []);
  assert.deepEqual(lintDispatchPrompt(validHandoff.replace("Return mode: auto", "Return mode: manual")), []);
  assert.deepEqual(lintDispatchPrompt(validHandoff.replaceAll("a".repeat(40), "not applicable")), []);
  assert.deepEqual(lintDispatchPrompt(validHandoff.replace("Fixture origin chat", "任务发起对话")), []);
});

test("the observed wrong-window handoff is rejected rather than treating parent as origin", () => {
  const issues = lintDispatchPrompt("/goal Retire the feature and return the immutable result to the parent window.\nTASK\nPreserve historical evidence.");
  assert(issues.some(issue => issue.rule === "DL001"));
  assert(issues.some(issue => issue.field === "FINAL RETURN TARGET.Conversation title"));
  const noGoal = validHandoff.replace(/\/goal[^\n]+/, "/goal");
  assert(lintDispatchPrompt(noGoal).some(issue => issue.rule === "DL001"));
  for (const title of ["父窗口", "原窗口", "the parent window", "the originating ChatGPT conversation", "<准确的发起对话标题>", "[exact origin title]"]) {
    assert(lintDispatchPrompt(validHandoff.replace("Fixture origin chat", title)).some(issue => issue.rule === "DL002"));
  }
});

test("known technical caller cannot be asserted as a ChatGPT origin", () => {
  const prompt = validHandoff.replace("Bound conversation ID: unavailable", "Bound conversation ID: caller-codex-id");
  assert(lintDispatchPrompt(prompt, "caller-codex-id").some(issue => issue.rule === "DL003"));
  assert(lintDispatchPrompt(prompt.replace("caller-codex-id", "CALLER-CODEX-ID"), "caller-codex-id").some(issue => issue.rule === "DL003"));
  assert.deepEqual(lintDispatchPrompt(prompt, "another-caller"), []);
});

test("task, workspace and baseline mismatches and nonfixed baseline are rejected", () => {
  for (const [from, to] of [["Task identity: fixture-001", "Task identity: fixture-002"], ["Repository / workspace: example/project / /allowed/project", "Repository / workspace: example/project / /other/project"], ["BASE_SHA: " + "a".repeat(40), "BASE_SHA: " + "b".repeat(40)]]) {
    assert(lintDispatchPrompt(validHandoff.replace(from!, to!)).some(issue => issue.rule === "DL004"));
  }
  assert(lintDispatchPrompt(validHandoff.replaceAll("a".repeat(40), "HEAD")).some(issue => issue.field === "BASE_SHA"));
});

test("missing mode, conflicting duplicates and template fields cannot silently pick a policy", () => {
  assert(lintDispatchPrompt(validHandoff.replace("Return mode: auto", "Return mode: maybe")).some(issue => issue.rule === "DL005"));
  assert(lintDispatchPrompt(validHandoff.replace("Return mode: auto", "Return mode: auto\nReturn mode: manual")).some(issue => issue.rule === "DL005"));
  assert(lintDispatchPrompt(validHandoff.replaceAll("fixture-001", "<task-id>")).some(issue => issue.rule === "DL004"));
  assert(lintDispatchPrompt(validHandoff.replaceAll("fixture-001", "[task-id]")).some(issue => issue.rule === "DL004"));
});

test("quoted template sections cannot supply missing live return metadata", () => {
  const quoted = validHandoff.replace("FINAL RETURN TARGET\n", "```text\nFINAL RETURN TARGET\n").replace("\nRETURN ROUTING", "\n```\nRETURN ROUTING");
  assert(lintDispatchPrompt(quoted).some(issue => issue.rule === "DL002"));
  assert.deepEqual(lintDispatchPrompt(validHandoff.replaceAll("\n", "\r\n")), []);
});

const scopedHandoff = validHandoff
  .replaceAll("Task identity: fixture-001", "Task identity: fixture-001\nDispatch token: b3f29391-ef2c-46ed-912f-1c24d981a4d3")
  .replace("Conversation title: Fixture origin chat", "Conversation title: unavailable");

test("missing title and project do not block a valid token dispatch", () => {
  assert.deepEqual(lintDispatchPrompt(scopedHandoff), []);
  // Previously emitted project hints remain compatible but are no longer required.
  assert.deepEqual(lintDispatchPrompt(scopedHandoff.replace("Conversation title: unavailable", "Conversation title: unavailable\nOrigin project: Codex Bridge")), []);
  assert.deepEqual(lintDispatchPrompt(scopedHandoff.replace("Return mode: auto", "Return mode: manual")), []);
});

test("missing title alone cannot bypass the dispatch contract", () => {
  assert(lintDispatchPrompt(validHandoff.replace("Fixture origin chat", "unavailable")).some(issue => issue.field === "Dispatch token"));
  assert(lintDispatchPrompt(scopedHandoff.replaceAll(/Dispatch token:[^\n]+\n/g, "")).some(issue => issue.field === "Dispatch token"));
});

test("tokens must be UUID v4 and exactly repeated rather than semantic task names", () => {
  for (const token of ["fixture-001", "unavailable", "<UUID>", "b3f29391-ef2c-16ed-912f-1c24d981a4d3"]) {
    assert(lintDispatchPrompt(scopedHandoff.replaceAll("b3f29391-ef2c-46ed-912f-1c24d981a4d3", token)).some(issue => issue.field === "Dispatch token"));
  }
  assert(lintDispatchPrompt(scopedHandoff.replace("b3f29391-ef2c-46ed-912f-1c24d981a4d3", "b3f29391-ef2c-46ed-912f-1c24d981a4d4")).some(issue => issue.field === "Dispatch token"));
  assert(lintDispatchPrompt(scopedHandoff.replaceAll("Conversation title: unavailable", "Conversation title: parent window")).some(issue => issue.field === "FINAL RETURN TARGET.Conversation title"));
});
