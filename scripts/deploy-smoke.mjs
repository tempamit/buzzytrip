import { spawnSync } from 'node:child_process';

const composeFiles = ['-f', 'compose.coolify.yaml', '-f', 'compose.smoke.yaml'];
const smokeDatabaseUrl = 'postgresql://buzzytrip:buzzytrip_smoke@database:5432/buzzytrip';
const commandEnvironment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? smokeDatabaseUrl,
};

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    env: commandEnvironment,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`docker ${args.join(' ')} exited with status ${result.status ?? 'unknown'}`);
  }

  return result.stdout?.trim() ?? '';
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForHttp(url, validate, timeoutMilliseconds = 120_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      const body = await response.text();

      if (response.ok && validate(body)) {
        return;
      }

      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await wait(2_000);
  }

  throw new Error(`${url} did not become ready: ${lastError?.message ?? 'unknown error'}`);
}

let smokePassed = false;

try {
  runDocker(['compose', ...composeFiles, 'up', '-d', '--build']);

  await Promise.all([
    waitForHttp('http://127.0.0.1:14000/api/health', (body) => {
      try {
        return JSON.parse(body).status === 'ok';
      } catch {
        return false;
      }
    }),
    waitForHttp('http://127.0.0.1:13000', (body) => body.includes('BuzzyTrip')),
  ]);

  const heartbeatCount = runDocker(
    [
      'compose',
      ...composeFiles,
      'exec',
      '-T',
      'database',
      'psql',
      '-U',
      'buzzytrip',
      '-d',
      'buzzytrip',
      '-tAc',
      "SELECT COUNT(*) FROM service_heartbeats WHERE service = 'worker' AND status = 'ok';",
    ],
    { capture: true },
  );

  if (Number.parseInt(heartbeatCount, 10) < 1) {
    throw new Error('The worker did not persist a healthy heartbeat.');
  }

  smokePassed = true;
  console.log('\nBuzzyTrip container smoke test passed.');
} catch (error) {
  console.error(`\nSmoke test failed: ${error.message}`);

  try {
    runDocker(['compose', ...composeFiles, 'logs', '--no-color', '--tail', '100']);
  } catch (logError) {
    console.error(`Could not collect container logs: ${logError.message}`);
  }
} finally {
  if (process.env.KEEP_SMOKE_STACK === '1') {
    console.log('KEEP_SMOKE_STACK=1; temporary containers were left running.');
  } else {
    try {
      runDocker(['compose', ...composeFiles, 'down', '-v', '--remove-orphans']);
    } catch (cleanupError) {
      console.error(`Smoke-stack cleanup failed: ${cleanupError.message}`);
      smokePassed = false;
    }
  }
}

if (!smokePassed) {
  process.exitCode = 1;
}
