import { serializeRequestBlock } from './http-serializer';
import { parseHttpFile } from './parser';
import type { ParsedRequest } from './types';

const SEPARATOR_RE = /^#{3,}/;

export type InPlaceSaveResult =
  | { ok: true; content: string; editedCount: number }
  | { ok: false; error: string };

interface Region {
  blockStart: number;
  blockEnd: number;
  newBlockLines: string[];
}

function findEditedIndexes(requests: ParsedRequest[]): number[] {
  const editedIndexes: number[] = [];
  for (let i = 0; i < requests.length; i += 1) {
    if (requests[i].isDirty) {
      editedIndexes.push(i);
    }
  }
  return editedIndexes;
}

// A `###`-prefixed line in an edited body would split the request on reload.
function bodyContainsSeparator(body: string): boolean {
  return body.split('\n').some((line) => SEPARATOR_RE.test(line.trim()));
}

function resolveBlockRegion(lines: string[], requestLineIndex: number): { blockStart: number; blockEnd: number } {
  let blockStart = requestLineIndex;
  for (let j = requestLineIndex - 1; j >= 0; j -= 1) {
    if (SEPARATOR_RE.test(lines[j].trim())) {
      blockStart = j;
      break;
    }
  }

  let blockEnd = lines.length - 1;
  for (let j = requestLineIndex + 1; j < lines.length; j += 1) {
    if (SEPARATOR_RE.test(lines[j].trim())) {
      blockEnd = j - 1;
      break;
    }
  }

  // Trailing blank lines are the inter-block gap; keep them byte-identical.
  while (blockEnd >= blockStart && lines[blockEnd].trim() === '') {
    blockEnd -= 1;
  }
  if (blockEnd < blockStart) {
    blockEnd = requestLineIndex;
  }

  return { blockStart, blockEnd };
}

function toEolBlockLines(request: ParsedRequest, eol: '\n' | '\r\n', followedByJoinNewline: boolean): string[] {
  let block = serializeRequestBlock(request);
  if (eol === '\r\n') {
    block = block.replace(/\n/g, '\r\n');
  }
  const lines = block.split('\n');
  // serializeRequestBlock emits no trailing newline, so the last line lacks
  // `\r`; when a join newline follows it, restore the file's CRLF convention.
  if (eol === '\r\n' && followedByJoinNewline && lines.length > 0) {
    lines[lines.length - 1] += '\r';
  }
  return lines;
}

function spliceRegions(lines: string[], regions: Region[]): void {
  // Splice bottom-up so earlier indices stay valid.
  regions.sort((a, b) => b.blockStart - a.blockStart);
  for (const region of regions) {
    lines.splice(region.blockStart, region.blockEnd - region.blockStart + 1, ...region.newBlockLines);
  }
}

/**
 * Rewrite only the blocks of requests whose `isDirty` marker is set, keeping every
 * other line byte-identical. Refuses on structural source changes and on edited
 * bodies containing a request separator. Pure: no I/O.
 */
export function buildInPlaceContent(rawContent: string, currentRequests: ParsedRequest[]): InPlaceSaveResult {
  const lines = rawContent.split('\n');

  // Re-parse for fresh line numbers: a prior in-place save shifts the file, so
  // the stored lineNumber values are stale.
  const original = parseHttpFile(rawContent);

  if (original.requests.length !== currentRequests.length) {
    return { ok: false, error: 'Source file changed on disk; press R to reload before saving' };
  }

  const editedIndexes = findEditedIndexes(currentRequests);

  if (editedIndexes.length === 0) {
    return { ok: true, content: rawContent, editedCount: 0 };
  }

  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const regions: Region[] = [];
  for (const i of editedIndexes) {
    if (currentRequests[i].body !== undefined && bodyContainsSeparator(currentRequests[i].body)) {
      return { ok: false, error: 'Cannot save: an edited body contains a "###" separator line' };
    }

    const requestLineIndex = original.requests[i].lineNumber - 1;
    const { blockStart, blockEnd } = resolveBlockRegion(lines, requestLineIndex);
    regions.push({
      blockStart,
      blockEnd,
      newBlockLines: toEolBlockLines(currentRequests[i], eol, blockEnd < lines.length - 1),
    });
  }

  spliceRegions(lines, regions);

  return { ok: true, content: lines.join('\n'), editedCount: editedIndexes.length };
}
