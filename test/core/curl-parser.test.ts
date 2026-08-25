import { describe, expect, it } from 'vitest';

import { parseCurlCommand } from '../../src/core/curl-parser';
import { toCurlCommand } from '../../src/core/curl-serializer';
import type { ResolvedRequest } from '../../src/core/types';
import { createResolvedRequest } from '../helpers/requests';

function parseOk(text: string) {
  const result = parseCurlCommand(text);
  if (!result.ok) {
    throw new Error(`expected successful parse, got refusal: ${result.error}`);
  }
  return result;
}

describe('parseCurlCommand', () => {
  describe('tokenization', () => {
    it('decodes single-quoted and double-quoted args joined by backslash-newline continuations', () => {
      const command = [
        `curl 'https://api.example.com/users' \\`,
        `  -H "Accept: application/json" \\`,
        `  --data-raw '{"name":"Alice"}'`,
      ].join('\n');

      const { request, skipped } = parseOk(command);

      expect(request.url).toBe('https://api.example.com/users');
      expect(request.headers['Accept']).toBe('application/json');
      expect(request.body).toBe('{"name":"Alice"}');
      expect(skipped).toBe(false);
    });

    it("decodes the copy-as-curl quote idiom '\\'' as a literal single quote", () => {
      const command = "curl -H 'X-Note: it'\\''s fine' 'https://api.example.com/api'";

      const { request } = parseOk(command);

      expect(request.headers['X-Note']).toBe("it's fine");
    });

    it('applies backslash escapes in unquoted and double-quoted arguments', () => {
      const command = `curl 'https://x.example' -H "X-A: a\\"b" -H X-B:\\ c\\ d`;

      const { request } = parseOk(command);

      expect(request.headers['X-A']).toBe('a"b');
      expect(request.headers['X-B']).toBe('c d');
    });

    it('treats $ literally everywhere with no expansion', () => {
      const command = `curl 'https://x.example' -H 'X-Token: $TOKEN' -H X-Unquoted:$USER`;

      const { request } = parseOk(command);

      expect(request.headers['X-Token']).toBe('$TOKEN');
      expect(request.headers['X-Unquoted']).toBe('$USER');
    });

    it('preserves newlines inside quoted arguments', () => {
      const body = '{\n  "name": "Alice"\n}';
      const command = `curl -X POST 'https://api.example.com/users' --data-raw '${body}'`;

      const { request } = parseOk(command);

      expect(request.body).toBe(body);
    });

    it('separates tokens on any unquoted whitespace including tabs', () => {
      const command = `curl\t'https://x.example'\t-X\tPOST`;

      const { request } = parseOk(command);

      expect(request.url).toBe('https://x.example');
      expect(request.method).toBe('POST');
    });
  });

  describe('simple GET command', () => {
    it('parses method GET, the url, and a clean skipped flag', () => {
      const { request, skipped } = parseOk(`curl 'https://api.example.com/users'`);

      expect(request.method).toBe('GET');
      expect(request.url).toBe('https://api.example.com/users');
      expect(request.headers).toEqual({});
      expect(request.body).toBeUndefined();
      expect(skipped).toBe(false);
    });

    it('marks the request dirty with the lineNumber placeholder', () => {
      const { request } = parseOk(`curl 'https://api.example.com/users'`);

      expect(request.isDirty).toBe(true);
      expect(request.lineNumber).toBe(0);
    });
  });

  describe('POST with headers and body', () => {
    it('parses the method, header, and body from a Chrome DevTools style command', () => {
      const command = `curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' --data-raw '{"name":"Alice"}'`;

      const { request, skipped } = parseOk(command);

      expect(request.method).toBe('POST');
      expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(request.body).toBe('{"name":"Alice"}');
      expect(skipped).toBe(false);
    });
  });

  describe('repeated data flags', () => {
    it('concatenates repeated -d arguments with &', () => {
      const { request } = parseOk(`curl -d 'a=1' -d 'b=2' 'https://api.example.com'`);

      expect(request.body).toBe('a=1&b=2');
    });

    it('accepts --data, --data-raw, and --data-binary interchangeably', () => {
      const { request } = parseOk(
        `curl --data 'a=1' --data-raw 'b=2' --data-binary 'c=3' 'https://api.example.com'`,
      );

      expect(request.body).toBe('a=1&b=2&c=3');
    });

    it('keeps an explicit empty -d argument as an empty body', () => {
      const { request } = parseOk(`curl -d '' 'https://api.example.com'`);

      expect(request.body).toBe('');
    });
  });

  describe('HEAD from -I', () => {
    it('derives HEAD from -I', () => {
      const { request, skipped } = parseOk(`curl -I 'https://api.example.com'`);

      expect(request.method).toBe('HEAD');
      expect(skipped).toBe(false);
    });

    it('derives HEAD from --head', () => {
      const { request } = parseOk(`curl --head 'https://api.example.com'`);

      expect(request.method).toBe('HEAD');
    });

    it('lets -X and -I set the method with last-wins ordering', () => {
      expect(parseOk(`curl -X POST -I 'https://api.example.com'`).request.method).toBe('HEAD');
      expect(parseOk(`curl -I -X GET 'https://api.example.com'`).request.method).toBe('GET');
    });
  });

  describe('method defaults', () => {
    it('defaults to POST when data flags are present without an explicit method', () => {
      const { request } = parseOk(`curl -d 'a=1' 'https://api.example.com'`);

      expect(request.method).toBe('POST');
      expect(request.body).toBe('a=1');
    });

    it('defaults to POST when form flags are present without an explicit method', () => {
      const { request } = parseOk(`curl -F 'username=alice' 'https://api.example.com'`);

      expect(request.method).toBe('POST');
    });

    it('defaults to GET for a bare curl url command', () => {
      const { request } = parseOk(`curl https://api.example.com/health`);

      expect(request.method).toBe('GET');
    });

    it('uppercases the -X value', () => {
      const { request } = parseOk(`curl -X put 'https://api.example.com/item/1'`);

      expect(request.method).toBe('PUT');
    });

    it('keeps an explicit method even when data flags are present', () => {
      const { request } = parseOk(`curl -X DELETE -d 'a=1' 'https://api.example.com/item/1'`);

      expect(request.method).toBe('DELETE');
    });
  });

  describe('silent conversions', () => {
    it('converts -u user:password to a Basic Authorization header without warning', () => {
      const { request, skipped } = parseOk(`curl -u 'alice:secret' 'https://api.example.com'`);

      expect(request.headers['Authorization']).toBe(
        `Basic ${Buffer.from('alice:secret').toString('base64')}`,
      );
      expect(skipped).toBe(false);
    });

    it('keeps colons inside the -u password in the base64 credentials', () => {
      const { request } = parseOk(`curl -u 'alice:se:cret' 'https://api.example.com'`);

      expect(request.headers['Authorization']).toBe(
        `Basic ${Buffer.from('alice:se:cret').toString('base64')}`,
      );
    });

    it('skips -u without a colon with a warning instead of converting', () => {
      const { request, skipped } = parseOk(`curl -u 'alice' 'https://api.example.com'`);

      expect(request.headers['Authorization']).toBeUndefined();
      expect(skipped).toBe(true);
      expect(request.url).toBe('https://api.example.com');
    });

    it('converts a -b cookie string to a Cookie header without warning', () => {
      const { request, skipped } = parseOk(`curl -b 'session=abc' 'https://api.example.com'`);

      expect(request.headers['Cookie']).toBe('session=abc');
      expect(skipped).toBe(false);
    });

    it('skips a -b file reference with a warning', () => {
      const { request, skipped } = parseOk(`curl -b '@cookies.txt' 'https://api.example.com'`);

      expect(request.headers['Cookie']).toBeUndefined();
      expect(skipped).toBe(true);
    });

    it('converts --json to Accept, Content-Type, body, and a POST default', () => {
      const { request, skipped } = parseOk(`curl --json '{"a":1}' 'https://api.example.com'`);

      expect(request.method).toBe('POST');
      expect(request.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
      expect(request.body).toBe('{"a":1}');
      expect(skipped).toBe(false);
    });

    it('skips a --json file reference with a warning', () => {
      const { request, skipped } = parseOk(`curl --json '@payload.json' 'https://api.example.com'`);

      expect(request.headers).toEqual({});
      expect(request.body).toBeUndefined();
      expect(skipped).toBe(true);
    });

    it('converts -A to a User-Agent header without warning', () => {
      const { request, skipped } = parseOk(`curl -A 'Mozilla/5.0' 'https://api.example.com'`);

      expect(request.headers['User-Agent']).toBe('Mozilla/5.0');
      expect(skipped).toBe(false);
    });

    it('converts -e to a Referer header without warning', () => {
      const { request, skipped } = parseOk(
        `curl -e 'https://example.com/page' 'https://api.example.com'`,
      );

      expect(request.headers['Referer']).toBe('https://example.com/page');
      expect(skipped).toBe(false);
    });
  });

  describe('header arguments', () => {
    it('splits at the first colon and trims name and value', () => {
      const { request } = parseOk(`curl -H 'X-Custom:  spaced value ' 'https://x.example'`);

      expect(request.headers).toEqual({ 'X-Custom': 'spaced value' });
    });

    it('keeps a colon-containing value intact after the first colon', () => {
      const { request } = parseOk(`curl -H 'X-Time: 12:30:00' 'https://x.example'`);

      expect(request.headers).toEqual({ 'X-Time': '12:30:00' });
    });

    it('drops a -H argument without a colon and sets the warning flag', () => {
      const { request, skipped } = parseOk(`curl -H 'X-No-Colon' 'https://x.example'`);

      expect(request.headers).toEqual({});
      expect(skipped).toBe(true);
    });

    it('applies repeated header names with last-wins record semantics', () => {
      const { request } = parseOk(
        `curl -H 'X-Env: dev' -H 'X-Env: prod' 'https://x.example'`,
      );

      expect(request.headers).toEqual({ 'X-Env': 'prod' });
    });

    it('preserves first-appearance order across distinct header names', () => {
      const { request } = parseOk(
        `curl -H 'B-Second: 2' -H 'A-First: 1' -H 'C-Third: 3' 'https://x.example'`,
      );

      expect(Object.keys(request.headers)).toEqual(['B-Second', 'A-First', 'C-Third']);
    });
  });

  describe('form data', () => {
    it('keeps text fields and drops @file fields with the warning flag', () => {
      const command = `curl -F 'username=alice' -F 'avatar=@/tmp/a.png' 'https://api.example.com/upload'`;

      const { request, skipped } = parseOk(command);

      expect(request.formdataFields).toEqual([{ key: 'username', value: 'alice', type: 'text' }]);
      expect(request.body).toBeUndefined();
      expect(request.method).toBe('POST');
      expect(skipped).toBe(true);
    });

    it('drops <file-backed form fields with the warning flag', () => {
      const { request, skipped } = parseOk(
        `curl -F 'plan=<input.txt' -F 'note=hello' 'https://api.example.com'`,
      );

      expect(request.formdataFields).toEqual([{ key: 'note', value: 'hello', type: 'text' }]);
      expect(skipped).toBe(true);
    });

    it('accepts --form and --form-string like -F', () => {
      const { request, skipped } = parseOk(
        `curl --form 'a=1' --form-string 'b=2' 'https://api.example.com'`,
      );

      expect(request.formdataFields).toEqual([
        { key: 'a', value: '1', type: 'text' },
        { key: 'b', value: '2', type: 'text' },
      ]);
      expect(skipped).toBe(false);
    });

    it('drops a form argument without = with the warning flag', () => {
      const { request, skipped } = parseOk(`curl -F 'malformed' 'https://api.example.com'`);

      expect(request.formdataFields).toBeUndefined();
      expect(skipped).toBe(true);
    });

    it('lets form fields win over data flags, skipping the data flags with a warning', () => {
      const { request, skipped } = parseOk(
        `curl -F 'username=alice' -d 'a=1' 'https://api.example.com'`,
      );

      expect(request.formdataFields).toEqual([{ key: 'username', value: 'alice', type: 'text' }]);
      expect(request.body).toBeUndefined();
      expect(skipped).toBe(true);
    });
  });

  describe('data file references', () => {
    it('skips a leading @ data argument while importing the rest', () => {
      const command = `curl --data '@payload.json' 'https://api.example.com'`;

      const { request, skipped } = parseOk(command);

      expect(request.body).toBeUndefined();
      expect(request.url).toBe('https://api.example.com');
      expect(skipped).toBe(true);
    });
  });

  describe('warn-and-skip flags', () => {
    it('imports the request when redirect and verbosity flags are skipped', () => {
      const command = `curl --location -X POST 'https://api.example.com' -H 'X-Api-Key: k' -v --compressed`;

      const { request, skipped } = parseOk(command);

      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://api.example.com');
      expect(request.headers).toEqual({ 'X-Api-Key': 'k' });
      expect(skipped).toBe(true);
    });

    it('warn-skips TLS flags -k and --insecure', () => {
      const { skipped } = parseOk(`curl -k --insecure 'https://api.example.com'`);

      expect(skipped).toBe(true);
    });

    it('warn-skips HTTP version, IP version, redirect, and cosmetic flags', () => {
      const command = `curl --http1.1 --http2 --http2-prior-knowledge --http3 -4 -6 -G -s -S --silent --show-error --verbose # 'https://api.example.com/data'`;

      const { request, skipped } = parseOk(command);

      expect(skipped).toBe(true);
      expect(request.url).toBe('https://api.example.com/data');
      expect(request.method).toBe('GET');
    });

    it('warn-skips arity-1 flags while consuming their arguments so none is mistaken for a URL', () => {
      const command = [
        `curl --proxy 'http://127.0.0.1:8080' --cert /certs/client.pem --key /certs/client.key`,
        `--cacert /certs/ca.pem --pass hunter2 --max-time 5 --connect-timeout 2 --retry 3`,
        `--output /dev/null --data-urlencode 'a=1' -T /tmp/upload -D /dev/null`,
        `'https://api.example.com/data'`,
      ].join(' ');

      const { request, skipped } = parseOk(command);

      expect(skipped).toBe(true);
      expect(request.url).toBe('https://api.example.com/data');
      expect(request.method).toBe('GET');
      expect(request.body).toBeUndefined();
    });

    it('warn-skips an unknown arity-0 flag without blocking import', () => {
      const { request, skipped } = parseOk(`curl --progress-bar 'https://api.example.com'`);

      expect(request.url).toBe('https://api.example.com');
      expect(skipped).toBe(true);
    });

    it('refuses when an unknown arity-0 flag leaves its value as a second positional token', () => {
      const result = parseCurlCommand(`curl --bogus 'value' 'https://api.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('more than one URL');
      }
    });
  });

  describe('refusals', () => {
    it('refuses empty input', () => {
      const result = parseCurlCommand('');

      expect(result.ok).toBe(false);
    });

    it('refuses whitespace-only input', () => {
      const result = parseCurlCommand('   \n\t  ');

      expect(result.ok).toBe(false);
    });

    it('refuses a non-curl clipboard such as a SQL query', () => {
      const result = parseCurlCommand('SELECT * FROM users;');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('not a curl command');
      }
    });

    it('refuses && chained commands', () => {
      const result = parseCurlCommand(
        `curl 'https://a.example.com' && curl 'https://b.example.com'`,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses || chained commands', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com' || echo failed`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses a semicolon-separated command', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com' ; echo done`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses a piped command', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com' | jq .`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses --next separated commands', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com' --next 'https://b.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses a second curl token', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com'\ncurl 'https://b.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });

    it('refuses multiple positional URLs', () => {
      const result = parseCurlCommand(`curl 'https://a.example.com' 'https://b.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('more than one URL');
      }
    });

    it('counts --url toward the URL count in both directions', () => {
      expect(parseOk(`curl --url 'https://api.example.com/x'`).request.url).toBe(
        'https://api.example.com/x',
      );

      const result = parseCurlCommand(`curl 'https://a.example.com' --url 'https://b.example.com'`);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('more than one URL');
      }
    });

    it('refuses a command with no URL', () => {
      const result = parseCurlCommand(`curl -X POST -H 'A: b'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('missing a URL');
      }
    });

    it('refuses a method outside the supported set, naming the method', () => {
      const result = parseCurlCommand(`curl -X PROPFIND 'https://api.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('PROPFIND');
      }
    });

    it('refuses an unparseable URL even after scheme prepending', () => {
      const result = parseCurlCommand(`curl 'not a url'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Could not parse URL');
      }
    });

    it('checks the URL-count gate before the method gate', () => {
      const result = parseCurlCommand(`curl -X PROPFIND 'https://a.example.com' 'https://b.example.com'`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('more than one URL');
      }
    });

    it('checks the separator gate before the first-token gate', () => {
      const result = parseCurlCommand(`echo hi && ls`);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('multiple commands');
      }
    });
  });

  describe('URL handling and name derivation', () => {
    it('derives the name from the method and path with the query stripped', () => {
      const { request } = parseOk(`curl -X POST 'https://api.example.com/users/42?page=2'`);

      expect(request.name).toBe('POST /users/42');
    });

    it('renders an empty path as a slash', () => {
      const { request } = parseOk(`curl 'https://api.example.com'`);

      expect(request.name).toBe('GET /');
    });

    it('keeps nested path segments in the name', () => {
      const { request } = parseOk(`curl 'https://api.example.com/a/b/c'`);

      expect(request.name).toBe('GET /a/b/c');
    });

    it('prepends http:// to a scheme-less URL', () => {
      const { request } = parseOk(`curl 'api.example.com/users'`);

      expect(request.url).toBe('http://api.example.com/users');
      expect(request.name).toBe('GET /users');
    });

    it('prepends http:// to a scheme-less localhost:port URL', () => {
      const { request } = parseOk(`curl 'localhost:3000/users'`);

      expect(request.url).toBe('http://localhost:3000/users');
      expect(request.name).toBe('GET /users');
    });

    it('prepends http:// to a scheme-less hostname:port URL', () => {
      const { request } = parseOk(`curl 'example.com:8080'`);

      expect(request.url).toBe('http://example.com:8080');
      expect(request.name).toBe('GET /');
    });
  });

  describe('clean paste', () => {
    it('reports skipped false when only supported and convertible flags are present', () => {
      const command = [
        `curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json'`,
        `-H 'Authorization: Basic abc' --data-raw '{"name":"Alice"}'`,
      ].join(' ');

      const { request, skipped } = parseOk(command);

      expect(skipped).toBe(false);
      expect(request.method).toBe('POST');
      expect(Object.keys(request.headers)).toEqual(['Content-Type', 'Authorization']);
    });
  });

  describe('round-trip with toCurlCommand', () => {
    const noTls = { insecure: false };

    function expectRoundTrip(request: ResolvedRequest) {
      const result = parseCurlCommand(toCurlCommand(request, noTls));
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.error);
      }
      expect(result.skipped).toBe(false);
      expect(result.request.method).toBe(request.method);
      expect(result.request.url).toBe(request.url);
      expect(result.request.headers).toEqual(request.headers);
      expect(Object.keys(result.request.headers)).toEqual(Object.keys(request.headers));
      expect(result.request.body).toBe(request.body);
      expect(result.request.formdataFields).toEqual(request.formdataFields);
      return result;
    }

    it('reproduces a GET request with headers', () => {
      expectRoundTrip(
        createResolvedRequest({
          method: 'GET',
          url: 'https://api.example.com/users',
          headers: { 'Accept-Encoding': 'gzip', 'X-Custom-Flag': '1' },
        }),
      );
    });

    it('reproduces a POST with a JSON body and explicit content type', () => {
      expectRoundTrip(
        createResolvedRequest({
          method: 'POST',
          url: 'https://api.example.com/users',
          headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
          body: '{"name":"Alice"}',
        }),
      );
    });

    it('reproduces a HEAD request', () => {
      expectRoundTrip(createResolvedRequest({ method: 'HEAD', url: 'https://example.com/api' }));
    });

    it('reproduces a DELETE request with a plain text body', () => {
      expectRoundTrip(
        createResolvedRequest({ method: 'DELETE', url: 'https://example.com/api', body: 'plain text' }),
      );
    });

    it('reproduces form-data text fields', () => {
      expectRoundTrip(
        createResolvedRequest({
          method: 'POST',
          url: 'https://example.com/api',
          headers: { Authorization: 'Bearer token' },
          body: undefined,
          formdataFields: [
            { key: 'username', value: 'alice', type: 'text' },
            { key: 'note', value: 'hi', type: 'text' },
          ],
        }),
      );
    });

    it('reproduces a header value containing a single quote', () => {
      expectRoundTrip(
        createResolvedRequest({
          method: 'GET',
          url: 'https://example.com/api',
          headers: { 'X-Note': "it's fine" },
        }),
      );
    });

    it('reproduces a URL with a query string', () => {
      expectRoundTrip(
        createResolvedRequest({ url: 'https://api.example.com/users?page=2&sort=name' }),
      );
    });

    it('reproduces a multi-line JSON body verbatim', () => {
      expectRoundTrip(
        createResolvedRequest({
          method: 'POST',
          url: 'https://example.com/api',
          headers: { 'Content-Type': 'application/json' },
          body: '{\n  "name": "Alice"\n}',
        }),
      );
    });

    it('at most sets the skipped flag for the -k TLS flag', () => {
      const request = createResolvedRequest({ headers: { 'X-Api-Key': 'k' } });
      const result = parseCurlCommand(toCurlCommand(request, { insecure: true }));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.skipped).toBe(true);
        expect(result.request.method).toBe(request.method);
        expect(result.request.url).toBe(request.url);
        expect(result.request.headers).toEqual(request.headers);
      }
    });

    it('at most sets the skipped flag for PEM certificate flags', () => {
      const request = createResolvedRequest({ headers: { 'X-Api-Key': 'k' } });
      const result = parseCurlCommand(
        toCurlCommand(request, {
          insecure: false,
          certificate: { cert: '/certs/client.pem', key: '/certs/client.key' },
        }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.skipped).toBe(true);
        expect(result.request.url).toBe(request.url);
        expect(result.request.headers).toEqual(request.headers);
      }
    });

    it('at most sets the skipped flag for PFX certificate flags with special characters in the passphrase', () => {
      const request = createResolvedRequest({ body: undefined });
      const result = parseCurlCommand(
        toCurlCommand(request, {
          insecure: false,
          certificate: { pfx: '/certs/client.pfx', passphrase: "p@a$s'word", ca: '/certs/ca.pem' },
        }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.skipped).toBe(true);
        expect(result.request.method).toBe(request.method);
        expect(result.request.url).toBe(request.url);
        expect(result.request.headers).toEqual(request.headers);
      }
    });
  });
});
