import { describe, expect, it } from 'vitest';

import { HELP_COLUMN_GROUPS, SHORTCUT_GROUP_LABELS, SHORTCUTS } from '../../src/core/shortcuts';

describe('SHORTCUTS registry — edge-jump entries', () => {
  it('contains the `g` entry (jump to top)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'g');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to top of focused panel');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
  });

  it('contains the `G` entry (jump to bottom)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'G');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to bottom of focused panel');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
  });

  it('contains the `0` entry (jump to horizontal start)', () => {
    const entry = SHORTCUTS.find((s) => s.key === '0');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to horizontal start');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
  });

  it('contains the `$` entry (jump to horizontal end)', () => {
    const entry = SHORTCUTS.find((s) => s.key === '$');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to horizontal end');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
  });
});

describe('SHORTCUTS registry — status bar budget', () => {
  it('exposes exactly the 6 expected bar-visible shortcuts in order', () => {
    const barShortcuts = SHORTCUTS.filter((s) => s.showInBar);
    const barKeys = barShortcuts.map((s) => s.key);

    expect(barKeys).toEqual(['Enter', 'h/j/k/l', 'Tab', 'v', 'q', '?']);
  });

  it('none of the edge-jump entries appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);

    expect(barKeys).not.toContain('g');
    expect(barKeys).not.toContain('G');
    expect(barKeys).not.toContain('0');
    expect(barKeys).not.toContain('$');
  });
});

describe('SHORTCUTS registry — env-switch entry', () => {
  it('contains the `E` entry (switch environment)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'E');
    expect(entry).toBeDefined();
    expect(entry?.label).toBe('Env');
    expect(entry?.description).toBe('Switch environment');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('request');
  });

  it('does not appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);
    expect(barKeys).not.toContain('E');
  });
});

describe('SHORTCUTS registry — fullscreen entry', () => {
  it('contains the `f` entry (toggle fullscreen)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'f');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Toggle fullscreen');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('display');
  });

  it('does not appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);
    expect(barKeys).not.toContain('f');
  });
});

describe('SHORTCUTS registry — save-as-http entry', () => {
  it('contains the `S` entry (save as .http file)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'S');
    expect(entry).toBeDefined();
    expect(entry?.label).toBe('');
    expect(entry?.description).toBe('Save as .http file');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('request');
  });

  it('does not appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);
    expect(barKeys).not.toContain('S');
  });
});

describe('SHORTCUTS registry — edit-request entry', () => {
  it('contains the `e` entry (edit request)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'e');
    expect(entry).toBeDefined();
    expect(entry?.label).toBe('');
    expect(entry?.description).toBe('Edit requests in-session');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('edit');
  });

  it('does not appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);
    expect(barKeys).not.toContain('e');
  });
});

describe('SHORTCUTS registry — edit group', () => {
  it('contains a single `Ctrl+S` entry covering both save contexts', () => {
    const entries = SHORTCUTS.filter((s) => s.key === 'Ctrl+S');
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry.label).toBe('');
    expect(entry.description).toBe('Commit edit or save file');
    expect(entry.showInBar).toBe(false);
    expect(entry.showInHelp).toBe(true);
    expect(entry.group).toBe('edit');
  });

  it('contains the `Ctrl+A` entry (jump to start of line)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'Ctrl+A');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to start of line');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('edit');
  });

  it('contains the `Ctrl+E` entry (jump to end of line)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'Ctrl+E');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to end of line');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('edit');
  });

  it('contains the `Shift+Tab` entry (switch editor tab)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'Shift+Tab');
    expect(entry).toBeDefined();
    expect(entry?.label).toBe('');
    expect(entry?.description).toBe('Switch editor tab');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('edit');
  });

  it('labels the edit group as Edit', () => {
    expect(SHORTCUT_GROUP_LABELS.edit).toBe('Edit');
  });

  it('arranges help groups in two columns', () => {
    expect(HELP_COLUMN_GROUPS[0]).toEqual(['general', 'navigation', 'search']);
    expect(HELP_COLUMN_GROUPS[1]).toEqual(['request', 'display', 'edit']);
  });

  it('none of the edit shortcuts appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);

    expect(barKeys).not.toContain('Ctrl+S');
    expect(barKeys).not.toContain('Ctrl+A');
    expect(barKeys).not.toContain('Ctrl+E');
    expect(barKeys).not.toContain('Shift+Tab');
  });
});

describe('SHORTCUTS registry — editor-handoff entry', () => {
  it('contains the `Ctrl+G` entry (edit requests externally)', () => {
    const entry = SHORTCUTS.find((s) => s.key === 'Ctrl+G');
    expect(entry).toBeDefined();
    expect(entry?.label).toBe('');
    expect(entry?.description).toBe('Edit requests externally');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
    expect(entry?.group).toBe('edit');
  });

  it('does not appear in the status bar', () => {
    const barKeys = SHORTCUTS.filter((s) => s.showInBar).map((s) => s.key);
    expect(barKeys).not.toContain('Ctrl+G');
  });

  it('appears in the help overlay Edit group with its description', () => {
    const helpEntries = SHORTCUTS.filter((s) => s.showInHelp && s.group === 'edit');
    const entry = helpEntries.find((s) => s.key === 'Ctrl+G');
    expect(entry?.description).toBe('Edit requests externally');
  });
});
