import { describe, expect, it } from 'vitest';

import { SHORTCUTS } from '../src/core/shortcuts';

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
    expect(entry?.description).toBe('Jump to horizontal start of focused panel');
    expect(entry?.showInBar).toBe(false);
    expect(entry?.showInHelp).toBe(true);
  });

  it('contains the `$` entry (jump to horizontal end)', () => {
    const entry = SHORTCUTS.find((s) => s.key === '$');
    expect(entry).toBeDefined();
    expect(entry?.description).toBe('Jump to horizontal end of focused panel');
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
