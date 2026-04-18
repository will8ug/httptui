import { describe, expect, it } from 'vitest';

import { getDetailsTotalLines, getMaxScrollOffset, getResponseTotalLines, RESPONSE_PANEL_VERTICAL_CHROME } from '../src/utils/scroll';
import { getResponseContentWidth } from '../src/utils/layout';

describe('scroll utilities', () => {
  describe('getMaxScrollOffset', () => {
    it('returns 0 when content fits within visible area', () => {
      expect(getMaxScrollOffset(5, 10)).toBe(0);
    });

    it('returns difference when content exceeds visible area', () => {
      expect(getMaxScrollOffset(20, 10)).toBe(10);
    });

    it('returns 0 when content equals visible area', () => {
      expect(getMaxScrollOffset(10, 10)).toBe(0);
    });

    it('handles totalLines less than visibleHeight', () => {
      expect(getMaxScrollOffset(3, 10)).toBe(0);
    });
  });

  describe('getDetailsTotalLines', () => {
    it('counts title, method/URL, separator, and body', () => {
      const result = getDetailsTotalLines({
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {},
        body: 'line1\nline2',
      });
      expect(result).toBe(3 + 0 + 0 + 2);
    });

    it('counts headers and header separator', () => {
      const result = getDetailsTotalLines({
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'content-type': 'application/json' },
        body: undefined,
      });
      expect(result).toBe(3 + 1 + 1 + 0);
    });

    it('counts body with no headers', () => {
      const result = getDetailsTotalLines({
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {},
        body: undefined,
      });
      expect(result).toBe(3);
    });
  });

  describe('getResponseTotalLines', () => {
    const columns = 80;
    const contentWidth = getResponseContentWidth(columns);

    it('counts status + separator + body in nowrap mode', () => {
      const result = getResponseTotalLines({
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {},
          body: 'line1\nline2\nline3',
          timing: { durationMs: 100 },
        },
        verbose: false,
        rawMode: false,
        wrapMode: 'nowrap',
        columns,
      });
      expect(result).toBe(1 + 1 + 3);
    });

    it('counts verbose headers in nowrap mode', () => {
      const result = getResponseTotalLines({
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: 'hello',
          timing: { durationMs: 100 },
        },
        verbose: true,
        rawMode: false,
        wrapMode: 'nowrap',
        columns,
      });
      expect(result).toBe(1 + 1 + 1 + 1);
    });

    it('counts wrapped lines in wrap mode', () => {
      const result = getResponseTotalLines({
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {},
          body: 'short',
          timing: { durationMs: 100 },
        },
        verbose: false,
        rawMode: false,
        wrapMode: 'wrap',
        columns,
      });
      expect(result).toBeGreaterThanOrEqual(3);
    });

    it('RESPONSE_PANEL_VERTICAL_CHROME equals 3', () => {
      expect(RESPONSE_PANEL_VERTICAL_CHROME).toBe(3);
    });
  });
});