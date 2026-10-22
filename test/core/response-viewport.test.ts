import { describe, expect, it } from 'vitest';

import { assertDefinedToNarrowType } from '../helpers/assertions.js';
import { createMockResponse } from '../helpers/responses.js';
import { computeResponseViewport, RESPONSE_PANEL_CHROME, RESPONSE_PANEL_VERTICAL_CHROME, sliceVisibleLines } from '../../src/core/response-viewport.js';
import type { ColorSegment } from '../../src/utils/wrap.js';

function lineTexts(lines: ColorSegment[][]): string[] {
  return lines.map((segments) => segments.map((segment) => segment.text).join(''));
}

const SPLIT_CONTENT_WIDTH_AT_80_COLUMNS = 51;

function splitGeometry(availableHeight: number) {
  return { columns: 80, availableHeight, fullscreen: false, searchVisible: false };
}

describe('computeResponseViewport — nowrap mode', () => {
  it('anchors the body after status and separator and totals five visual lines for a three-line body', () => {
    const response = createMockResponse({ body: 'line1\nline2\nline3' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.bodyStartVisualIndex).toBe(2);
    expect(viewport.bodyVisualStart).toEqual([2, 3, 4]);
    expect(viewport.totalVisualLines).toBe(5);
    expect(viewport.sections.map((s) => s.kind)).toEqual(['status', 'separator', 'body', 'body', 'body']);
  });

  it('measures the separator visual line at the split content width', () => {
    const response = createMockResponse({ body: 'x' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    const separator = viewport.sections.find((s) => s.kind === 'separator');
    expect(separator?.visualLines[0][0].text).toBe('─'.repeat(SPLIT_CONTENT_WIDTH_AT_80_COLUMNS));
  });

  it('renders the status visual line as gray prefix, status-colored code, gray duration', () => {
    const response = createMockResponse({
      statusCode: 404,
      statusText: 'Not Found',
      timing: { durationMs: 123 },
    });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    const status = viewport.sections.find((s) => s.kind === 'status');
    const segments = status?.visualLines[0];
    expect(segments).toHaveLength(3);
    expect(segments?.[0]).toEqual({ text: 'HTTP/1.1 ', color: 'gray' });
    expect(segments?.[1].text).toBe('404 Not Found');
    expect(segments?.[1].color).not.toBe('gray');
    expect(segments?.[2]).toEqual({ text: '  123ms', color: 'gray' });
  });

  it('shifts body anchors by the verbose header count when verbose is on', () => {
    const response = createMockResponse({
      headers: { 'content-type': 'application/json', 'x-custom': 'value', 'x-another': 'v' },
      body: 'a\nb',
    });
    const viewport = computeResponseViewport({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.bodyStartVisualIndex).toBe(2 + 3);
    expect(viewport.bodyVisualStart).toEqual([5, 6]);
    expect(viewport.totalVisualLines).toBe(5 + 2);
  });

  it('does not count headers when verbose is off', () => {
    const response = createMockResponse({ headers: { 'content-type': 'application/json' }, body: 'x' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.bodyStartVisualIndex).toBe(2);
  });
});

describe('computeResponseViewport — wrap mode', () => {
  it('matches the nowrap shape when status, headers, and body all fit the content width', () => {
    const response = createMockResponse({ headers: { a: 'b' }, body: 'x\ny' });
    const nowrap = computeResponseViewport({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });
    const wrap = computeResponseViewport({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: splitGeometry(20),
    });

    expect(wrap.bodyStartVisualIndex).toBe(nowrap.bodyStartVisualIndex);
    expect(wrap.bodyVisualStart).toEqual(nowrap.bodyVisualStart);
    expect(wrap.totalVisualLines).toBe(nowrap.totalVisualLines);
  });

  it('anchors the body after both wrapped status visual lines when the status line overflows', () => {
    const response = createMockResponse({
      statusText: 'Non-Authoritative Information With Extra Long Text To Force Wrapping',
      body: 'x',
    });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: splitGeometry(20),
    });

    const status = viewport.sections.find((s) => s.kind === 'status');
    expect(status?.visualLines).toHaveLength(2);
    expect(viewport.bodyStartVisualIndex).toBe(3);
    expect(viewport.bodyVisualStart).toEqual([3]);
    expect(viewport.totalVisualLines).toBe(4);
  });

  it('expands an overflowing verbose header from one raw line into three visual lines', () => {
    const response = createMockResponse({
      headers: {
        'x-trace-id': 'this-is-a-deliberately-long-header-value-that-definitely-exceeds-content-width-to-force-wrap',
        short: 'v',
      },
      body: 'x',
    });
    const viewport = computeResponseViewport({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: splitGeometry(20),
    });

    const headerSections = viewport.sections.filter((s) => s.kind === 'header');
    expect(headerSections).toHaveLength(2);
    expect(headerSections[0].visualLines).toHaveLength(3);
    expect(headerSections[1].visualLines).toHaveLength(1);
    expect(viewport.bodyStartVisualIndex).toBe(1 + 3 + 1 + 1);
    expect(viewport.bodyVisualStart).toEqual([6]);
    expect(viewport.totalVisualLines).toBe(7);
  });

  it('shifts later body anchors by the wrapped visual-line count of earlier body lines', () => {
    const longLine = 'abcdefghijklmnopqrstuvwxyz '.repeat(5).trim();
    const response = createMockResponse({ body: `${longLine}\nsecond\nthird` });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: splitGeometry(20),
    });

    const firstBodyGap = viewport.bodyVisualStart[1] - viewport.bodyVisualStart[0];
    expect(firstBodyGap).toBeGreaterThan(1);
    expect(viewport.bodyVisualStart[2] - viewport.bodyVisualStart[1]).toBe(1);
  });
});

describe('computeResponseViewport — visible window and scroll bounds', () => {
  it('derives max vertical offset from total visual lines minus the visible window height', () => {
    const response = createMockResponse({ body: 'line1\nline2\nline3' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(6),
    });

    expect(viewport.totalVisualLines).toBe(5);
    expect(viewport.visibleHeight).toBe(3);
    expect(viewport.maxVerticalOffset).toBe(2);
  });

  it('clamps max vertical offset to zero when the response fits the visible window', () => {
    const response = createMockResponse({ body: 'x' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(40),
    });

    expect(viewport.maxVerticalOffset).toBe(0);
  });

  it('shrinks the visible window by one row while the search bar is shown', () => {
    const response = createMockResponse({ body: 'line1\nline2\nline3' });
    const options = {
      response,
      verbose: false,
      rawMode: true as const,
      wrapMode: 'nowrap' as const,
    };
    const withoutSearchBar = computeResponseViewport({
      ...options,
      geometry: { columns: 80, availableHeight: 6, fullscreen: false, searchVisible: false },
    });
    const withSearchBar = computeResponseViewport({
      ...options,
      geometry: { columns: 80, availableHeight: 6, fullscreen: false, searchVisible: true },
    });

    expect(withoutSearchBar.visibleHeight).toBe(3);
    expect(withSearchBar.visibleHeight).toBe(2);
    expect(withSearchBar.maxVerticalOffset).toBe(withoutSearchBar.maxVerticalOffset + 1);
  });

  it('never reports fewer than one visible line for a shrunken terminal', () => {
    const response = createMockResponse({ body: 'line1\nline2\nline3' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: { columns: 80, availableHeight: 2, fullscreen: false, searchVisible: true },
    });

    expect(viewport.visibleHeight).toBe(1);
    expect(viewport.maxVerticalOffset).toBe(4);
  });
});

describe('computeResponseViewport — max line display width', () => {
  it('reports the separator width when it is the widest rendered line', () => {
    const response = createMockResponse({ body: 'x' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.maxLineDisplayWidth).toBe(SPLIT_CONTENT_WIDTH_AT_80_COLUMNS);
  });

  it('reports a nowrap body line that is wider than status, headers, and separator', () => {
    const response = createMockResponse({ body: 'a'.repeat(60) });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.maxLineDisplayWidth).toBe(60);
  });

  it('measures wide characters in display cells, not code units', () => {
    const response = createMockResponse({ body: '你好'.repeat(26) });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.maxLineDisplayWidth).toBe(104);
  });
});

