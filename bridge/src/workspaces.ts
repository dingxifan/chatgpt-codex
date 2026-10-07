import { realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_WORKSPACE_ROOT = path.join(os.homedir(), "workspace");

export class WorkspaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceValidationError";
  }
}

function validateRoots(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((root) =>
    typeof root !== "string" || !path.isAbsolute(root) || root.includes("\0") || root.split(/[\\/]/).includes(".."))) {
    throw new WorkspaceValidationError("Workspace roots must be a nonempty array of absolute paths without NUL or '..' segments.");
  }
  return value.map((root: string) => path.resolve(root));
}

/** Plain filesystem allowlist; no project enrollment or persistent workspace state. */
export function configuredWorkspaceRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.CODEX_WORKSPACE_ROOTS !== undefined) {
    let roots: unknown;
    try { roots = JSON.parse(env.CODEX_WORKSPACE_ROOTS); }
    catch { throw new WorkspaceValidationError("CODEX_WORKSPACE_ROOTS must be a JSON array of absolute paths."); }
    return validateRoots(roots);
  }
  return validateRoots([env.CODEX_WORKSPACE_ROOT ?? DEFAULT_WORKSPACE_ROOT]);
}

function validateInput(input: string): void {
  if (typeof input !== "string" || input.length === 0) {
    throw new WorkspaceValidationError("workspace debe ser una ruta no vacía.");
  }
  if (input.includes("\0")) throw new WorkspaceValidationError("workspace contiene un byte NUL inválido.");
  if (!path.isAbsolute(input)) throw new WorkspaceValidationError("workspace debe ser una ruta absoluta.");
  if (input.split(/[\\/]/).includes("..")) {
    throw new WorkspaceValidationError("workspace no puede contener segmentos '..'.");
  }
}

/** Same filesystem identity rules for request, handoff and saved project paths. */
export async function resolveWorkspacePath(input: string): Promise<string> {
  validateInput(input);
  try {
    const candidate = await realpath(path.resolve(input));
    if (!(await stat(candidate)).isDirectory()) throw new Error("not a directory");
    return candidate;
  } catch {
    throw new WorkspaceValidationError(`workspace no existe o no puede resolverse: ${input}`);
  }
}

/** Resolve both roots and target before checking containment, including symlink escapes. */
export async function validateWorkspace(input: string, rootsInput?: string | string[]): Promise<string> {
  validateInput(input);

  const roots = rootsInput === undefined
    ? configuredWorkspaceRoots()
    : validateRoots(typeof rootsInput === "string" ? [rootsInput] : rootsInput);
  const canonicalRoots: string[] = [];
  for (const root of roots) {
    try {
      const canonicalRoot = await realpath(root);
      if (!(await stat(canonicalRoot)).isDirectory()) throw new Error("not a directory");
      canonicalRoots.push(canonicalRoot);
    } catch {
      throw new WorkspaceValidationError(`Configured workspace root does not exist or cannot be resolved: ${root}`);
    }
  }
  const candidate = await resolveWorkspacePath(input);
  for (const root of canonicalRoots) {
    const relative = path.relative(root, candidate);
    if (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) return candidate;
  }
  throw new WorkspaceValidationError(`workspace debe estar dentro de configured allowed roots: ${input}`);
}
