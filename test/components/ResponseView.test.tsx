import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';
import stringWidth from 'string-width';

import { ResponseView } from '../../src/components/ResponseView';
import { assertDefinedToNarrowType } from '../helpers/assertions';
import { createMockResponse, longResponse, compactJsonResponse } from '../helpers/responses';

afterEach(() => {
  cleanup();
});

// Shared base-props object covering all ResponseViewProps fields with sensible defaults.
// Spread-override per test as needed.
const baseProps = {
  response: null,
  error: null,
  isLoading: false,
  verbose: false,
  focused: true,
  scrollOffset: 0,
  horizontalOffset: 0,
  wrapMode: 'nowrap' as const,
  rawMode: false,
  availableHeight: 20,
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  isSearchMode: false,
  lastSearchQuery: '',
  searchQuery: '',
  contentWidthOverride: undefined as number | undefined,
};

describe('content states', () => {
  it('renders the Sending request spinner label and cancel hint when loading', () => {
    const { lastFrame } = render(<ResponseView {...baseProps} isLoading={true} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Sending request');
    expect(frame).toContain('(Esc to cancel)');
  });

  it('renders the error message and code', () => {
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        error={{ message: 'Connection refused', code: 'ECONNREFUSED' }}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Connection refused');
    expect(frame).toContain('ECONNREFUSED');
  });

  it('renders the empty state prompt when no response and not loading', () => {
    const { lastFrame } = render(<ResponseView {...baseProps} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Press Enter to send a request');
  });
});

describe('display modes', () => {
  it('pretty-prints JSON by default (multi-line indented)', () => {
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={compactJsonResponse} />,
    );
    const frame = lastFrame() ?? '';
    // Pretty-printed JSON has a space after the colon: "id": "1"
    expect(frame).toContain('"id": "1"');
    // Raw single-line form has no space: "id":"1"
    expect(frame).not.toContain('"id":"1"');
  });

  it('renders the raw single-line body in raw mode', () => {
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={compactJsonResponse} rawMode={true} />,
    );
    const frame = lastFrame() ?? '';
    // Raw body preserves compact form: "id":"1" (no space after colon)
    expect(frame).toContain('"id":"1"');
    expect(frame).not.toContain('"id": "1"');
    // Title shows [raw] indicator
    expect(frame).toContain('[raw]');
  });

  it('renders response headers in verbose mode', () => {
    const response = createMockResponse({
      body: 'hello',
      headers: { 'Content-Type': 'text/plain', 'X-Custom': 'value' },
    });
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={response} verbose={true} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Content-Type');
    expect(frame).toContain('text/plain');
    expect(frame).toContain('X-Custom');
  });
});

