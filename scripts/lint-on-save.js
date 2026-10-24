#!/usr/bin/env node
// PostToolUse hook for the quality-crew plugin.
// Reads the hook payload from stdin, and if the edited file is JavaScript,
// runs the project's own ESLint with --fix on it. Remaining problems are
// sent back to Claude (exit code 2) so it can fix them; a project without
// ESLint is skipped silently.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findEslint(startDir) {
  let dir = startDir;
  while (true) {
    const bin = path.join(dir, 'node_modules', '.bin', 'eslint');
    if (fs.existsSync(bin)) return { bin, root: dir };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(input); } catch { process.exit(0); }

  const file = payload.tool_input && payload.tool_input.file_path;
  if (!file || !/\.(c|m)?js$/.test(file) || !fs.existsSync(file)) process.exit(0);

  const eslint = findEslint(path.dirname(path.resolve(file)));
  if (!eslint) process.exit(0);

  const result = spawnSync(eslint.bin, ['--fix', path.resolve(file)], {
    cwd: eslint.root,
    encoding: 'utf8',
  });

  if (result.status === 0) process.exit(0);
  // ESLint could not fix everything: hand the report to Claude.
  process.stderr.write(`ESLint found problems in ${file} that --fix could not solve:\n${result.stdout}${result.stderr}`);
  process.exit(2);
});