describe('computeResponseViewport — fullscreen versus split geometry', () => {
  it('wraps a long body into fewer visual lines in fullscreen than in split at the same columns', () => {
    const response = createMockResponse({ body: 'a'.repeat(160) });
    const options = {
      response,
      verbose: false,
      rawMode: true as const,
      wrapMode: 'wrap' as const,
    };
    const split = computeResponseViewport({
      ...options,
      geometry: { columns: 80, availableHeight: 40, fullscreen: false, searchVisible: false },
    });
    const fullscreen = computeResponseViewport({
      ...options,
      geometry: { columns: 80, availableHeight: 40, fullscreen: true, searchVisible: false },
    });

    expect(split.totalVisualLines).toBe(2 + 4);
    expect(fullscreen.totalVisualLines).toBe(2 + 3);
  });

  it('expands the single body section to four wrapped visual lines in split and three in fullscreen', () => {
    const response = createMockResponse({ body: 'a'.repeat(160) });
    const split = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: { columns: 80, availableHeight: 40, fullscreen: false, searchVisible: false },
    });
    const fullscreen = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: { columns: 80, availableHeight: 40, fullscreen: true, searchVisible: false },
    });

    expect(split.bodyVisualStart).toEqual([2]);
    expect(split.sections.filter((s) => s.kind === 'body')[0].visualLines).toHaveLength(4);
    expect(fullscreen.bodyVisualStart).toEqual([2]);
    expect(fullscreen.sections.filter((s) => s.kind === 'body')[0].visualLines).toHaveLength(3);
  });

  it('breaks a wide-character body line on display-cell boundaries in fullscreen wrap', () => {
    const response = createMockResponse({ body: '你'.repeat(20) });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: { columns: 24, availableHeight: 40, fullscreen: true, searchVisible: false },
    });

    expect(viewport.totalVisualLines).toBe(2 + 1 + 2);
    expect(viewport.bodyStartVisualIndex).toBe(3);
    expect(viewport.bodyVisualStart).toEqual([3]);
    const bodySection = viewport.sections.filter((s) => s.kind === 'body')[0];
    expect(bodySection.visualLines).toHaveLength(2);
    expect(bodySection.visualLines[0][0].text).toBe('你'.repeat(10));
    expect(bodySection.visualLines[1][0].text).toBe('你'.repeat(10));
    expect(viewport.maxLineDisplayWidth).toBe(20);
  });
});

