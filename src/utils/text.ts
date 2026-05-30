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