describe('scroll and overflow', () => {
  it('slices the visible window with non-zero scrollOffset', () => {
    // 8 body lines: aaa, bbb, ..., hhh
    // Layout (nowrap, non-verbose): VL0=status, VL1=separator, VL2-9=body
    const response = createMockResponse({
      body: 'aaa\nbbb\nccc\nddd\neee\nfff\nggg\nhhh',
    });
    // availableHeight=6 -> visibleHeight = max(1, 6-3-0) = 3
    // scrollOffset=5 -> slice = VL5, VL6, VL7 = ddd, eee, fff
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        scrollOffset={5}
        availableHeight={6}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ddd');
    expect(frame).toContain('eee');
    expect(frame).toContain('fff');
    expect(frame).not.toContain('aaa');
    expect(frame).not.toContain('ggg');
  });

  it('shifts content left with horizontalOffset in nowrap mode', () => {
    // Body: 10 A's, dash, 10 B's, dash, 10 C's = 32 chars (not JSON)
    const response = createMockResponse({
      body: 'AAAAAAAAAA-BBBBBBBBBB-CCCCCCCCCC',
    });
    // horizontalOffset=11 shifts past "AAAAAAAAAA-", contentWidthOverride=20 pins width
    // Body line: flat.slice(11) = "BBBBBBBBBB-CCCCCCCCCC" (21), truncated to 20 = "BBBBBBBBBB-CCCCCCCCC…"
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        horizontalOffset={11}
        contentWidthOverride={20}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('BBBBBBBBBB');
    expect(frame).not.toContain('AAAAAAAAAA');
  });

  it('truncates long lines at the content width in nowrap mode', () => {
    // longResponse body = 'x'.repeat(200) — single long line
    // contentWidthOverride=10 -> truncateText produces 9 x's + ellipsis
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={longResponse} contentWidthOverride={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('…');
    expect(frame).not.toContain('x'.repeat(200));
  });

  it('wraps long content onto subsequent visual lines in wrap mode', () => {
    // Body: "ABCDEFGHIJ" (10 chars, not JSON), contentWidthOverride=5
    // wrapLine("ABCDEFGHIJ", 5) -> ["ABCDE", "FGHIJ"] — two visual lines
    const response = createMockResponse({ body: 'ABCDEFGHIJ' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        wrapMode={'wrap' as const}
        contentWidthOverride={5}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ABCDE');
    expect(frame).toContain('FGHIJ');
    expect(frame).not.toContain('…');
    // Title shows [wrap] indicator
    expect(frame).toContain('[wrap]');
  });
});

describe('wide-character content width', () => {
  it('keeps the panel border intact for wrapped CJK lines', () => {
    // 50 CJK chars = 100 cells; contentWidthOverride=20 wraps each body line to 10 chars (20 cells)
    const response = createMockResponse({ body: '汉'.repeat(50) });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        wrapMode={'wrap' as const}
        contentWidthOverride={20}
      />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    const panelWidth = stringWidth(lines[0]);

    for (const line of lines) {
      expect(stringWidth(line)).toBeLessThanOrEqual(panelWidth);
    }

    const bodyLines = lines.filter((line) => line.includes('汉'));
    expect(bodyLines.length).toBeGreaterThan(0);
    for (const line of bodyLines) {
      expect(line.startsWith('│')).toBe(true);
      expect(line.endsWith('│')).toBe(true);
    }
  });

  it('truncates a wide-character body line with an ellipsis and keeps the border intact', () => {
    const response = createMockResponse({ body: '汉'.repeat(50) });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        contentWidthOverride={20}
      />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    const panelWidth = stringWidth(lines[0]);
    const bodyLine = lines.find((line) => line.includes('汉'));
    assertDefinedToNarrowType(bodyLine, 'Expected a CJK body line to be defined');
    expect(bodyLine).toContain('…');
    expect(bodyLine.startsWith('│')).toBe(true);
    expect(bodyLine.endsWith('│')).toBe(true);
    expect(stringWidth(bodyLine)).toBeLessThanOrEqual(panelWidth);
  });

  it('budgets a search-marked CJK line one cell narrower for the marker glyph', () => {
    // contentWidth=20 -> plain body lines hold 10 CJK chars (20 cells); the marker
    // consumes 1 cell, so marked lines are clamped to contentWidth-1 = 9 chars (18 cells)
    const response = createMockResponse({ body: '汉'.repeat(50) });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        wrapMode={'wrap' as const}
        contentWidthOverride={20}
        searchMatches={[0]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    const panelWidth = stringWidth(lines[0]);

    expect(frame).toContain('►');

    const markedLine = lines.find((line) => line.includes('►'));
    assertDefinedToNarrowType(markedLine, 'Expected a search-marked body line to be defined');
    expect((markedLine.match(/汉/g) ?? []).length).toBe(9);

    const plainBodyLine = lines.find((line) => line.includes('汉') && !line.includes('►'));
    assertDefinedToNarrowType(plainBodyLine, 'Expected a plain body line to be defined');
    expect((plainBodyLine.match(/汉/g) ?? []).length).toBe(10);

    for (const line of lines) {
      expect(stringWidth(line)).toBeLessThanOrEqual(panelWidth);
    }
  });

  it('scrolls nowrap mixed CJK content by display cells', () => {
    // 4 cells of CJK then 30 ASCII letters; a code-unit slice at offset 4 would land on 'c'
    const body = `日本${'abcdefghijklmnopqrstuvwxyzabcd'}`;
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={createMockResponse({ body })}
        contentWidthOverride={20}
        horizontalOffset={4}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('abcdefghijklmnopqrst');
    expect(frame).not.toContain('cdefghijklmnopqrs…');
  });

  it('shows content at the far nowrap scroll position instead of a blank line', () => {
    // 50 CJK chars = 100 cells; maxScrollOffset = 100 - 20 = 80 cells.
    // A code-unit slice(80) on a 50-unit string returns '' and renders a blank line.
    const response = createMockResponse({ body: '汉'.repeat(50) });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        contentWidthOverride={20}
        horizontalOffset={80}
      />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    const panelWidth = stringWidth(lines[0]);
    const bodyLine = lines.find((line) => line.includes('汉'));
    assertDefinedToNarrowType(bodyLine, 'Expected a CJK body line to be defined');
    expect((bodyLine.match(/汉/g) ?? []).length).toBe(10);
    expect(stringWidth(bodyLine)).toBeLessThanOrEqual(panelWidth);
  });

  it('budgets a nowrap search-marked CJK line one cell narrower for the marker glyph', () => {
    // contentWidth=21 -> plain body lines hold 10 CJK chars + ellipsis (21 cells); the
    // marker consumes 1 cell, so the marked line is budgeted to 20 -> 9 chars + ellipsis
    const response = createMockResponse({ body: `${'汉'.repeat(50)}\n${'汉'.repeat(50)}` });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        contentWidthOverride={21}
        searchMatches={[0]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    const panelWidth = stringWidth(lines[0]);

    const markedLine = lines.find((line) => line.includes('►'));
    assertDefinedToNarrowType(markedLine, 'Expected a search-marked body line to be defined');
    expect((markedLine.match(/汉/g) ?? []).length).toBe(9);
    expect(markedLine).toContain('…');

    const plainBodyLine = lines.find((line) => line.includes('汉') && !line.includes('►'));
    assertDefinedToNarrowType(plainBodyLine, 'Expected a plain body line to be defined');
    expect((plainBodyLine.match(/汉/g) ?? []).length).toBe(10);

    for (const line of lines) {
      expect(stringWidth(line)).toBeLessThanOrEqual(panelWidth);
    }
  });
});

describe('horizontal chrome measurement (regression pin)', () => {
  // ink-testing-library renders at stdout.columns = 100, so the panel's outer
  // box (width="100%") is exactly 100 cells wide. Every expectation below is
  // hard-coded against that width — deliberately no layout-helper imports —
  // so this measures Ink's real chrome for borderStyle="round" + paddingX={1}
  // instead of re-asserting our own arithmetic.
  const TERMINAL_WIDTH = 100;

  it('fits a body line of exactly W-4 = 96 cells on one line with the border intact at column 100', () => {
    const body = 'z'.repeat(TERMINAL_WIDTH - 4);
    const response = createMockResponse({ body });
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={response} contentWidthOverride={96} />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');

    const bodyLines = lines.filter((line) => line.includes(body));
    expect(bodyLines.length).toBe(1);
    expect(frame).not.toContain('…');
    for (const line of lines) {
      expect(stringWidth(line)).toBe(TERMINAL_WIDTH);
    }
    // border (1) + padding (1) + 96 content cells + padding (1) + border (1) = 100:
    // the true horizontal chrome of the response box is 4 cells.
    expect(bodyLines[0]).toBe(`│ ${body} │`);
  });

  it('does not fit a body line of W-3 = 97 cells cleanly under the same conditions', () => {
    const body = 'z'.repeat(TERMINAL_WIDTH - 3);
    const response = createMockResponse({ body });
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={response} contentWidthOverride={96} />,
    );
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');

    expect(lines.some((line) => line.includes(body))).toBe(false);
    const truncated = frame.includes('…');
    const wrapped = lines.filter((line) => line.includes('z')).length > 1;
    expect(truncated || wrapped).toBe(true);
    for (const line of lines) {
      expect(stringWidth(line)).toBe(TERMINAL_WIDTH);
    }
  });
});

describe('search markers', () => {
  it('places ► on the matching body line under wrap, verbose, a long header, and a long preceding body line', () => {
    const longHeaderValue = 'a'.repeat(120);
    const longBodyLine = 'xyz '.repeat(30).trim();
    const matchLine = 'here is the needle target';
    const body = [longBodyLine, matchLine, 'trailing'].join('\n');
    const response = createMockResponse({
      body,
      headers: { 'x-trace-id': longHeaderValue },
    });

    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        verbose={true}
        wrapMode={'wrap' as const}
        searchMatches={[1]}
        currentMatchIndex={0}
        lastSearchQuery="needle"
        contentWidthOverride={40}
        availableHeight={40}
      />,
    );

    const markerLine = (lastFrame() ?? '').split('\n').find((line) => line.includes('►'));
    assertDefinedToNarrowType(markerLine, 'Expected a search-marked body line to be defined');
    expect(markerLine).toContain('needle');
  });

  it('places ► on the matching body line when wrap is disabled', () => {
    const matchLine = 'here is the needle target';
    const response = createMockResponse({ body: ['alpha', matchLine, 'beta'].join('\n') });

    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        searchMatches={[1]}
        currentMatchIndex={0}
        lastSearchQuery="needle"
      />,
    );

    const markerLine = (lastFrame() ?? '').split('\n').find((line) => line.includes('►'));
    assertDefinedToNarrowType(markerLine, 'Expected a search-marked body line to be defined');
    expect(markerLine).toContain('needle');
  });

  it('marks the current search match line with ►', () => {
    // Body: 3 lines — apple, banana, cherry
    // Layout: VL0=status, VL1=separator, VL2=apple, VL3=banana, VL4=cherry
    // bodyVisualStart = [2, 3, 4]
    // searchMatches=[0,2] -> matchVisualIndices={2,4}
    // currentMatchIndex=0 -> currentMatchVisualIndex=bodyVisualStart[0]=2
    // VL2 is current -> ►, VL4 is non-current -> ·
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        searchMatches={[0, 2]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('►');
  });

  it('marks non-current search match lines with ·', () => {
    // searchMatches=[0,1,2], currentMatchIndex=0 -> current at VL2
    // scrollOffset=3 -> slice starts at VL3 (banana), VL4 (cherry)
    // Both are non-current matches -> · marker, no ► in visible slice
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        searchMatches={[0, 1, 2]}
        currentMatchIndex={0}
        scrollOffset={3}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('·');
    expect(frame).not.toContain('►');
  });
});

describe('search bar', () => {
  it('shows / and the query while typing in search mode', () => {
    // isSearchMode=true -> search bar renders "/{searchQuery}_  (Esc to cancel)"
    const { lastFrame } = render(
      <ResponseView {...baseProps} isSearchMode={true} searchQuery="world" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/world');
  });

  it('shows the match position indicator after search', () => {
    // isSearchMode=false, lastSearchQuery="a", searchMatches=[0,1,2], currentMatchIndex=0
    // -> matchInfo = "[1/3]" (currentMatchIndex+1=1, searchMatches.length=3)
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        lastSearchQuery="a"
        searchMatches={[0, 1, 2]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[1/3]');
  });

  it('indicates no matches when searchMatches is empty', () => {
    // lastSearchQuery="xyz", searchMatches=[] -> matchInfo = "[No matches]"
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        lastSearchQuery="xyz"
        searchMatches={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[No matches]');
  });
});