describe('sliceVisibleLines — visible-window slice', () => {
  const response = createMockResponse({ body: 'line1\nline2\nline3' });
  const viewport = computeResponseViewport({
    response,
    verbose: false,
    rawMode: true,
    wrapMode: 'nowrap',
    geometry: splitGeometry(20),
  });

  it('returns the visual lines from the scroll offset for the requested window height', () => {
    expect(lineTexts(sliceVisibleLines(viewport, 2, 2))).toEqual(['line1', 'line2']);
  });

  it('starts the window at the status line for offset zero', () => {
    expect(lineTexts(sliceVisibleLines(viewport, 0, 1))).toEqual(['HTTP/1.1 200 OK  100ms']);
  });

  it('shortens the window when it runs past the last visual line', () => {
    expect(lineTexts(sliceVisibleLines(viewport, 4, 10))).toEqual(['line3']);
  });

  it('cuts the wrapped chunks of one body line into consecutive windows', () => {
    const wrapped = computeResponseViewport({
      response: createMockResponse({ body: 'a'.repeat(110) }),
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      geometry: splitGeometry(20),
    });

    expect(lineTexts(sliceVisibleLines(wrapped, 2, 1))).toEqual(['a'.repeat(51)]);
    expect(lineTexts(sliceVisibleLines(wrapped, 3, 1))).toEqual(['a'.repeat(51)]);
    expect(lineTexts(sliceVisibleLines(wrapped, 4, 1))).toEqual(['a'.repeat(8)]);
  });
});

describe('computeResponseViewport — repeated computation', () => {
  it('returns the same model object for repeated calls with identical inputs', () => {
    const response = createMockResponse({ body: 'line1\nline2\nline3' });
    const first = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(24),
    });
    const second = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: { columns: 80, availableHeight: 24, fullscreen: false, searchVisible: false },
    });

    expect(second).toBe(first);
  });
});

describe('response panel chrome — single home', () => {
  it('counts horizontal chrome as border plus padding', () => {
    expect(RESPONSE_PANEL_CHROME).toBe(4);
  });

  it('counts vertical chrome as border top, title, and border bottom', () => {
    expect(RESPONSE_PANEL_VERTICAL_CHROME).toBe(3);
  });
});

describe('computeResponseViewport — model shape', () => {
  it('exposes exactly the visual-line model fields', () => {
    const response = createMockResponse({ body: 'hi' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(Object.keys(viewport).sort()).toEqual(
      [
        'bodyStartVisualIndex',
        'bodyVisualStart',
        'maxLineDisplayWidth',
        'maxVerticalOffset',
        'sections',
        'totalVisualLines',
        'visibleHeight',
      ].sort(),
    );
  });

  it('orders sections status, separator, body when verbose is off', () => {
    const response = createMockResponse({ body: 'hi' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.sections.map((s) => s.kind)).toEqual(['status', 'separator', 'body']);
  });

  it('orders sections status, headers, separator, body when verbose is on', () => {
    const response = createMockResponse({ headers: { a: 'b', c: 'd' }, body: 'hi' });
    const viewport = computeResponseViewport({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    expect(viewport.sections.map((s) => s.kind)).toEqual(['status', 'header', 'header', 'separator', 'body']);
  });
});

describe('computeResponseViewport — body text preparation', () => {
  it('expands tab characters in raw-mode body lines to spaces', () => {
    const response = createMockResponse({ body: '\t\t<element/>' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    const bodySection = viewport.sections.find((s) => s.kind === 'body');
    expect(bodySection).toBeDefined();
    assertDefinedToNarrowType(bodySection, 'Expected body section to be defined');
    const visualLine = bodySection.visualLines[0][0];
    expect(visualLine.text).not.toContain('\t');
    expect(visualLine.text).toBe('                <element/>');
  });

  it('formats a JSON body across lines unless raw mode is on', () => {
    const response = createMockResponse({ body: '{"id":"1"}' });
    const viewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: false,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });

    const bodyKinds = viewport.sections.filter((s) => s.kind === 'body');
    expect(bodyKinds).toHaveLength(3);
    const rawViewport = computeResponseViewport({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'nowrap',
      geometry: splitGeometry(20),
    });
    expect(rawViewport.sections.filter((s) => s.kind === 'body')).toHaveLength(1);
  });
});
