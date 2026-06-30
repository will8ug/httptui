import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { RequestList } from '../../src/components/RequestList';
import type { FileVariable } from '../../src/core/types';
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