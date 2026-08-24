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

function headersContainSeparator(headers: Record<string, string>): boolean {
  return Object.entries(headers).some(([name, value]) =>
    `${name}: ${value}`.split('\n').some((line) => SEPARATOR_RE.test(line.trim())),
  );
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

function separatorViolation(request: ParsedRequest): string | undefined {
  if (request.body !== undefined && bodyContainsSeparator(request.body)) {
    return 'Cannot save: an edited body contains a "###" separator line';
  }
  if (headersContainSeparator(request.headers)) {
    return 'Cannot save: an edited header contains a "###" separator line';
  }
  return undefined;
}

// Mirrors serializeHttpFile's join (one blank line between blocks, trailing
// newline); existing trailing blank lines are absorbed into that separator.
function appendBlocks(content: string, appended: ParsedRequest[], eol: '\n' | '\r\n'): string {
  const base = content.replace(/(?:\r?\n)+$/, '');
  const blocks = appended.map((request) => serializeRequestBlock(request)).join('\n\n');
  const suffix = base === '' ? `${blocks}\n` : `\n\n${blocks}\n`;
  return base + (eol === '\r\n' ? suffix.replace(/\n/g, '\r\n') : suffix);
}

/**
 * Rewrite only the dirty blocks, keeping every other line byte-identical.
 * Requests beyond the file's parsed count are appended as new blocks after the
 * existing content; a count deficit refuses (disk changed). Refuses on a body or
 * header containing a "###" separator line. Pure: no I/O.
 */
export function buildInPlaceContent(rawContent: string, currentRequests: ParsedRequest[]): InPlaceSaveResult {
  const lines = rawContent.split('\n');

  // Re-parse for fresh line numbers: a prior in-place save shifts the file, so
  // the stored lineNumber values are stale.
  const original = parseHttpFile(rawContent);

  if (currentRequests.length < original.requests.length) {
    return { ok: false, error: 'Source file changed on disk; press R to reload before saving' };
  }

  const appended = currentRequests.slice(original.requests.length).filter((request) => request.isDirty);
  const editedIndexes = findEditedIndexes(currentRequests.slice(0, original.requests.length));

  if (editedIndexes.length === 0 && appended.length === 0) {
    return { ok: true, content: rawContent, editedCount: 0 };
  }

  const eol = rawContent.includes('\r\n') ? '\r\n' : '\n';

  const regions: Region[] = [];
  for (const i of editedIndexes) {
    const violation = separatorViolation(currentRequests[i]);
    if (violation) {
      return { ok: false, error: violation };
    }

    const requestLineIndex = original.requests[i].lineNumber - 1;
    const { blockStart, blockEnd } = resolveBlockRegion(lines, requestLineIndex);
    regions.push({
      blockStart,
      blockEnd,
      newBlockLines: toEolBlockLines(currentRequests[i], eol, blockEnd < lines.length - 1),
    });
  }

  for (const request of appended) {
    const violation = separatorViolation(request);
    if (violation) {
      return { ok: false, error: violation };
    }
  }

  spliceRegions(lines, regions);

  const content = appended.length > 0 ? appendBlocks(lines.join('\n'), appended, eol) : lines.join('\n');

  return { ok: true, content, editedCount: editedIndexes.length + appended.length };
}
