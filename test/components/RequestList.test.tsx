import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { RequestList } from '../../src/components/RequestList';
import type { FileVariable } from '../../src/core/types';
import { assertDefinedToNarrowType } from '../helpers/assertions';
import { createRequest } from '../helpers/requests';

afterEach(() => {
  cleanup();
});

describe('RequestList variable resolution', () => {
  it('renders resolved path for a file variable', () => {
    const variables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.example.com' }];
    const request = createRequest({ url: '{{baseUrl}}/posts' });

    const { lastFrame } = render(
      <RequestList
        requests={[request]}
        selectedIndex={0}
        focused={true}
        scrollOffset={0}
        horizontalOffset={0}
        variables={variables}
      />,
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('GET');
    expect(frame).toContain('/posts');
    expect(frame).not.toContain('{{baseUrl}}');
  });

  it('renders resolved path for nested file variables', () => {
    const variables: FileVariable[] = [
      { name: 'hostname', value: 'api.example.com' },
      { name: 'baseUrl', value: 'https://{{hostname}}' },
    ];
    const request = createRequest({ url: '{{baseUrl}}/posts' });

    const { lastFrame } = render(
      <RequestList
        requests={[request]}
        selectedIndex={0}
        focused={true}
        scrollOffset={0}
        horizontalOffset={0}
        variables={variables}
      />,
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('/posts');
    expect(frame).not.toContain('{{baseUrl}}');
    expect(frame).not.toContain('{{hostname}}');
  });

  it('preserves raw URL when variable is unresolved', () => {
    const request = createRequest({ url: '{{unknown}}/posts' });

    const { lastFrame } = render(
      <RequestList
        requests={[request]}
        selectedIndex={0}
        focused={true}
        scrollOffset={0}
        horizontalOffset={0}
        variables={[]}
      />,
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('{{unknown}}');
    expect(frame).not.toContain('https://');
  });
});

describe('RequestList selection and horizontal shift', () => {
  it('highlights the selected request with ▸', () => {
    const requests = [
      createRequest({ url: 'https://a.co/u/1', lineNumber: 1 }),
      createRequest({ url: 'https://a.co/u/2', lineNumber: 2 }),
      createRequest({ url: 'https://a.co/u/3', lineNumber: 3 }),
    ];

    const { lastFrame } = render(
      <RequestList
        requests={requests}
        selectedIndex={1}
        focused={true}
        scrollOffset={0}
        horizontalOffset={0}
        variables={[]}
      />,
    );

    const selectedLine = (lastFrame() ?? '').split('\n').find((line) => line.includes('▸'));
    assertDefinedToNarrowType(selectedLine, 'Expected a highlighted request line to be defined');
    expect(selectedLine).toContain('/u/2');
    expect(selectedLine).not.toContain('/u/1');
    expect(selectedLine).not.toContain('/u/3');
  });

  it('clips leading characters when horizontalOffset is greater than 0', () => {
    const request = createRequest({
      url: 'https://example.com/ABCDEFGHIJ/TAIL_UNIQUE',
    });

    const { lastFrame } = render(
      <RequestList
        requests={[request]}
        selectedIndex={0}
        focused={true}
        scrollOffset={0}
        horizontalOffset={21}
        variables={[]}
        contentWidthOverride={40}
      />,
    );

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('ABCDEFGHIJ');
    expect(frame).toContain('TAIL_UNIQUE');
  });
});
