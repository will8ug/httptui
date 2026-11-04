export function formatCompletions(names: string[], maxWidth: number): string {
  const joined = names.join('  ');
  if (joined.length <= maxWidth) {
    return joined;
  }

  for (let shown = names.length - 1; shown >= 1; shown -= 1) {
    const suffix = ` … +${names.length - shown}`;
    const line = names.slice(0, shown).join('  ');
    if (line.length + suffix.length <= maxWidth) {
      return line + suffix;
    }
  }

  const [first, ...rest] = names;
  if (rest.length === 0) {
    return `${first.slice(0, maxWidth - 1)}…`;
  }

  const suffix = ` … +${rest.length}`;
  return first.slice(0, Math.max(0, maxWidth - suffix.length)) + suffix;
}
