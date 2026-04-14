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

  if (line.length <= maxWidth) {
    return [line];
  }

  const lines: string[] = [];
  let remaining = line;

  while (remaining.length > maxWidth) {
    const lastSpace = remaining.lastIndexOf(' ', maxWidth - 1);

    if (lastSpace > 0) {
      const breakAt = lastSpace + 1;
      lines.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt);
      continue;
    }

    lines.push(remaining.slice(0, maxWidth));
    remaining = remaining.slice(maxWidth);
  }

  if (remaining.length > 0) {
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
