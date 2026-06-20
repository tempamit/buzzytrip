import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDirectory = path.join(repositoryRoot, 'backups');
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const outputArgumentIndex = process.argv.indexOf('--output');
const requestedOutput =
  outputArgumentIndex >= 0 ? process.argv[outputArgumentIndex + 1] : undefined;
const outputPath = requestedOutput
  ? path.resolve(repositoryRoot, requestedOutput)
  : path.join(backupDirectory, `buzzytrip-${timestamp}.sql`);

mkdirSync(path.dirname(outputPath), { recursive: true });

const databaseName = process.env.POSTGRES_DB ?? 'buzzytrip';
const databaseUser = process.env.POSTGRES_USER ?? 'buzzytrip';
const outputHandle = openSync(outputPath, 'w');

const result = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'database',
    'pg_dump',
    '--username',
    databaseUser,
    '--dbname',
    databaseName,
    '--clean',
    '--if-exists',
    '--create',
    '--no-owner',
    '--no-privileges',
  ],
  {
    cwd: repositoryRoot,
    stdio: ['ignore', outputHandle, 'inherit'],
  },
);

closeSync(outputHandle);

if (result.error || result.status !== 0) {
  rmSync(outputPath, { force: true });
  throw result.error ?? new Error(`Database backup failed with exit code ${result.status}.`);
}

console.log(path.relative(repositoryRoot, outputPath));
