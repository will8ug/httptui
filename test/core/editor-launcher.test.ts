import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SuspendTerminal } from 'ink';

import {
  launchEditor,
  parseEditorCommand,
  resolveEditorCommand,
  runEditorHandoff,
} from '../../src/core/editor-launcher';

describe('resolveEditorCommand — precedence', () => {
  it('prefers VISUAL over EDITOR', () => {
    expect(resolveEditorCommand({ VISUAL: 'vim', EDITOR: 'nano' })).toBe('vim');
  });

  it('uses EDITOR when VISUAL is unset', () => {
    expect(resolveEditorCommand({ EDITOR: 'nano' })).toBe('nano');
  });

  it('treats an empty VISUAL as unset and falls back to EDITOR', () => {
    expect(resolveEditorCommand({ VISUAL: '', EDITOR: 'nano' })).toBe('nano');
  });

  it('falls back to the platform default when neither variable is set', () => {
    expect(resolveEditorCommand({})).toBe(process.platform === 'win32' ? 'notepad' : 'vi');
  });

  it('prefers the config editor over VISUAL and EDITOR', () => {
    expect(resolveEditorCommand({ VISUAL: 'vim', EDITOR: 'nano' }, 'code --wait')).toBe(
      'code --wait',
    );
  });

  it('treats a whitespace-only config editor as unset and falls back to VISUAL', () => {
    expect(resolveEditorCommand({ VISUAL: 'vim' }, '   ')).toBe('vim');
  });

  it('treats an empty config editor as unset and falls back to VISUAL', () => {
    expect(resolveEditorCommand({ VISUAL: 'vim' }, '')).toBe('vim');
  });
});

describe('parseEditorCommand — whitespace splitting', () => {
  it('splits a value with arguments into tokens', () => {
    expect(parseEditorCommand('code --wait')).toEqual(['code', '--wait']);
  });

  it('returns a bare command as a single token', () => {
    expect(parseEditorCommand('vim')).toEqual(['vim']);
  });

  it('collapses surrounding and repeated whitespace', () => {
    expect(parseEditorCommand('  code \t --wait  ')).toEqual(['code', '--wait']);
  });
});

describe('launchEditor — launch failure vs exit status', () => {
  it('rejects when the command does not exist', async () => {
    await expect(launchEditor('httptui-nonexistent-editor-xyz', 'api.http')).rejects.toThrow();
  });

  it('rejects when a value with arguments names a missing executable', async () => {
    await expect(
      launchEditor('httptui-nonexistent-editor-xyz --wait', 'api.http'),
    ).rejects.toThrow();
  });

  it('launches editor arguments ahead of the file path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'httptui-editor-launcher-'));
    try {
      const dumpPath = join(dir, 'argv.txt');
      const scriptPath = join(dir, 'fake-editor.sh');
      writeFileSync(
        scriptPath,
        `#!/bin/sh\nprintf '%s\\n' "$@" > '${dumpPath}'\n`,
        { mode: 0o755 },
      );
      chmodSync(scriptPath, 0o755);
      await launchEditor(`${scriptPath} --wait`, 'api.http');
      expect(readFileSync(dumpPath, 'utf8')).toBe('--wait\napi.http\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolves when the command runs and exits non-zero', async () => {
    // The file path is passed verbatim as the child's only argv element, so a
    // node eval flag doubles as a deterministic non-zero exit (vim's :cq case).
    await expect(
      launchEditor(process.execPath, '--eval=process.exit(1)'),
    ).resolves.toBeUndefined();
  });
});

describe('runEditorHandoff — launcher substitution', () => {
  it('runs the injected launcher inside suspend with the resolved command and file path', async () => {
    let launched: { command: string; filePath: string } | undefined;
    let suspendRan = false;

    await runEditorHandoff({
      filePath: 'api.http',
      // SuspendTerminal is overloaded; a callback-only stand-in suffices.
      suspend: (async (run: () => Promise<void>) => {
        suspendRan = true;
        await run();
      }) as unknown as SuspendTerminal,
      launch: async (command, filePath) => {
        launched = { command, filePath };
      },
    });

    expect(suspendRan).toBe(true);
    expect(launched).toEqual({ command: resolveEditorCommand(), filePath: 'api.http' });
  });

  it('runs the injected launcher with the editor option as the command', async () => {
    let launched: { command: string; filePath: string } | undefined;

    await runEditorHandoff({
      filePath: 'api.http',
      editor: 'my-ed --flag',
      suspend: (async (run: () => Promise<void>) => {
        await run();
      }) as unknown as SuspendTerminal,
      launch: async (command, filePath) => {
        launched = { command, filePath };
      },
    });

    expect(launched).toEqual({ command: 'my-ed --flag', filePath: 'api.http' });
  });
});
