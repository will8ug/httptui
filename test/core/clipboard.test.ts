import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ClipboardError,
  copyToClipboard,
  spawnClipboardTool,
  type ClipboardRunner,
} from '../../src/core/clipboard';

interface RecordedCall {
  command: string;
  args: string[];
  input: string;
  env: NodeJS.ProcessEnv | undefined;
}

function enoent(command: string): Error {
  return Object.assign(new Error(`spawn ${command} ENOENT`), { code: 'ENOENT' });
}

function recordingRunner(
  failures: ReadonlyMap<string, Error> = new Map(),
): { calls: RecordedCall[]; runner: ClipboardRunner } {
  const calls: RecordedCall[] = [];
  const runner: ClipboardRunner = async (command, args, input, env) => {
    calls.push({ command, args, input, env });
    const failure = failures.get(command);
    if (failure !== undefined) {
      throw failure;
    }
  };
  return { calls, runner };
}

function captureError(promise: Promise<void>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

function asClipboardError(error: unknown): ClipboardError {
  if (!(error instanceof ClipboardError)) {
    throw new Error(`expected ClipboardError, got ${String(error)}`);
  }
  return error;
}

describe('copyToClipboard — darwin', () => {
  it('spawns pbcopy with LC_CTYPE=UTF-8 merged into the environment', async () => {
    const { calls, runner } = recordingRunner();

    await copyToClipboard('curl', {
      runner,
      platform: 'darwin',
      env: { PATH: '/usr/bin:/bin', HOME: '/home/u' },
    });

    expect(calls).toEqual([
      {
        command: 'pbcopy',
        args: [],
        input: 'curl',
        env: { PATH: '/usr/bin:/bin', HOME: '/home/u', LC_CTYPE: 'UTF-8' },
      },
    ]);
  });

  it('writes multi-line text to pbcopy stdin verbatim, appending no trailing newline', async () => {
    const text = `curl 'https://api.example.com' --data-raw '{\n  "name": "Alice"\n}'`;
    const { calls, runner } = recordingRunner();

    await copyToClipboard(text, { runner, platform: 'darwin', env: {} });

    expect(calls[0]?.input).toBe(text);
  });

  it('throws a ClipboardError naming pbcopy when it cannot be spawned', async () => {
    const { runner } = recordingRunner(new Map([['pbcopy', enoent('pbcopy')]]));

    const error = asClipboardError(
      await captureError(copyToClipboard('curl', { runner, platform: 'darwin', env: {} })),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ClipboardError');
    expect(error.message).toMatch(/pbcopy/);
  });
});

describe('copyToClipboard — win32', () => {
  it('spawns powershell -NoProfile -Command with base64-decoded UTF-8 piped to Set-Clipboard, using no stdin', async () => {
    const text = `curl 'https://api.example.com/送信' --data-raw '{"名前":"Alice"}'`;
    const { calls, runner } = recordingRunner();

    await copyToClipboard(text, { runner, platform: 'win32', env: {} });

    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.command).toBe('powershell');
    expect(call?.args.slice(0, 2)).toEqual(['-NoProfile', '-Command']);
    expect(call?.input).toBe('');

    const script = call?.args[2] ?? '';
    expect(script).toMatch(
      /^\[Text\.Encoding\]::UTF8\.GetString\(\[Convert\]::FromBase64String\('[^']*'\)\) \| Set-Clipboard$/,
    );
    const base64 = script.match(/FromBase64String\('([^']*)'\)/)?.[1];
    expect(Buffer.from(base64 ?? '', 'base64').toString('utf8')).toBe(text);
  });

  it('throws a ClipboardError naming PowerShell when it cannot be spawned', async () => {
    const { runner } = recordingRunner(new Map([['powershell', enoent('powershell')]]));

    const error = asClipboardError(
      await captureError(copyToClipboard('curl', { runner, platform: 'win32', env: {} })),
    );

    expect(error.message).toMatch(/PowerShell/);
  });
});

describe('copyToClipboard — linux', () => {
  it('prefers wl-copy when WAYLAND_DISPLAY is set and stops after it succeeds', async () => {
    const { calls, runner } = recordingRunner();

    await copyToClipboard('curl', {
      runner,
      platform: 'linux',
      env: { WAYLAND_DISPLAY: 'wayland-0' },
    });

    expect(calls).toEqual([{ command: 'wl-copy', args: [], input: 'curl', env: undefined }]);
  });

  it('skips wl-copy when WAYLAND_DISPLAY is unset and spawns xclip -selection clipboard', async () => {
    const { calls, runner } = recordingRunner();

    await copyToClipboard('curl', { runner, platform: 'linux', env: {} });

    expect(calls).toEqual([
      { command: 'xclip', args: ['-selection', 'clipboard'], input: 'curl', env: undefined },
    ]);
  });

  it('falls through an xclip spawn failure to xsel --clipboard --input with the text on stdin', async () => {
    const { calls, runner } = recordingRunner(new Map([['xclip', enoent('xclip')]]));

    await expect(copyToClipboard('curl', { runner, platform: 'linux', env: {} })).resolves.toBeUndefined();

    expect(calls.map((call) => call.command)).toEqual(['xclip', 'xsel']);
    expect(calls[1]?.args).toEqual(['--clipboard', '--input']);
    expect(calls[1]?.input).toBe('curl');
  });

  it('treats a non-zero exit as failure and succeeds via the next tool', async () => {
    const { calls, runner } = recordingRunner(
      new Map([['wl-copy', new Error('wl-copy exited with status 1')]]),
    );

    await expect(
      copyToClipboard('curl', { runner, platform: 'linux', env: { WAYLAND_DISPLAY: 'wayland-0' } }),
    ).resolves.toBeUndefined();

    expect(calls.map((call) => call.command)).toEqual(['wl-copy', 'xclip']);
  });

  it('throws a ClipboardError naming installable tools when every candidate fails', async () => {
    const { calls, runner } = recordingRunner(
      new Map([
        ['wl-copy', enoent('wl-copy')],
        ['xclip', enoent('xclip')],
        ['xsel', enoent('xsel')],
      ]),
    );

    const error = asClipboardError(
      await captureError(
        copyToClipboard('curl', {
          runner,
          platform: 'linux',
          env: { WAYLAND_DISPLAY: 'wayland-0' },
        }),
      ),
    );

    expect(calls.map((call) => call.command)).toEqual(['wl-copy', 'xclip', 'xsel']);
    expect(error.message).toMatch(/xclip/);
    expect(error.message).toMatch(/xsel/);
    expect(error.message).toMatch(/wl-clipboard/);
  });
});

describe('copyToClipboard — unsupported platform', () => {
  it('throws a ClipboardError without spawning anything', async () => {
    const { calls, runner } = recordingRunner();

    const error = asClipboardError(
      await captureError(copyToClipboard('curl', { runner, platform: 'freebsd', env: {} })),
    );

    expect(calls).toEqual([]);
    expect(error.message).toMatch(/freebsd/);
  });
});

describe('spawnClipboardTool — real child process', () => {
  it('rejects when the tool cannot be spawned', async () => {
    await expect(spawnClipboardTool('httptui-nonexistent-tool-xyz', [], 'text')).rejects.toThrow();
  });

  it('writes stdin verbatim and resolves when the tool exits 0', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'httptui-clipboard-'));
    try {
      const dumpPath = join(dir, 'stdin.txt');
      const script = [
        'let data = "";',
        'process.stdin.on("data", (chunk) => { data += chunk; });',
        'process.stdin.on("end", () => {',
        `  require("node:fs").writeFileSync(${JSON.stringify(dumpPath)}, data);`,
        '});',
      ].join(' ');

      await spawnClipboardTool(process.execPath, ['-e', script], 'line one\nline two');

      expect(readFileSync(dumpPath, 'utf8')).toBe('line one\nline two');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects when the tool exits non-zero', async () => {
    await expect(spawnClipboardTool(process.execPath, ['-e', 'process.exit(3)'], '')).rejects.toThrow(
      /status 3/,
    );
  });
});
