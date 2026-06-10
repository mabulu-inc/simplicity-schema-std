import { execSync } from 'node:child_process';

/**
 * Bring the postgres container up before any tests run, and tear it back
 * down once they finish — but only if this run is what started it. If the
 * container was already running (an interactive psql session, a parallel
 * tool), leave it alone. Mirrors @smplcty/schema-flow's own e2e harness.
 */
function isContainerRunning(): boolean {
  try {
    const out = execSync('docker compose ps -q postgres', { encoding: 'utf-8' });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

export default function globalSetup(): () => void {
  const wasRunningBeforeTests = isContainerRunning();
  // `up -d --wait` is idempotent: a no-op when already healthy, blocks until
  // ready otherwise.
  execSync('docker compose up -d --wait', { stdio: 'inherit' });

  let tornDown = false;
  const teardown = (): void => {
    if (tornDown) return;
    tornDown = true;
    if (wasRunningBeforeTests) return;
    try {
      execSync('docker compose down', { stdio: 'inherit' });
    } catch (err) {
      console.error('[globalTeardown] docker compose down failed:', err);
    }
  };

  // Cover the Ctrl+C path: vitest fires process.exit() ~1ms after the signal,
  // so run docker-down synchronously first (execSync blocks the event loop).
  const onSignal = (signal: NodeJS.Signals): void => {
    teardown();
    const code = signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1;
    process.exit(process.exitCode ?? code);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  process.once('exit', teardown);

  return teardown;
}
