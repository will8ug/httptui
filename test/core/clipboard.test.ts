import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ClipboardError,
  copyToClipboard,
  readFromClipboard,
  spawnClipboardReadTool,
  spawnClipboardTool,
  type ClipboardReadRunner,
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

interface RecordedReadCall {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv | undefined;
}

function recordingReadRunner(
  outputs: ReadonlyMap<string, string> = new Map(),
  failures: ReadonlyMap<string, Error> = new Map(),
): { calls: RecordedReadCall[]; runner: ClipboardReadRunner } {
  const calls: RecordedReadCall[] = [];
  const runner: ClipboardReadRunner = async (command, args, env) => {
    calls.push({ command, args, env });
    const failure = failures.get(command);
    if (failure !== undefined) {
      throw failure;
    }
    return outputs.get(command) ?? '';
  };
  return { calls, runner };
}

function captureError(promise: Promise<unknown>): Promise<unknown> {
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
  it('spawns powershell -NoProfile -Command with base64-decoded multi-byte UTF-8 piped to Set-Clipboard, using no stdin', async () => {
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

describe('readFromClipboard — darwin', () => {
  it('spawns pbpaste with LC_CTYPE=UTF-8 merged into the environment and returns its stdout', async () => {
    const output = `curl 'https://api.example.com'\n`;
    const { calls, runner } = recordingReadRunner(new Map([['pbpaste', output]]));

    const text = await readFromClipboard({
      readRunner: runner,
      platform: 'darwin',
      env: { PATH: '/usr/bin:/bin', HOME: '/home/u' },
    });

    expect(calls).toEqual([
      {
        command: 'pbpaste',
        args: [],
        env: { PATH: '/usr/bin:/bin', HOME: '/home/u', LC_CTYPE: 'UTF-8' },
      },
    ]);
    expect(text).toBe(output);
  });

  it('returns stdout verbatim, keeping the trailing newline', async () => {
    const { runner } = recordingReadRunner(
      new Map([['pbpaste', `curl 'https://api.example.com' --data-raw '{\n  "name": "Alice"\n}'\n`]]),
    );

    await expect(readFromClipboard({ readRunner: runner, platform: 'darwin', env: {} })).resolves.toBe(
      `curl 'https://api.example.com' --data-raw '{\n  "name": "Alice"\n}'\n`,
    );
  });

  it('resolves an empty string for an empty clipboard instead of treating it as failure', async () => {
    const { calls, runner } = recordingReadRunner();

    await expect(readFromClipboard({ readRunner: runner, platform: 'darwin', env: {} })).resolves.toBe('');

    expect(calls).toHaveLength(1);
  });

  it('throws a ClipboardError naming pbpaste when it cannot be spawned', async () => {
    const { runner } = recordingReadRunner(new Map(), new Map([['pbpaste', enoent('pbpaste')]]));

    const error = asClipboardError(
      await captureError(readFromClipboard({ readRunner: runner, platform: 'darwin', env: {} })),
    );

    expect(error.name).toBe('ClipboardError');
    expect(error.message).toMatch(/pbpaste/);
  });
});

describe('readFromClipboard — win32', () => {
  it('spawns powershell -NoProfile -Command with UTF-8 output encoding and Get-Clipboard -Raw, returning multi-byte stdout', async () => {
    const output = `curl 'https://api.example.com/送信' --data-raw '{"名前":"Alice"}'`;
    const { calls, runner } = recordingReadRunner(new Map([['powershell', output]]));

    const text = await readFromClipboard({ readRunner: runner, platform: 'win32', env: {} });

    expect(calls).toEqual([
      {
        command: 'powershell',
        args: [
          '-NoProfile',
          '-Command',
          '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Clipboard -Raw',
        ],
        env: undefined,
      },
    ]);
    expect(text).toBe(output);
  });

  it('throws a ClipboardError naming PowerShell when it cannot be spawned', async () => {
    const { runner } = recordingReadRunner(new Map(), new Map([['powershell', enoent('powershell')]]));

    const error = asClipboardError(
      await captureError(readFromClipboard({ readRunner: runner, platform: 'win32', env: {} })),
    );

    expect(error.message).toMatch(/PowerShell/);
  });
});

describe('readFromClipboard — linux', () => {
  it('prefers wl-paste when WAYLAND_DISPLAY is set and stops after it succeeds', async () => {
    const { calls, runner } = recordingReadRunner(new Map([['wl-paste', 'curl wl\n']]));

    const text = await readFromClipboard({
      readRunner: runner,
      platform: 'linux',
      env: { WAYLAND_DISPLAY: 'wayland-0' },
    });

    expect(calls).toEqual([{ command: 'wl-paste', args: [], env: undefined }]);
    expect(text).toBe('curl wl\n');
  });

  it('skips wl-paste when WAYLAND_DISPLAY is unset and spawns xclip -selection clipboard -o', async () => {
    const { calls, runner } = recordingReadRunner(new Map([['xclip', 'curl x11\n']]));

    const text = await readFromClipboard({ readRunner: runner, platform: 'linux', env: {} });

    expect(calls).toEqual([
      { command: 'xclip', args: ['-selection', 'clipboard', '-o'], env: undefined },
    ]);
    expect(text).toBe('curl x11\n');
  });

  it('falls through an xclip spawn failure to xsel --clipboard --output and returns its stdout', async () => {
    const { calls, runner } = recordingReadRunner(
      new Map([['xsel', 'curl xsel\n']]),
      new Map([['xclip', enoent('xclip')]]),
    );

    await expect(readFromClipboard({ readRunner: runner, platform: 'linux', env: {} })).resolves.toBe(
      'curl xsel\n',
    );

    expect(calls.map((call) => call.command)).toEqual(['xclip', 'xsel']);
    expect(calls[1]?.args).toEqual(['--clipboard', '--output']);
  });

  it('treats a non-zero exit as failure and succeeds via the next tool', async () => {
    const { calls, runner } = recordingReadRunner(
      new Map(),
      new Map([['wl-paste', new Error('wl-paste exited with status 1')]]),
    );

    await expect(
      readFromClipboard({ readRunner: runner, platform: 'linux', env: { WAYLAND_DISPLAY: 'wayland-0' } }),
    ).resolves.toBe('');

    expect(calls.map((call) => call.command)).toEqual(['wl-paste', 'xclip']);
  });

  it('throws a ClipboardError naming installable tools when every candidate fails', async () => {
    const { calls, runner } = recordingReadRunner(
      new Map(),
      new Map([
        ['wl-paste', enoent('wl-paste')],
        ['xclip', enoent('xclip')],
        ['xsel', enoent('xsel')],
      ]),
    );

    const error = asClipboardError(
      await captureError(
        readFromClipboard({
          readRunner: runner,
          platform: 'linux',
          env: { WAYLAND_DISPLAY: 'wayland-0' },
        }),
      ),
    );

    expect(calls.map((call) => call.command)).toEqual(['wl-paste', 'xclip', 'xsel']);
    expect(error.message).toMatch(/xclip/);
    expect(error.message).toMatch(/xsel/);
    expect(error.message).toMatch(/wl-clipboard/);
  });
});

describe('readFromClipboard — unsupported platform', () => {
  it('throws a ClipboardError without spawning anything', async () => {
    const { calls, runner } = recordingReadRunner();

    const error = asClipboardError(
      await captureError(readFromClipboard({ readRunner: runner, platform: 'freebsd', env: {} })),
    );

    expect(calls).toEqual([]);
    expect(error.message).toMatch(/freebsd/);
  });
});

describe('spawnClipboardReadTool — real child process', () => {
  it('rejects when the tool cannot be spawned', async () => {
    await expect(spawnClipboardReadTool('httptui-nonexistent-tool-xyz', [])).rejects.toThrow();
  });

  it('captures stdout verbatim, multi-byte characters and trailing newline included', async () => {
    const output = `curl 'https://api.example.com/送信'\n`;
    const script = `process.stdout.write(${JSON.stringify(output)});`;

    await expect(spawnClipboardReadTool(process.execPath, ['-e', script])).resolves.toBe(output);
  });

  it('rejects when the tool exits non-zero', async () => {
    await expect(spawnClipboardReadTool(process.execPath, ['-e', 'process.exit(3)'])).rejects.toThrow(
      /status 3/,
    );
  });
});
