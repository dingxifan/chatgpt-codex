export type DispatchLintIssue = {
  rule: "DL001" | "DL002" | "DL003" | "DL004" | "DL005";
  field: string;
  message: string;
};

const HEADINGS = ["MANDATORY GOAL ACTIVATION", "EXECUTION BRIEF", "FINAL RETURN TARGET", "RETURN ROUTING"] as const;
const PLACEHOLDER = /<[^<>]+>|\{\{[^{}]+\}\}|^\[[^\]]+\]$|^(?:TODO|TBD|unknown|待填)$/i;
const VAGUE_TITLE = /^(?:父窗口|原窗口|发起窗口|本父窗口|(?:the |this |same )?parent(?: window| conversation)?|original window|(?:the )?originating(?: ChatGPT)? conversation(?: that dispatched this task)?)$/i;
const DISPATCH_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Structural checks only. No I/O, permission changes, target lookup or prompt rewrite. */
export function lintDispatchPrompt(prompt: string, callerThreadId?: string): DispatchLintIssue[] {
  const issues: DispatchLintIssue[] = [];
  const add = (rule: DispatchLintIssue["rule"], field: string, message: string) => issues.push({ rule, field, message });
  const sections = new Map<string, string[]>();
  const order: string[] = [];
  let section = "";
  let fence: string | undefined;
  const lines = prompt.replace(/\r\n/g, "\n").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    const delimiter = /^(\x60{3,}|~{3,})/.exec(line)?.[1];
    if (delimiter) {
      if (!fence) fence = delimiter;
      else if (delimiter[0] === fence[0] && delimiter.length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.replace(/^#{1,6}\s+/, "");
    if (HEADINGS.includes(heading as typeof HEADINGS[number])) {
      if (sections.has(heading)) add("DL005", heading, "区块重复；请只保留一份明确的交接区块。");
      else { sections.set(heading, []); order.push(heading); }
      section = heading;
    } else if (section) sections.get(section)!.push(line);
  }
  const first = lines.find(line => line.trim())?.trim().replace(/^#{1,6}\s+/, "");
  const activation = sections.get("MANDATORY GOAL ACTIVATION") ?? [];
  const goalAt = activation.findIndex(line => /^\/goal(?:\s|$)/.test(line));
  const objective = goalAt < 0 ? "" : activation.slice(goalAt).join("\n").replace(/^\/goal\s*/, "").trim();
  if (first !== "MANDATORY GOAL ACTIVATION" || goalAt < 0 || !objective || /^(?:<[^>]+>|\[[^\]]+\]|\{\{[^}]+\}\})$/.test(objective)) {
    add("DL001", "MANDATORY GOAL ACTIVATION./goal", "指令必须以 Goal 激活区块开头，并包含 /goal 和具体目标。");
  }
  if (!HEADINGS.every((heading, index) => order[index] === heading) || order.length !== HEADINGS.length) {
    add("DL005", "sections", "交接区块必须按 MANDATORY GOAL ACTIVATION、EXECUTION BRIEF、FINAL RETURN TARGET、RETURN ROUTING 排列。");
  }
  const fields = (heading: string): Map<string, string> => {
    const values = new Map<string, string>();
    for (const line of sections.get(heading) ?? []) {
      const match = /^([A-Za-z][A-Za-z /_]*):\s*(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1]!;
      const value = match[2]!.trim();
      if (values.has(key) && values.get(key) !== value) add("DL005", `${heading}.${key}`, "重复字段给出了不同值。");
      else values.set(key, value);
    }
    return values;
  };
  const brief = fields("EXECUTION BRIEF");
  const target = fields("FINAL RETURN TARGET");
  const routing = fields("RETURN ROUTING");
  if (target.get("Conversation kind") !== "ChatGPT") add("DL002", "FINAL RETURN TARGET.Conversation kind", "必须明确最终目标类型为 ChatGPT。");
  const title = target.get("Conversation title") ?? "";
  const token = brief.get("Dispatch token") ?? "";
  const targetToken = target.get("Dispatch token") ?? "";
  const tokenEnvelope = brief.has("Dispatch token") || target.has("Dispatch token") || title === "unavailable";
  if (tokenEnvelope) {
    if (!DISPATCH_TOKEN.test(token) || !DISPATCH_TOKEN.test(targetToken) || token !== targetToken) {
      add("DL004", "Dispatch token", "两处 Dispatch token 必须是完全一致的本次 UUID v4。");
    }
  }
  if (!title || PLACEHOLDER.test(title) || VAGUE_TITLE.test(title) || (title.toLowerCase() === "unavailable" && title !== "unavailable")) {
    add("DL002", "FINAL RETURN TARGET.Conversation title", "填写真实标题或明确 unavailable；不能仅写父窗口或占位符。");
  }
  const id = target.get("Bound conversation ID");
  if (!id || PLACEHOLDER.test(id)) add("DL002", "FINAL RETURN TARGET.Bound conversation ID", "填写已核验 ID；没有 ID 时明确填写 unavailable。");
  else if (id !== "unavailable" && callerThreadId && id.toLowerCase() === callerThreadId.toLowerCase()) {
    add("DL003", "FINAL RETURN TARGET.Bound conversation ID", "不能把 Bridge 当前技术调用会话当成 ChatGPT 来源窗口。");
  }
  for (const key of ["Task identity", "Repository / workspace", "BASE_SHA"]) {
    const left = brief.get(key) ?? "";
    const right = target.get(key) ?? "";
    if (!left || !right || PLACEHOLDER.test(left) || PLACEHOLDER.test(right)) add("DL004", key, "执行区块和回传区块都必须填写实际值。");
    else if (key === "BASE_SHA" ? left.toLowerCase() !== right.toLowerCase() : left !== right) add("DL004", key, "执行信息与回传信息不一致。");
    if (key === "BASE_SHA" && [left, right].some(value => value && !/^(?:[a-fA-F0-9]{40}|not applicable)$/.test(value))) {
      add("DL004", "BASE_SHA", "BASE_SHA 必须是完整 40 位 Git SHA，或明确 not applicable。");
    }
  }
  if (!["auto", "manual"].includes(routing.get("Return mode") ?? "")) add("DL005", "RETURN ROUTING.Return mode", "Return mode 必须为 auto 或 manual。");
  return issues;
}
