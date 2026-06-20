import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The local restore command is disabled in production.');
}

if (!process.argv.includes('--confirm-local')) {
  throw new Error('Restore is destructive. Re-run with --confirm-local after checking the file.');
}

const backupArgument = process.argv.find(
  (argument) => !argument.startsWith('--') && argument.endsWith('.sql'),
);

if (!backupArgument) {
  throw new Error('Provide the SQL backup path to restore.');
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupPath = path.resolve(repositoryRoot, backupArgument);

if (!existsSync(backupPath)) {
  throw new Error(`Backup file does not exist: ${backupPath}`);
}

const databaseName = process.env.POSTGRES_DB ?? 'buzzytrip';
const databaseUser = process.env.POSTGRES_USER ?? 'buzzytrip';

const terminateConnections = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'database',
    'psql',
    '--username',
    databaseUser,
    '--dbname',
    'postgres',
    '--command',
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${databaseName}' and pid <> pg_backend_pid();`,
  ],
  { cwd: repositoryRoot, stdio: 'inherit' },
);

if (terminateConnections.error || terminateConnections.status !== 0) {
  throw terminateConnections.error ?? new Error('Could not terminate local database connections.');
}

const inputHandle = openSync(backupPath, 'r');
const restore = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'database',
    'psql',
    '--username',
    databaseUser,
    '--dbname',
    'postgres',
    '--set',
    'ON_ERROR_STOP=1',
  ],
  {
    cwd: repositoryRoot,
    stdio: [inputHandle, 'inherit', 'inherit'],
  },
);

closeSync(inputHandle);

if (restore.error || restore.status !== 0) {
  throw restore.error ?? new Error(`Database restore failed with exit code ${restore.status}.`);
}

console.log(`Restored ${path.relative(repositoryRoot, backupPath)} into the local database.`);
