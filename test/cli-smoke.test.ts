import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type CliRunResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
};

type KilledCliRunResult = CliRunResult & {
  wasAliveAtKill: boolean;
};

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const builtCliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const builtCliRelativePath = 'dist/cli.js';
const nodeExecutable = process.execPath;
const ttyPreloadModule = createTtyPreloadModule();

if (!existsSync(builtCliPath)) {
  throw new Error(
    'Built CLI not found at dist/cli.js. Run npm run build before running test/cli-smoke.test.ts.',
  );
}

function createTtyPreloadModule(): string {
  const source = [
    "Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });",
    'process.stdin.setRawMode ??= () => {};',
    'process.stdin.ref ??= () => {};',
    'process.stdin.unref ??= () => {};',
  ].join('');

  return `data:text/javascript,${encodeURIComponent(source)}`;
}

function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally matching ANSI escape sequences
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

function runCli(args: string[], timeoutMs = 2_000): Promise<CliRunResult> {
  return new Promise((resolve) => {
    const child = spawn(nodeExecutable, [builtCliRelativePath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, NO_COLOR: '1' },
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code, signal) => {
      resolve({ code, stdout, stderr, signal });
    });
  });
}

function runInteractiveCliWithKill(
  args: string[],
  killAfterMs = 500,
  forceKillAfterMs = 2_000,
): Promise<KilledCliRunResult> {
  return new Promise((resolve) => {
    const child = spawn(nodeExecutable, ['--import', ttyPreloadModule, builtCliRelativePath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';
    let wasAliveAtKill = false;

    const killTimer = setTimeout(() => {
      wasAliveAtKill = child.exitCode === null && !child.killed;

      if (wasAliveAtKill) {
        child.kill('SIGTERM');
      }
    }, killAfterMs);

    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill('SIGKILL');
      }
    }, forceKillAfterMs);

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code, signal) => {
      clearTimeout(killTimer);
      clearTimeout(forceKillTimer);
      resolve({ code, stdout, stderr, signal, wasAliveAtKill });
    });
  });
}

describe('CLI smoke tests', { timeout: 10_000 }, () => {
  it('no args exits with code 1 and prints usage', async () => {
    const result = await runCli([]);

    expect(result.code).toBe(1);
    expect(stripAnsi(result.stderr)).toContain('Usage: httptui');
  });

  it('missing file exits with code 1 and prints an error', async () => {
    const result = await runCli(['nonexistent.http']);

    expect(result.code).toBe(1);
    expect(stripAnsi(result.stderr)).toContain('File not found');
  });

  it('valid file starts successfully instead of exiting immediately', async () => {
    const result = await runInteractiveCliWithKill(['examples/basic.http']);

    expect(result.wasAliveAtKill).toBe(true);
    expect(result.code).not.toBe(1);
    expect(result.signal === 'SIGTERM' || result.code === 0).toBe(true);
  });

  it('prints the insecure warning to stderr', async () => {
    const result = await runInteractiveCliWithKill(['--insecure', 'examples/basic.http']);

    expect(result.wasAliveAtKill).toBe(true);
    expect(stripAnsi(result.stderr)).toContain('TLS certificate verification disabled');
  });
});
