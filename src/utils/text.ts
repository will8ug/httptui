export function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  if (value.length <= maxWidth) {
    return value;
  }

  if (maxWidth === 1) {
    return '…';
  }

  return `${value.slice(0, maxWidth - 1)}…`;
}

export function shiftText(value: string, offset: number, maxWidth: number): string {
  if (offset <= 0) {
    return truncateText(value, maxWidth);
  }

  const shifted = value.slice(offset);
  return shifted === '' ? ' ' : truncateText(shifted, maxWidth);
}

export function expandTabs(line: string, tabWidth = 8): string {
  let result = '';
  for (const ch of line) {
    if (ch === '\t') {
      // a tab character doesn't mean "8 spaces" — it means "move to the next tab stop."
      // Tab stops are at columns 0, 8, 16, 24, 32, etc. The number of spaces a tab produces
      // depends on where the cursor currently is. Refer to the auto tests for sample scenarios.
      const spaces = tabWidth - (result.length % tabWidth);
      result += ' '.repeat(spaces);
    } else {
      result += ch;
    }
  }
  return result;
}
