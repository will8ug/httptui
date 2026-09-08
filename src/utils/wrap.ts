import { cellWidth, firstGraphemeCluster, sliceByCells } from './text';

export type ColorSegment = {
  text: string;
  color: string;
};

export function wrapLine(line: string, maxWidth: number): string[] {
  if (maxWidth <= 0) {
    return [];
  }

  if (line === '') {
    return [' '];
  }

  if (cellWidth(line) <= maxWidth) {
    return [line];
  }

  const lines: string[] = [];
  let remaining = line;

  while (cellWidth(remaining) > maxWidth) {
    const prefix = sliceByCells(remaining, maxWidth);

    // sliceByCells returns '' when the first cluster alone exceeds maxWidth — emit it whole or this loop never advances.
    if (prefix === '') {
      const cluster = firstGraphemeCluster(remaining);
      lines.push(cluster);
      remaining = remaining.slice(cluster.length);
      continue;
    }

    const lastSpace = prefix.lastIndexOf(' ');

    if (lastSpace > 0) {
      lines.push(remaining.slice(0, lastSpace + 1));
      remaining = remaining.slice(lastSpace + 1);
      continue;
    }

    lines.push(prefix);
    remaining = remaining.slice(prefix.length);
  }

  if (remaining !== '') {
    lines.push(remaining);
  }

  return lines;
}

export function wrapColorizedSegments(
  segments: ColorSegment[],
  maxWidth: number,
): ColorSegment[][] {
  if (maxWidth <= 0) {
    return [];
  }

  if (segments.length === 0) {
    return [[{ text: ' ', color: 'white' }]];
  }

  const flatTextParts: string[] = [];

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    flatTextParts.push(segments[segmentIndex].text);
  }

  const flatText = flatTextParts.join('');

  if (flatText === '') {
    return [[{ text: ' ', color: 'white' }]];
  }

  const wrappedLines = wrapLine(flatText, maxWidth);

  if (wrappedLines.length === 0) {
    return [];
  }

  const lines: ColorSegment[][] = [];
  let segmentIndex = 0;
  let segmentOffset = 0;

  for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex += 1) {
    const wrappedLine = wrappedLines[lineIndex];
    const lineSegments: ColorSegment[] = [];
    let remainingLineLength = wrappedLine.length;

    while (remainingLineLength > 0 && segmentIndex < segments.length) {
      const segment = segments[segmentIndex];
      const availableLength = segment.text.length - segmentOffset;

      if (availableLength <= 0) {
        segmentIndex += 1;
        segmentOffset = 0;
        continue;
      }

      const sliceLength = Math.min(remainingLineLength, availableLength);
      const sliceText = segment.text.slice(segmentOffset, segmentOffset + sliceLength);

      if (sliceText.length > 0) {
        const lastLineSegment = lineSegments[lineSegments.length - 1];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for empty array
        if (lastLineSegment && lastLineSegment.color === segment.color) {
          lastLineSegment.text += sliceText;
        } else {
          lineSegments.push({ text: sliceText, color: segment.color });
        }
      }

      remainingLineLength -= sliceLength;
      segmentOffset += sliceLength;

      if (segmentOffset >= segment.text.length) {
        segmentIndex += 1;
        segmentOffset = 0;
      }
    }

    if (lineSegments.length === 0) {
      lineSegments.push({ text: ' ', color: 'white' });
    }

    lines.push(lineSegments);
  }

  return lines;
}
