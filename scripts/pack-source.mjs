import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error('Source packaging failed: git ' + args[0]);
  }
  return result.stdout.trim();
}

try {
  const commit = git(['rev-parse', '--short=12', 'HEAD']);
  const relative = `artifacts/mundo-potterhead-source-${commit}.zip`;
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  git(['archive', '--format=zip', '--prefix=mundo-potterhead/', '--output=' + relative, 'HEAD']);
  console.log(`${relative} (${statSync(join(root, relative)).size} bytes). Committed HEAD only; local edits are excluded.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Source packaging failed.');
  process.exitCode = 1;
}
