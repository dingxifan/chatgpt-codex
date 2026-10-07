// Local build provenance, not a release registry or proof of a running process.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bridge');
const recordPath = path.join(root, 'dist/build-info.json');
if (process.argv.slice(2).some(arg => arg !== '--verify')) throw new Error('Usage: node scripts/Build-Info.mjs [--verify]');
function tree(relative) {
  return readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const file = `${relative}/${entry.name}`;
    return entry.isDirectory() ? tree(file) : [file];
  });
}
function hashes(files) {
  return Object.fromEntries(files.sort().map(file => [file, createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex')]));
}
const source = hashes([...tree('src'), '../scripts/Build-Info.mjs', 'package.json', 'package-lock.json', 'tsconfig.json']);
const output = hashes(tree('dist').filter(file => file !== 'dist/build-info.json'));
if (process.argv.includes('--verify')) {
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  if (record.schemaVersion !== 1 || JSON.stringify(record.source) !== JSON.stringify(source) || JSON.stringify(record.output) !== JSON.stringify(output)) {
    throw new Error('BUILD_MISMATCH: source or output differs from build-info.json; rebuild before starting or staging this copy.');
  }
  console.log(`BUILD_VERIFIED: commit=${record.commit ?? 'unavailable'}; dirty=${record.dirty ?? 'unavailable'}; bridge=${record.bridgeVersion}`);
} else {
  let commit = null;
  let dirty = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch { /* A downloaded source tree has no Git identity; keep that explicit. */ }
  const bridgeVersion = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  writeFileSync(recordPath, JSON.stringify({ schemaVersion: 1, commit, dirty, bridgeVersion, source, output }, null, 2) + '\n');
  console.log(`BUILD_RECORDED: ${recordPath}`);
}
