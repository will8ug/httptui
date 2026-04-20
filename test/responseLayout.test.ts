import { describe, expect, it } from 'vitest';

import { computeResponseLayout, formatStatusLine } from '../src/core/responseLayout.js';
import type { ResponseData } from '../src/core/types.js';

const CONTENT_WIDTH = 49;

function makeResponse(overrides: Partial<ResponseData> = {}): ResponseData {
  return {
    statusCode: 200,
    statusText: 'OK',
    headers: {},
    body: '',
    timing: { durationMs: 42 },
    size: { bodyBytes: 0 },
    ...overrides,
  };
}

describe('formatStatusLine', () => {
  it('returns three segments: gray prefix, status-colored code, gray duration', () => {
    const response = makeResponse({ statusCode: 404, statusText: 'Not Found', timing: { durationMs: 123 } });
    const segments = formatStatusLine(response);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ text: 'HTTP/1.1 ', color: 'gray' });
    expect(segments[1].text).toBe('404 Not Found');
    expect(segments[1].color).not.toBe('gray');
    expect(segments[2]).toEqual({ text: '  123ms', color: 'gray' });
  });
});

describe('computeResponseLayout — nowrap mode', () => {
  it('bodyStartVisualIndex === 2 for no-verbose + short body; bodyVisualStart starts at 2', () => {
    const response = makeResponse({ body: 'line1\nline2\nline3' });
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    expect(layout.bodyStartVisualIndex).toBe(2);
    expect(layout.bodyVisualStart).toEqual([2, 3, 4]);
    expect(layout.totalVisualLines).toBe(2 + 3);
  });

  it('bodyStartVisualIndex === 2 + N headers when verbose is on', () => {
    const response = makeResponse({
      headers: { 'content-type': 'application/json', 'x-custom': 'value', 'x-another': 'v' },
      body: 'a\nb',
    });
    const layout = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    expect(layout.bodyStartVisualIndex).toBe(2 + 3);
    expect(layout.bodyVisualStart).toEqual([5, 6]);
    expect(layout.totalVisualLines).toBe(5 + 2);
  });

  it('does not count headers when verbose is off', () => {
    const response = makeResponse({ headers: { 'content-type': 'application/json' }, body: 'x' });
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    expect(layout.bodyStartVisualIndex).toBe(2);
  });
});

describe('computeResponseLayout — wrap mode, nothing overflows', () => {
  it('matches the nowrap shape when status/headers/body all fit', () => {
    const response = makeResponse({ headers: { a: 'b' }, body: 'x\ny' });
    const nowrap = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });
    const wrap = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    expect(wrap.bodyStartVisualIndex).toBe(nowrap.bodyStartVisualIndex);
    expect(wrap.bodyVisualStart).toEqual(nowrap.bodyVisualStart);
    expect(wrap.totalVisualLines).toBe(nowrap.totalVisualLines);
  });
});

describe('computeResponseLayout — wrap mode, status line overflows', () => {
  it('bodyStartVisualIndex reflects the wrapped status line count', () => {
    const response = makeResponse({
      statusText: 'Non-Authoritative Information With Extra Long Text To Force Wrapping',
      body: 'x',
    });
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    const statusSection = layout.sections.find((s) => s.kind === 'status');
    expect(statusSection?.visualLines.length).toBeGreaterThanOrEqual(2);
    expect(layout.bodyStartVisualIndex).toBe((statusSection?.visualLines.length ?? 0) + 1);
    expect(layout.bodyVisualStart[0]).toBe(layout.bodyStartVisualIndex);
  });
});

describe('computeResponseLayout — wrap mode, verbose header overflows', () => {
  it('expands the header section into multiple visual lines', () => {
    const response = makeResponse({
      headers: {
        'x-trace-id': 'this-is-a-deliberately-long-header-value-that-definitely-exceeds-content-width-to-force-wrap',
        short: 'v',
      },
      body: 'x',
    });
    const layout = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    const headerSections = layout.sections.filter((s) => s.kind === 'header');
    expect(headerSections).toHaveLength(2);
    const longHeader = headerSections.find((h) => h.kind === 'header' && h.name === 'x-trace-id');
    expect(longHeader?.visualLines.length).toBeGreaterThanOrEqual(2);

    const headerVisualTotal = headerSections.reduce((sum, h) => sum + h.visualLines.length, 0);
    expect(layout.bodyStartVisualIndex).toBe(1 + headerVisualTotal + 1);
  });
});

describe('computeResponseLayout — wrap mode, body line overflows', () => {
  it('later body lines shift by the wrapped visual-line count of earlier lines', () => {
    const longLine = 'abcdefghijklmnopqrstuvwxyz '.repeat(5).trim();
    const body = `${longLine}\nsecond\nthird`;
    const response = makeResponse({ body });
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: body,
    });

    const firstBodyGap = layout.bodyVisualStart[1] - layout.bodyVisualStart[0];
    expect(firstBodyGap).toBeGreaterThan(1);
    expect(layout.bodyVisualStart[2] - layout.bodyVisualStart[1]).toBe(1);
  });
});

describe('computeResponseLayout — public shape', () => {
  it('exposes sections, totalVisualLines, bodyStartVisualIndex, bodyVisualStart', () => {
    const response = makeResponse({ body: 'hi' });
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    expect(Object.keys(layout).sort()).toEqual(
      ['bodyStartVisualIndex', 'bodyVisualStart', 'sections', 'totalVisualLines'].sort(),
    );
    const kinds = layout.sections.map((s) => s.kind);
    expect(kinds).toEqual(['status', 'separator', 'body']);
  });

  it('includes header sections between status and separator when verbose', () => {
    const response = makeResponse({ headers: { a: 'b', c: 'd' }, body: 'hi' });
    const layout = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      contentWidth: CONTENT_WIDTH,
      formattedBody: response.body,
    });

    const kinds = layout.sections.map((s) => s.kind);
    expect(kinds).toEqual(['status', 'header', 'header', 'separator', 'body']);
  });
});
