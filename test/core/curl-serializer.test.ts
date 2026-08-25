import { describe, expect, it } from 'vitest';

import { toCurlCommand } from '../../src/core/curl-serializer';
import { createResolvedRequest } from '../helpers/requests';

const noTls = { insecure: false };

describe('toCurlCommand', () => {
  describe('method flag mapping', () => {
    it('serializes a simple GET request with no method flag, headers, body, or TLS flags', () => {
      const request = createResolvedRequest({ method: 'GET', url: 'https://api.example.com/users' });

      expect(toCurlCommand(request, noTls)).toBe(`curl 'https://api.example.com/users'`);
    });

    it('emits -I for HEAD and not -X HEAD', () => {
      const request = createResolvedRequest({ method: 'HEAD', url: 'https://api.example.com/users' });

      const command = toCurlCommand(request, noTls);

      expect(command).toBe(`curl -I 'https://api.example.com/users'`);
      expect(command).not.toContain('-X');
    });

    it('emits -X POST for POST', () => {
      const request = createResolvedRequest({ method: 'POST' });

      expect(toCurlCommand(request, noTls)).toBe(`curl -X POST 'https://example.com/api'`);
    });

    it('emits -X <METHOD> for every other method', () => {
      const request = createResolvedRequest({ method: 'DELETE' });

      expect(toCurlCommand(request, noTls)).toBe(`curl -X DELETE 'https://example.com/api'`);
    });
  });

  describe('resolved request input', () => {
    it('emits resolved URL and header values with no leftover placeholders', () => {
      const request = createResolvedRequest({
        url: 'https://api.example.com/users',
        headers: { Authorization: 'Bearer sk-live-abc123' },
      });

      const command = toCurlCommand(request, noTls);

      expect(command).toContain(`'https://api.example.com/users'`);
      expect(command).toContain(`-H 'Authorization: Bearer sk-live-abc123'`);
      expect(command).not.toContain('{{');
    });
  });

  describe('header serialization', () => {
    it('preserves original casing and insertion order', () => {
      const request = createResolvedRequest({
        headers: { 'Accept-Encoding': 'gzip', 'X-Custom-Flag': '1' },
      });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl 'https://example.com/api' -H 'Accept-Encoding: gzip' -H 'X-Custom-Flag: 1'`,
      );
    });
  });

  describe('raw body serialization', () => {
    it('emits a multi-line pretty-printed JSON body verbatim', () => {
      const body = '{\n  "name": "Alice"\n}';
      const request = createResolvedRequest({ method: 'POST', body });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' --data-raw '${body}'`,
      );
    });

    it('sends a body starting with @ literally via --data-raw', () => {
      const request = createResolvedRequest({ method: 'POST', body: '@literal-at-text' });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' --data-raw '@literal-at-text'`,
      );
    });

    it('emits no data flag when there is no body and no form-data', () => {
      const request = createResolvedRequest({ method: 'POST', body: undefined });

      const command = toCurlCommand(request, noTls);

      expect(command).toBe(`curl -X POST 'https://example.com/api'`);
      expect(command).not.toContain('--data-raw');
      expect(command).not.toContain('--form-string');
    });
  });

  describe('Content-Type emission', () => {
    it('adds no Content-Type for a JSON-looking body without one', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: '{"name":"Alice"}',
      });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' -H 'Authorization: Bearer token' --data-raw '{"name":"Alice"}'`,
      );
    });

    it('does not duplicate an explicit Content-Type header', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: '<xml/>',
      });

      const command = toCurlCommand(request, noTls);

      expect(command).toContain(`-H 'Content-Type: application/xml'`);
      expect(command.match(/Content-Type:/g)).toHaveLength(1);
      expect(command).not.toContain('application/json');
    });

    it('detects an existing Content-Type header case-insensitively', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{"name":"Alice"}',
      });

      const command = toCurlCommand(request, noTls);

      expect(command).toContain(`-H 'content-type: text/plain'`);
      expect(command).not.toContain('application/json');
    });

    it('adds no Content-Type for a non-JSON body without one', () => {
      const request = createResolvedRequest({ method: 'POST', body: 'plain text' });

      expect(toCurlCommand(request, noTls)).not.toMatch(/content-type/i);
    });
  });

  describe('form-data serialization', () => {
    it('emits one --form-string per field in order and omits the multipart Content-Type header', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer token',
        },
        body: undefined,
        formdataFields: [
          { key: 'username', value: 'alice', type: 'text' },
          { key: 'note', value: '@mention', type: 'text' },
        ],
      });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' -H 'Authorization: Bearer token' --form-string 'username=alice' --form-string 'note=@mention'`,
      );
    });

    it('omits a multipart Content-Type header regardless of name casing and boundary suffix', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: { 'content-type': 'Multipart/Form-Data; boundary=xyz' },
        body: undefined,
        formdataFields: [{ key: 'username', value: 'alice', type: 'text' }],
      });

      expect(toCurlCommand(request, noTls)).not.toMatch(/multipart/i);
    });

    it('omits any Content-Type header when form-data fields are present, not only multipart', () => {
      const request = createResolvedRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
        formdataFields: [{ key: 'username', value: 'alice', type: 'text' }],
      });

      const command = toCurlCommand(request, noTls);

      expect(command).not.toMatch(/content-type/i);
      expect(command).toContain(`--form-string 'username=alice'`);
    });

    it('treats an empty formdataFields array as no form-data, falling back to the body path', () => {
      const request = createResolvedRequest({
        method: 'POST',
        body: '{"name":"Alice"}',
        formdataFields: [],
      });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' --data-raw '{"name":"Alice"}'`,
      );
    });
  });

  describe('bash single-quote escaping', () => {
    it("escapes an embedded single quote in a header value as '\\''", () => {
      const request = createResolvedRequest({ headers: { 'X-Note': "it's fine" } });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl 'https://example.com/api' -H 'X-Note: it'\\''s fine'`,
      );
    });

    it('escapes an embedded single quote in the body', () => {
      const request = createResolvedRequest({ method: 'POST', body: `{"msg":"it's"}` });

      expect(toCurlCommand(request, noTls)).toBe(
        `curl -X POST 'https://example.com/api' --data-raw '{"msg":"it'\\''s"}'`,
      );
    });
  });

  describe('TLS options', () => {
    it('appends -k in insecure mode', () => {
      const request = createResolvedRequest();

      expect(toCurlCommand(request, { insecure: true })).toBe(`curl 'https://example.com/api' -k`);
    });

    it('appends PEM certificate paths as quoted --cert and --key arguments', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: false,
          certificate: { cert: '/certs/client.pem', key: '/certs/client.key' },
        }),
      ).toBe(`curl 'https://example.com/api' --cert '/certs/client.pem' --key '/certs/client.key'`);
    });

    it('appends PFX certificate path and passphrase as quoted --cert and --pass arguments', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: false,
          certificate: { pfx: '/certs/client.pfx', passphrase: 's3cret' },
        }),
      ).toBe(`curl 'https://example.com/api' --cert '/certs/client.pfx' --pass 's3cret'`);
    });

    it('quotes a certificate path containing a space', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: false,
          certificate: { cert: '/certs/my certs/client.pem', key: '/certs/my certs/client.key' },
        }),
      ).toBe(
        `curl 'https://example.com/api' --cert '/certs/my certs/client.pem' --key '/certs/my certs/client.key'`,
      );
    });

    it('escapes an embedded single quote in the certificate passphrase', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: false,
          certificate: { pfx: '/certs/client.pfx', passphrase: `p@a$s'word` },
        }),
      ).toBe(`curl 'https://example.com/api' --cert '/certs/client.pfx' --pass 'p@a$s'\\''word'`);
    });

    it('emits --cacert after the cert flags when a ca file is present', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: false,
          certificate: {
            cert: '/certs/client.pem',
            key: '/certs/client.key',
            ca: '/certs/ca.pem',
          },
        }),
      ).toBe(
        `curl 'https://example.com/api' --cert '/certs/client.pem' --key '/certs/client.key' --cacert '/certs/ca.pem'`,
      );
    });

    it('emits -k before the certificate flags when both apply', () => {
      const request = createResolvedRequest();

      expect(
        toCurlCommand(request, {
          insecure: true,
          certificate: { cert: '/certs/client.pem', key: '/certs/client.key' },
        }),
      ).toBe(`curl 'https://example.com/api' -k --cert '/certs/client.pem' --key '/certs/client.key'`);
    });

    it('emits no TLS, timeout, or redirect flags when none are configured', () => {
      const request = createResolvedRequest();

      const command = toCurlCommand(request, noTls);

      expect(command).toBe(`curl 'https://example.com/api'`);
      for (const flag of ['-k', '--cert', '--key', '--pass', '--cacert', '--max-time', '-L']) {
        expect(command).not.toContain(flag);
      }
    });
  });
});
