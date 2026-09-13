import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from 'ink-testing-library';

const { agentMock, requestMock, exitMock, suspendMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
  exitMock: vi.fn(),
  suspendMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  const actualUseApp = actual.useApp;
  return {
    ...actual,
    useApp: () => ({ ...actualUseApp(), exit: exitMock, suspendTerminal: suspendMock }),
  };
});

import {
  CTRL_G,
  CTRL_S,
  ENTER,
  ESC,
  KEY_DELAY_MS,
  SHIFT_TAB,
  TAB,
  delay,
  makeShortUrlRequests,
  press,
  renderApp,
  selectedLine,
} from '../helpers/integration';
import { createRequest } from '../helpers/requests';

const CTRL_C = '\u0003';
const MATCH_LINE = 'here is the needle target';
const THREE_MATCH_BODY = [
  'first needle line',
  'filler one',
  'second needle line',
  'filler two',
  'third needle line',
].join('\n');
const ABSENT_QUERY = 'zzz-absent';
const SCROLLABLE_BODY = Array.from({ length: 60 }, (_, i) => `row-${String(i + 1).padStart(2, '0')}`).join('\n');
const TRACE_HEADER = 'x-trace-id';

type Stdin = { write: (data: string) => void };

function stubResponse(body: string, headers: Record<string, string> = {}): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers,
    body: {
      text: async () => body,
    },
  });
}

async function loadResponse(stdin: Stdin, body: string, headers: Record<string, string> = {}): Promise<void> {
  stubResponse(body, headers);
  await press(stdin, ENTER);
  await delay(KEY_DELAY_MS * 4);
}

async function searchFor(stdin: Stdin, query: string): Promise<void> {
  await press(stdin, '/');
  for (const ch of query) {
    await press(stdin, ch);
  }
  await press(stdin, ENTER);
}

async function commitDirtyEdit(stdin: Stdin): Promise<void> {
  await press(stdin, 'e');
  await press(stdin, SHIFT_TAB);
  await press(stdin, SHIFT_TAB);
  await press(stdin, 'X');
  await press(stdin, CTRL_S);
}

async function maximizeDetails(stdin: Stdin): Promise<void> {
  await press(stdin, 'd');
  await press(stdin, TAB);
  await press(stdin, 'f');
}

function expectRequestsMaximized(frame: string): void {
  expect(frame).toContain('Requests');
  expect(frame).not.toContain('Response');
  expect(frame).not.toContain('Request Details');
}

function expectResponseMaximized(frame: string): void {
  expect(frame).toContain('Response');
  expect(frame).not.toContain('Requests');
}

function expectDetailsMaximized(frame: string): void {
  expect(frame).toContain('Request Details');
  expect(frame).not.toContain('Requests');
  expect(frame).not.toContain('Response');
}

function makeDirtyEditRequests() {
  return [
    createRequest({
      name: 'create',
      method: 'POST',
      url: 'https://example.com/users',
      body: 'original-body',
    }),
  ];
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
  exitMock.mockClear();
  suspendMock.mockClear();
});

describe('fullscreen universal keys', () => {
  it('j and k move the selection while the requests panel is maximized', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, 'j');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');

    await press(stdin, 'k');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');
    expectRequestsMaximized(lastFrame() ?? '');
  });

  it('G jumps to the bottom of a maximized response', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, SCROLLABLE_BODY);

    await press(stdin, TAB);
    await press(stdin, 'f');
    const topFrame = lastFrame() ?? '';
    expectResponseMaximized(topFrame);
    expect(topFrame).toContain('row-01');

    await press(stdin, 'G');
    await delay(KEY_DELAY_MS);
    const bottomFrame = lastFrame() ?? '';
    expect(bottomFrame).toContain('row-60');
    expect(bottomFrame).not.toContain('row-01');
    expectResponseMaximized(bottomFrame);
  });

  it('? opens help over fullscreen and closing it restores the maximized panel', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, '?');
    expect(lastFrame() ?? '').toContain('Quit application');

    await press(stdin, '?');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Quit application');
    expectRequestsMaximized(frame);
  });

  it('Ctrl+C exits the application from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, CTRL_C);
    expect(exitMock).toHaveBeenCalledTimes(1);
  });
});

