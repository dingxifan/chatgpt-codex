import { pathToFileURL } from "node:url";
import { ArtifactStore, MAX_ARTIFACT_BYTES } from "./artifacts.js";
import { HandoffKernel, type KernelAction } from "./handoff-kernel.js";
import { parseUniqueJson } from "./instruction.js";

export async function runKernel(args: string[], input: string, receivingJobId?: string) {
  const [action, root, token, revision] = args;
  if (args.length !== 4 || !["admit", "advance", "finish", "check"].includes(action ?? "") || !root || !token || !/^(0|[1-9][0-9]*)$/.test(revision ?? "")) {
    throw new Error("Usage: handoff-kernel-cli <admit|advance|finish|check> <actual-handoff-root> <token> <expected_revision>; JSON data on stdin.");
  }
  if (!receivingJobId) throw new Error("RECEIVING_CONTEXT_MISSING: run inside the actual receiving Codex task; do not copy another context.");
  return new HandoffKernel(new ArtifactStore(root)).apply(token, receivingJobId, action as KernelAction, Number(revision), parseUniqueJson(input));
}
async function main() {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_ARTIFACT_BYTES) throw new Error("KERNEL_INPUT_TOO_LARGE");
      chunks.push(bytes);
    }
    const input = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    const result = await runKernel(process.argv.slice(2), input, process.env.CODEX_THREAD_ID);
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (error) {
    process.stderr.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), action_required: "Stop this progression/delivery step and resolve the actual reported condition." }) + "\n");
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
