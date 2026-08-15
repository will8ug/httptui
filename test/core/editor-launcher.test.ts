import { describe, expect, it } from 'vitest';
import type { SuspendTerminal } from 'ink';

import {
  launchEditor,
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
});

describe('launchEditor — launch failure vs exit status', () => {
  it('rejects when the command does not exist', async () => {
    await expect(launchEditor('httptui-nonexistent-editor-xyz', 'api.http')).rejects.toThrow();
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
});