describe('fullscreen action keys are no-ops', () => {
  it('Enter in a maximized response does not send the request', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, TAB);
    await press(stdin, 'f');
    expectResponseMaximized(lastFrame() ?? '');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Sending request');
    expect(requestMock).not.toHaveBeenCalled();
    expectResponseMaximized(frame);
  });

  it('Enter in a maximized request list does not send the request', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Sending request');
    expect(requestMock).not.toHaveBeenCalled();
    expectRequestsMaximized(frame);
  });

  it('o does not open the file-load overlay from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'o');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Open File');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('Ctrl+G does not suspend the terminal or open an editor from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, CTRL_G);
    await delay(KEY_DELAY_MS * 2);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('ENOENT');
    expect(frame).toEqual(before);
    expect(suspendMock).not.toHaveBeenCalled();
    expectRequestsMaximized(frame);
  });

  it('s does not save the response from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 's');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('No response to save');
    expect(frame).not.toContain('Save response');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('S does not open the save-as overlay from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'S');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Save as .http');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('p does not paste from the clipboard from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'p');
    await delay(KEY_DELAY_MS * 2);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Pasted request');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('y does not copy as curl from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'y');
    await delay(KEY_DELAY_MS * 2);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Copied as curl');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('E does not switch environments from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'E');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).not.toContain('No environments configured');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('e does not open the request editor from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'e');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Edit Request');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('R does not reload the file from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, 'R');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Reloaded');
    expect(frame).not.toContain('ENOENT');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });

  it('Ctrl+S does not open the in-place save confirmation from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';

    await press(stdin, CTRL_S);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('No changes to save');
    expect(frame).not.toContain('y to save');
    expect(frame).toEqual(before);
    expectRequestsMaximized(frame);
  });
});

describe('fullscreen q behavior', () => {
  it('q without search results does not quit from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    await press(stdin, 'q');
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('[Enter] Send');
    expectRequestsMaximized(frame);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('q with unsaved edits opens no discard confirmation from fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeDirtyEditRequests() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);
    expect(lastFrame() ?? '').toContain('*test.http');

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'q');
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Unsaved Changes');
    expect(frame).toContain('*test.http');
    expectRequestsMaximized(frame);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('q quits after f leaves fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');
    expect(exitMock).not.toHaveBeenCalled();

    await press(stdin, 'f');
    expect(lastFrame() ?? '').toContain('Response');

    await press(stdin, 'q');
    expect(exitMock).toHaveBeenCalledTimes(1);
  });

  it('q with displayed results in a maximized response dismisses them and stays fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await searchFor(stdin, 'needle');
    await press(stdin, 'f');
    const fullscreenFrame = lastFrame() ?? '';
    expectResponseMaximized(fullscreenFrame);
    expect(fullscreenFrame).toContain('(Esc to dismiss)');

    await press(stdin, 'q');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('(Esc to dismiss)');
    expectResponseMaximized(frame);
    expect(exitMock).not.toHaveBeenCalled();
  });
});

describe('fullscreen display toggles', () => {
  it('w toggles wrap in a maximized response and the title shows Response [wrap]', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await press(stdin, TAB);
    await press(stdin, 'f');
    expectResponseMaximized(lastFrame() ?? '');

    await press(stdin, 'w');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Response [wrap]');
    expectResponseMaximized(frame);
  });

  it('v, r, and w are no-ops while the requests panel is maximized', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE, { [TRACE_HEADER]: 'trace-value' });

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'v');
    await press(stdin, 'r');
    await press(stdin, 'w');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Response');
    expect(frame).not.toContain('[wrap]');
    expect(frame).not.toContain('[raw]');
    expect(frame).not.toContain(TRACE_HEADER);
  });

  it('v, r, and w are no-ops while the details panel is maximized', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE, { [TRACE_HEADER]: 'trace-value' });

    await maximizeDetails(stdin);
    expectDetailsMaximized(lastFrame() ?? '');

    await press(stdin, 'v');
    await press(stdin, 'r');
    await press(stdin, 'w');
    expectDetailsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request Details');
    expect(frame).toContain('Response');
    expect(frame).not.toContain('[wrap]');
    expect(frame).not.toContain('[raw]');
    expect(frame).not.toContain(TRACE_HEADER);
  });
});

