import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const supportedTasks = new Set(['build', 'lint', 'test', 'typecheck']);
const task = process.argv[2];

if (!task || !supportedTasks.has(task)) {
  console.error(`Expected one of: ${[...supportedTasks].join(', ')}`);
  process.exit(2);
}

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('This script must be run through an npm script so npm_execpath is available.');
  process.exit(2);
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const workspaces = [
  'packages/contracts',
  'packages/config',
  'packages/database',
  'apps/api',
  'apps/worker',
  'apps/web',
];

function runWorkspaceTask(workspace, workspaceTask) {
  console.log(`\n> ${workspace}: ${workspaceTask}`);

  const result = spawnSync(process.execPath, [npmCli, 'run', workspaceTask, '--if-present'], {
    cwd: path.join(repositoryRoot, workspace),
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Type checks and tests import the compiled package entry points just as production does.
if (task === 'test' || task === 'typecheck') {
  runWorkspaceTask('packages/contracts', 'build');
  runWorkspaceTask('packages/config', 'build');
  runWorkspaceTask('packages/database', 'build');
}

for (const workspace of workspaces) {
  runWorkspaceTask(workspace, task);
}
