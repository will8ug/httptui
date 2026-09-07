import stringWidth from 'string-width';

import type { ColorSegment } from './wrap';

export function cellWidth(text: string): number {
  return stringWidth(text);
}

function graphemeClusters(text: string): string[] {
  const segmenter = new Intl.Segmenter();
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

export function sliceByCells(text: string, maxCells: number): string {
  if (maxCells <= 0) {
    return '';
  }

  let used = 0;
  let result = '';

  for (const cluster of graphemeClusters(text)) {
    const width = cellWidth(cluster);
    if (used + width > maxCells) {
      break;
    }
    used += width;
    result += cluster;
  }

  return result;
}

export function sliceFromCells(text: string, startCells: number, maxCells: number): string {
  const clusters = graphemeClusters(text);

  let cellsBefore = 0;
  let startIndex = 0;

  while (startIndex < clusters.length && cellsBefore < startCells) {
    cellsBefore += cellWidth(clusters[startIndex]);
    startIndex += 1;
  }

  if (cellsBefore < startCells) {
    return '';
  }

  let used = 0;
  let result = '';

  for (let index = startIndex; index < clusters.length; index += 1) {
    const cluster = clusters[index];
    const width = cellWidth(cluster);
    if (used + width > maxCells) {
      break;
    }
    used += width;
    result += cluster;
  }

  return result;
}

export function clampSegmentsToWidth(segments: ColorSegment[], maxCells: number): ColorSegment[] {
  const total = segments.reduce((sum, segment) => sum + cellWidth(segment.text), 0);

  if (total <= maxCells) {
    return segments;
  }

  const result: ColorSegment[] = [];
  let used = 0;

  for (const segment of segments) {
    if (segment.text.length === 0) {
      continue;
    }

    const budget = maxCells - used;

    if (budget <= 0) {
      break;
    }

    const kept = sliceByCells(segment.text, budget);

    if (kept.length === 0) {
      break;
    }

    result.push({ text: kept, color: segment.color });
    used += cellWidth(kept);
  }

  return result;
}

export function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  if (cellWidth(value) <= maxWidth) {
    return value;
  }

  const visible = sliceByCells(value, maxWidth - 1);
  return `${visible}…`;
}

export function shiftText(value: string, offset: number, maxWidth: number): string {
  if (offset <= 0) {
    return truncateText(value, maxWidth);
  }

  const shifted = sliceFromCells(value, offset, maxWidth);
  return shifted === '' ? ' ' : truncateText(shifted, maxWidth);
}

export function expandTabs(line: string, tabWidth = 8): string {
  let result = '';
  for (const ch of line) {
    if (ch === '\t') {
      // a tab character doesn't mean "8 spaces" — it means "move to the next tab stop."
      // Tab stops are at columns 0, 8, 16, 24, 32, etc. The number of spaces a tab produces
      // depends on where the cursor currently is. Refer to the auto tests for sample scenarios.
      const spaces = tabWidth - (cellWidth(result) % tabWidth);
      result += ' '.repeat(spaces);
    } else {
      result += ch;
    }
  }
  return result;
}
