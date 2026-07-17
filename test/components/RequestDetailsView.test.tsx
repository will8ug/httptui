import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { RequestDetailsView } from '../../src/components/RequestDetailsView';
import type { FileVariable, FormDataParam } from '../../src/core/types';
import { createRequest } from '../helpers/requests';

afterEach(() => {
  cleanup();
});

const baseProps = {
  variables: [] as FileVariable[],
  maxHeight: 20,
  focused: true,
  scrollOffset: 0,
  horizontalOffset: 0,
};

describe('RequestDetailsView', () => {
  describe('content', () => {
    it('renders the Request Details title, method, and URL', () => {
      const request = createRequest({
        method: 'GET',
        url: 'https://api.example.com/users',
      });
      const { lastFrame } = render(
        <RequestDetailsView {...baseProps} contentWidthOverride={100} request={request} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Request Details');
      expect(frame).toContain('GET');
      expect(frame).toContain('https://api.example.com/users');
    });

    it('resolves {{baseUrl}} in the URL using matching variables', () => {
      const variables: FileVariable[] = [
        { name: 'baseUrl', value: 'https://api.example.com' },
      ];
      const request = createRequest({ url: '{{baseUrl}}/posts' });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          variables={variables}
          contentWidthOverride={100}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('https://api.example.com/posts');
      expect(frame).not.toContain('{{baseUrl}}');
    });

    it('renders headers as name: value lines', () => {
      const request = createRequest({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
      });
      const { lastFrame } = render(
        <RequestDetailsView {...baseProps} contentWidthOverride={100} request={request} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Content-Type: application/json');
      expect(frame).toContain('Authorization: Bearer token123');
    });

    it('renders formdata fields as key=value lines', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
        { key: 'password', value: 'secret', type: 'text' },
      ];
      const request = createRequest({ formdataFields });
      const { lastFrame } = render(
        <RequestDetailsView {...baseProps} contentWidthOverride={100} request={request} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('username=alice');
      expect(frame).toContain('password=secret');
    });

    it('renders the body content', () => {
      const request = createRequest({ body: '{"hello":"world"}' });
      const { lastFrame } = render(
        <RequestDetailsView {...baseProps} contentWidthOverride={100} request={request} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('{"hello":"world"}');
    });

    it('renders title, request line, headers, and body in order', () => {
      const request = createRequest({
        headers: { 'Content-Type': 'application/json' },
        body: '{"key":"value"}',
      });
      const { lastFrame } = render(
        <RequestDetailsView {...baseProps} contentWidthOverride={100} request={request} />,
      );
      const frame = lastFrame() ?? '';
      const titleIdx = frame.indexOf('Request Details');
      const urlIdx = frame.indexOf('https://api.example.com/users');
      const headerIdx = frame.indexOf('Content-Type: application/json');
      const bodyIdx = frame.indexOf('{"key":"value"}');
      expect(titleIdx).toBeLessThan(urlIdx);
      expect(urlIdx).toBeLessThan(headerIdx);
      expect(headerIdx).toBeLessThan(bodyIdx);
    });
  });

  describe('empty sections', () => {
    it('renders the request line without header or body sections when both are absent', () => {
      const contentWidth = 30;
      const request = createRequest({ headers: {}, body: undefined });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          contentWidthOverride={contentWidth}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Request Details');
      expect(frame).toContain('GET');
      expect(frame).toContain('api.example.com');
      expect(frame).not.toContain(': ');
      const separator = '─'.repeat(contentWidth - 1) + '…';
      const separatorCount = frame.split(separator).length - 1;
      expect(separatorCount).toBe(1);
    });
  });

  describe('scroll and overflow', () => {
    it('truncates a long URL at the content width', () => {
      const contentWidth = 20;
      const longUrl = 'https://example.com/' + 'x'.repeat(50);
      const request = createRequest({ url: longUrl });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          contentWidthOverride={contentWidth}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      const availableUrlWidth = contentWidth - 'GET'.length - 1;
      expect(frame).toContain(longUrl.slice(0, availableUrlWidth - 1) + '…');
      expect(frame).not.toContain(longUrl);
    });

    it('truncates long body lines at the content width', () => {
      const contentWidth = 20;
      const longBody = 'y'.repeat(100);
      const request = createRequest({ body: longBody });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          contentWidthOverride={contentWidth}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('y'.repeat(contentWidth - 1) + '…');
      expect(frame).not.toContain(longBody);
    });

    it('truncates long header values at the content width', () => {
      const contentWidth = 20;
      const headerName = 'X-Long';
      const longValue = 'z'.repeat(100);
      const request = createRequest({ headers: { [headerName]: longValue } });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          contentWidthOverride={contentWidth}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      const availableValueWidth = contentWidth - headerName.length - 2;
      expect(frame).toContain('z'.repeat(availableValueWidth - 1) + '…');
      expect(frame).not.toContain(longValue);
    });

    it('shifts shiftable lines left when horizontalOffset is greater than zero', () => {
      const requestLineText = 'GET https://api.example.com/users';
      const request = createRequest({ url: 'https://api.example.com/users' });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          contentWidthOverride={50}
          horizontalOffset={16}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('https://api.example.com/users');
      expect(frame).toContain(requestLineText.slice(16));
    });

    it('shows only the visible slice when content exceeds maxHeight with non-zero scrollOffset', () => {
      const request = createRequest({
        headers: {
          'Header-A': 'value-a',
          'Header-B': 'value-b',
          'Header-C': 'value-c',
        },
        body: 'body-line-1\nbody-line-2\nbody-line-3\nbody-line-4',
      });
      const { lastFrame } = render(
        <RequestDetailsView
          {...baseProps}
          maxHeight={4}
          scrollOffset={5}
          contentWidthOverride={100}
          request={request}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Request Details');
      expect(frame).not.toContain('value-a');
      expect(frame).not.toContain('value-b');
      expect(frame).toContain('value-c');
      expect(frame).toContain('body-line-1');
      expect(frame).toContain('body-line-2');
      expect(frame).not.toContain('body-line-3');
      expect(frame).not.toContain('body-line-4');
    });
  });
});