describe('fullscreen search keys', () => {
  it('/ in a maximized request list does not enter search mode', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await press(stdin, 'f');
    const before = lastFrame() ?? '';
    expectRequestsMaximized(before);

    await press(stdin, '/');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('(Esc to cancel)');
    expect(frame).toEqual(before);

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    expect(lastFrame() ?? '').toContain('Response');
  });

  it('/ in a maximized details panel does not enter search mode', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await maximizeDetails(stdin);
    const before = lastFrame() ?? '';
    expectDetailsMaximized(before);

    await press(stdin, '/');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('(Esc to cancel)');
    expect(frame).toEqual(before);

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    expect(lastFrame() ?? '').toContain('Response');
  });

  it('/ in a maximized response enters search mode', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await press(stdin, TAB);
    await press(stdin, 'f');
    expectResponseMaximized(lastFrame() ?? '');

    await press(stdin, '/');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('(Esc to cancel)');
    expectResponseMaximized(frame);
  });

  it('n in a maximized request list leaves the match index unchanged', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    expect(lastFrame() ?? '').toContain('[1/3]');

    await press(stdin, TAB);
    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'n');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[1/3]');
    expect(frame).not.toContain('[2/3]');
    expect(frame).toContain('(Esc to dismiss)');
  });

  it('N in a maximized request list leaves the match index unchanged', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    expect(lastFrame() ?? '').toContain('[1/3]');

    await press(stdin, TAB);
    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'N');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[1/3]');
    expect(frame).not.toContain('[3/3]');
    expect(frame).toContain('(Esc to dismiss)');
  });
});

describe('fullscreen details toggle is a no-op', () => {
  it('d in a maximized request list leaves the details panel hidden', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'd');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    expect(lastFrame() ?? '').not.toContain('Request Details');
  });

  it('d in a maximized details panel leaves the details panel maximized and visible', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await maximizeDetails(stdin);
    expectDetailsMaximized(lastFrame() ?? '');

    await press(stdin, 'd');
    expectDetailsMaximized(lastFrame() ?? '');

    await press(stdin, 'f');
    expect(lastFrame() ?? '').toContain('Request Details');
  });
});

describe('fullscreen Escape priority', () => {
  it('the first Escape clears active results staying fullscreen and the second exits', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    await press(stdin, 'f');
    const fullscreenFrame = lastFrame() ?? '';
    expectResponseMaximized(fullscreenFrame);
    expect(fullscreenFrame).toContain('(Esc to dismiss)');
    expect(fullscreenFrame).toContain('[1/3]');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    const clearedFrame = lastFrame() ?? '';
    expect(clearedFrame).not.toContain('(Esc to dismiss)');
    expect(clearedFrame).not.toContain('[1/3]');
    expectResponseMaximized(clearedFrame);

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    expect(lastFrame() ?? '').toContain('Requests');
  });

  it('Escape clears a no-match search bar and keeps the response maximized', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, MATCH_LINE);

    await searchFor(stdin, ABSENT_QUERY);
    expect(lastFrame() ?? '').toContain('[No matches]');

    await press(stdin, 'f');
    const fullscreenFrame = lastFrame() ?? '';
    expectResponseMaximized(fullscreenFrame);
    expect(fullscreenFrame).toContain('[No matches]');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('[No matches]');
    expect(frame).not.toContain('(Esc to dismiss)');
    expectResponseMaximized(frame);
  });

  it('Escape in a maximized request list exits fullscreen and keeps the search bar', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    await press(stdin, TAB);
    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Requests');
    expect(frame).toContain('Response');
    expect(frame).toContain('(Esc to dismiss)');
    expect(frame).toContain('[1/3]');
  });
});
