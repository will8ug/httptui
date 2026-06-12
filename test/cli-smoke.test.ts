import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

function runCli(args: string[], timeoutMs = 2_000, envOverrides: Record<string, string> = {}): Promise<CliRunResult> {
  return new Promise((resolve) => {
    const child = spawn(nodeExecutable, [builtCliRelativePath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, NO_COLOR: '1', ...envOverrides },
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

type InteractiveCliOptions = {
  killAfterMs?: number;
  forceKillAfterMs?: number;
  waitForStderr?: string;
  envOverrides?: Record<string, string>;
};

function runInteractiveCliWithKill(
  args: string[],
  options: InteractiveCliOptions = {},
): Promise<KilledCliRunResult> {
  const { killAfterMs = 500, forceKillAfterMs = 2_000, waitForStderr, envOverrides = {} } = options;

  return new Promise((resolve) => {
    const child = spawn(nodeExecutable, ['--import', ttyPreloadModule, builtCliRelativePath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, NO_COLOR: '1', ...envOverrides },
    });

    let stdout = '';
    let stderr = '';
    let wasAliveAtKill = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const performKill = (): void => {
      wasAliveAtKill = child.exitCode === null && !child.killed;

      if (wasAliveAtKill) {
        child.kill('SIGTERM');
      }
    };

    if (!waitForStderr) {
      killTimer = setTimeout(performKill, killAfterMs);
    }

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

      if (waitForStderr && stderr.includes(waitForStderr)) {
        performKill();
      }
    });

    child.on('close', (code, signal) => {
      if (killTimer) clearTimeout(killTimer);
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
    const result = await runInteractiveCliWithKill(['--insecure', 'examples/basic.http'], {
      waitForStderr: 'TLS certificate verification disabled',
    });

    expect(result.wasAliveAtKill).toBe(true);
    expect(stripAnsi(result.stderr)).toContain('TLS certificate verification disabled');
  });

  it('exits with error when both --env and --env-name are specified', async () => {
    const result = await runCli(['--env', 'dev.json', '--env-name', 'Development', 'examples/basic.http']);

    expect(result.code).toBe(1);
    expect(stripAnsi(result.stderr)).toContain('only one of --env and --env-name can be specified');
  });

  it('exits with error when --env-name is used but no environments are configured', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-noenv-'));
    try {
      const emptyConfig = join(tmpDir, 'empty-config.json');
      writeFileSync(emptyConfig, JSON.stringify({}));

      const result = await runCli(
        ['--env-name', 'Development', 'examples/basic.http'],
        2_000,
        { HTTP_TUI_CONFIG: emptyConfig },
      );

      expect(result.code).toBe(1);
      expect(stripAnsi(result.stderr)).toContain('no environments configured in config file');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('exits with error when --env-name references a non-existent environment name', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-test-'));
    try {
      const tmpHttp = join(tmpDir, 'test.http');
      const tmpConfig = join(tmpDir, '.httptui.json');
      writeFileSync(tmpHttp, 'GET https://example.com\n');
      writeFileSync(tmpConfig, JSON.stringify({
        environments: [
          { name: 'Development', file: 'env/dev.json' },
        ],
      }));

      const result = await runCli(['--env-name', 'NonExistent', tmpHttp]);

      expect(result.code).toBe(1);
      expect(stripAnsi(result.stderr)).toContain('Environment not found in config');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('resolves env file relative to global config dir when project config exists without environments', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-envtest-'));
    try {
      const configDir = join(tmpDir, 'config');
      const envDir = join(configDir, 'env');
      const projectDir = join(tmpDir, 'project');

      mkdirSync(envDir, { recursive: true });
      mkdirSync(projectDir, { recursive: true });

      const tmpHttp = join(projectDir, 'test.http');
      writeFileSync(tmpHttp, 'GET https://example.com\n');

      writeFileSync(join(configDir, 'config.json'), JSON.stringify({
        environments: [{ name: 'Development', file: 'env/dev.json' }],
      }));

      writeFileSync(join(projectDir, '.httptui.json'), JSON.stringify({
        certificates: {},
      }));

      writeFileSync(join(envDir, 'dev.json'), JSON.stringify({
        name: 'Development',
        values: [{ key: 'baseUrl', value: 'https://api.dev.com' }],
      }));

      const result = await runInteractiveCliWithKill(
        ['--env-name', 'Development', tmpHttp],
        { envOverrides: { HTTP_TUI_CONFIG: configDir } },
      );

      expect(result.wasAliveAtKill).toBe(true);
      expect(stripAnsi(result.stderr)).not.toContain('Environment file not found');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
