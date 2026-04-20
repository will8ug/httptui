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
