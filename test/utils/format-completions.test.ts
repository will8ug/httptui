import { describe, expect, it } from 'vitest';

import { formatCompletions } from '../../src/utils/format-completions';

// 80-col test terminal → overlay width 72 → 72 - 6 box chrome = 66.
const OVERLAY_ROW_WIDTH = 66;

describe('formatCompletions', () => {
  it('joins names with two spaces when they fit the width', () => {
    expect(formatCompletions(['users-staging.http', 'users.http'], OVERLAY_ROW_WIDTH)).toBe(
      'users-staging.http  users.http',
    );
  });

  it('clips an overflowing list to the width with a hidden count', () => {
    const first = `${'a'.repeat(30)}.http`;

    expect(
      formatCompletions([first, `${'b'.repeat(30)}.http`, `${'c'.repeat(30)}.http`], OVERLAY_ROW_WIDTH),
    ).toBe(`${first} … +2`);
  });

  it('hard-truncates a single candidate longer than the width', () => {
    expect(formatCompletions(['d'.repeat(80)], OVERLAY_ROW_WIDTH)).toBe(`${'d'.repeat(65)}…`);
  });

  it('truncates an overlong first candidate and counts the rest', () => {
    expect(formatCompletions(['e'.repeat(80), 'f.http'], OVERLAY_ROW_WIDTH)).toBe(`${'e'.repeat(61)} … +1`);
  });
});
