import { defineConfig } from 'drizzle-kit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const localDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_local@127.0.0.1:55432/buzzytrip';
const packageRoot = path.dirname(fileURLToPath(import.meta.url));

function relativeFromCommandDirectory(...segments: string[]): string {
  const relativePath = path.relative(process.cwd(), path.join(packageRoot, ...segments));
  const portablePath = relativePath.split(path.sep).join('/');
  return portablePath.startsWith('.') ? portablePath : `./${portablePath}`;
}

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
  dialect: 'postgresql',
  out: relativeFromCommandDirectory('drizzle'),
  schema: relativeFromCommandDirectory('src', 'schema.ts'),
  strict: true,
  verbose: true,
});
