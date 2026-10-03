import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, realpath, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const MAX_ARTIFACT_BYTES = 256 * 1024;
export const DEFAULT_HANDOFF_ROOT = path.join(os.homedir(), ".codex-agent-mcp", "handoff");

export type ArtifactPutInput = {
  filename: string;
  content: string;
  expected_sha256?: string;
};

export type ArtifactPutResult = {
  path: string;
  filename: string;
  bytes: number;
  sha256: string;
};

export type ArtifactFileOperations = {
  link(source: string, destination: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
};

const DEFAULT_FILE_OPERATIONS: ArtifactFileOperations = { link, unlink };

export class ArtifactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactValidationError";
  }
}

const PORTABLE_FILENAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;
const WINDOWS_RESERVED_NAME = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function validateRoot(root: string): string {
  if (!path.isAbsolute(root) || root.includes("\0")) {
    throw new ArtifactValidationError("CODEX_AGENT_HANDOFF_ROOT must be an absolute path without NUL bytes.");
  }
  return path.resolve(root);
}

export function validateArtifactFilename(filename: string): void {
  if (
    filename.length === 0 ||
    filename.includes("\0") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    path.isAbsolute(filename) ||
    path.win32.isAbsolute(filename) ||
    filename.endsWith(".") ||
    !PORTABLE_FILENAME.test(filename) ||
    WINDOWS_RESERVED_NAME.test(filename)
  ) {
    throw new ArtifactValidationError(
      "filename must be one portable flat name (1-128 ASCII letters, digits, '.', '_', or '-'), without paths or Windows reserved names.",
    );
  }
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

export class ArtifactStore {
  readonly configuredRoot: string;
  readonly maxBytes: number;
  private readonly fileOperations: ArtifactFileOperations;

  constructor(
    root = process.env.CODEX_AGENT_HANDOFF_ROOT ?? DEFAULT_HANDOFF_ROOT,
    maxBytes = MAX_ARTIFACT_BYTES,
    fileOperations: ArtifactFileOperations = DEFAULT_FILE_OPERATIONS,
  ) {
    this.configuredRoot = validateRoot(root);
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
      throw new ArtifactValidationError("artifact maxBytes must be a positive safe integer.");
    }
    this.maxBytes = maxBytes;
    this.fileOperations = fileOperations;
  }

  private async cleanupPath(filePath: string): Promise<{ remaining: boolean; error?: string }> {
    try {
      await this.fileOperations.unlink(filePath);
      return { remaining: false };
    } catch (error) {
      if (errorCode(error) === "ENOENT") return { remaining: false };
      return { remaining: true, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async put(input: ArtifactPutInput): Promise<ArtifactPutResult> {
    validateArtifactFilename(input.filename);
    if (input.expected_sha256 !== undefined && !SHA256_HEX.test(input.expected_sha256)) {
      throw new ArtifactValidationError("expected_sha256 must be exactly 64 hexadecimal characters.");
    }

    const data = Buffer.from(input.content, "utf8");
    if (data.byteLength > this.maxBytes) {
      throw new ArtifactValidationError(`artifact is ${data.byteLength} bytes; the maximum is ${this.maxBytes} bytes.`);
    }

    const sha256 = createHash("sha256").update(data).digest("hex");
    if (input.expected_sha256 !== undefined && input.expected_sha256.toLowerCase() !== sha256) {
      throw new ArtifactValidationError(`expected_sha256 mismatch: expected ${input.expected_sha256.toLowerCase()}, received ${sha256}.`);
    }

    await mkdir(this.configuredRoot, { recursive: true, mode: 0o700 });
    const root = await realpath(this.configuredRoot);
    if (!(await stat(root)).isDirectory()) {
      throw new ArtifactValidationError(`handoff root is not a directory: ${this.configuredRoot}`);
    }

    const finalPath = path.join(root, input.filename);
    const relative = path.relative(root, finalPath);
    if (relative !== input.filename || path.isAbsolute(relative)) {
      throw new ArtifactValidationError("filename escapes the configured handoff root.");
    }

    const temporaryPath = path.join(root, `.${input.filename}.${process.pid}.${randomUUID()}.tmp`);
    let temporaryExists = false;
    try {
      const handle = await open(temporaryPath, "wx", 0o600);
      temporaryExists = true;
      try {
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (temporaryExists) {
        const cleanup = await this.cleanupPath(temporaryPath);
        if (cleanup.remaining) {
          throw new Error(
            `could not prepare artifact temporary file: ${error instanceof Error ? error.message : String(error)}; possible residual path: ${temporaryPath}; cleanup error: ${cleanup.error}`,
          );
        }
      }
      throw new Error(`could not prepare artifact temporary file: ${error instanceof Error ? error.message : String(error)}`);
    }

    let published = false;
    // A hard link publishes the completed inode atomically and fails with
    // EEXIST instead of replacing an existing artifact.
    try {
      await this.fileOperations.link(temporaryPath, finalPath);
      published = true;
    } catch (error) {
      const cleanup = await this.cleanupPath(temporaryPath);
      const residual = cleanup.remaining ? ` Possible residual path: ${temporaryPath}; cleanup error: ${cleanup.error}.` : "";
      if (errorCode(error) === "EEXIST") {
        throw new ArtifactValidationError(`artifact already exists and overwrite is disabled: ${input.filename}.${residual}`);
      }
      throw new Error(`could not publish artifact atomically: ${error instanceof Error ? error.message : String(error)}.${residual}`);
    }

    try {
      await this.fileOperations.unlink(temporaryPath);
      temporaryExists = false;
    } catch (error) {
      const finalCleanup = await this.cleanupPath(finalPath);
      const temporaryCleanup = await this.cleanupPath(temporaryPath);
      published = finalCleanup.remaining;
      temporaryExists = temporaryCleanup.remaining;
      const residualPaths = [
        ...(published ? [finalPath] : []),
        ...(temporaryExists ? [temporaryPath] : []),
      ];
      const cleanupErrors = [finalCleanup.error, temporaryCleanup.error].filter((value): value is string => value !== undefined);
      throw new Error(
        `artifact publication failed after atomic link because the temporary link could not be removed: ${error instanceof Error ? error.message : String(error)}. ` +
        `Rollback attempted; possible residual paths: ${residualPaths.length > 0 ? residualPaths.join(", ") : "none"}.` +
        (cleanupErrors.length > 0 ? ` Cleanup errors: ${cleanupErrors.join("; ")}.` : ""),
      );
    }

    if (!published || temporaryExists) {
      throw new Error("artifact publication ended in an inconsistent state and was not reported as successful.");
    }

    return { path: finalPath, filename: input.filename, bytes: data.byteLength, sha256 };
  }
}
