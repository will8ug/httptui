import type { FormDataParam, HttpMethod, ParsedRequest } from './types';

export type ParseCurlResult =
  | { ok: true; request: ParsedRequest; skipped: boolean }
  | { ok: false; error: string };

const HTTP_METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const COMMAND_SEPARATORS = new Set(['&&', '||', ';', '|', '--next']);

const METHOD_FLAGS = new Set(['-X', '--request']);
const HEAD_FLAGS = new Set(['-I', '--head']);
const HEADER_FLAGS = new Set(['-H', '--header']);
const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary']);
const FORM_FLAGS = new Set(['-F', '--form', '--form-string']);
const USER_FLAGS = new Set(['-u', '--user']);
const COOKIE_FLAGS = new Set(['-b', '--cookie']);
const AGENT_FLAGS = new Set(['-A', '--user-agent']);
const REFERER_FLAGS = new Set(['-e', '--referer']);

const WARN_SKIP_FLAGS = new Set([
  '-L',
  '--location',
  '-k',
  '--insecure',
  '--compressed',
  '-G',
  '--get',
  '-s',
  '-S',
  '-v',
  '--silent',
  '--show-error',
  '--verbose',
  '#',
  '--http1.1',
  '--http3',
  '-4',
  '-6',
]);

const WARN_SKIP_VALUE_FLAGS = new Set([
  '--proxy',
  '-x',
  '--cert',
  '--key',
  '--cacert',
  '--pass',
  '--cert-type',
  '--key-type',
  '-m',
  '--max-time',
  '--connect-timeout',
  '--data-urlencode',
  '-T',
  '--upload-file',
  '-o',
  '--output',
  '--retry',
  '-c',
  '--cookie-jar',
  '--dump-header',
  '-D',
]);

type QuoteState = 'unquoted' | 'single' | 'double';

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inToken = false;
  let state: QuoteState = 'unquoted';
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (state === 'single') {
      // Fully literal — even backslash has no meaning — so the copy-as-curl
      // idiom `'\''` decodes as close, escaped quote, reopen, like bash.
      if (char === "'") {
        state = 'unquoted';
      } else {
        current += char;
      }
      index += 1;
      continue;
    }

    if (state === 'double') {
      if (char === '"') {
        state = 'unquoted';
        index += 1;
      } else if (char === '\\') {
        const next = text.at(index + 1);
        if (next === undefined) {
          current += char;
          index += 1;
        } else if (next === '\n') {
          index += 2;
        } else {
          current += next;
          index += 2;
        }
      } else {
        current += char;
        index += 1;
      }
      continue;
    }

    if (isWhitespace(char)) {
      if (inToken) {
        tokens.push(current);
        current = '';
        inToken = false;
      }
      index += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      state = char === "'" ? 'single' : 'double';
      inToken = true;
      index += 1;
      continue;
    }

    if (char === '\\') {
      const next = text.at(index + 1);
      if (next === undefined) {
        current += char;
        inToken = true;
        index += 1;
      } else if (next === '\n') {
        index += 2;
      } else {
        current += next;
        inToken = true;
        index += 2;
      }
      continue;
    }

    current += char;
    inToken = true;
    index += 1;
  }

  if (inToken) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a single shell-style `curl` command into a request. Pure: no I/O and
 * no warnings emitted — `skipped` tells the caller to show the summary
 * warning; `error` strings are user-facing refusals.
 */
export function parseCurlCommand(text: string): ParseCurlResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Clipboard is empty' };
  }

  const tokens = tokenize(trimmed);
  const hasSeparator = tokens.some(
    (token, index) => COMMAND_SEPARATORS.has(token) || (token === 'curl' && index > 0),
  );
  if (hasSeparator) {
    return { ok: false, error: 'Clipboard contains multiple commands — paste a single curl command' };
  }

  if (tokens[0] !== 'curl') {
    return { ok: false, error: 'Clipboard is not a curl command' };
  }

  const headers: Record<string, string> = {};
  const urls: string[] = [];
  const dataParts: string[] = [];
  const formFields: FormDataParam[] = [];
  let method: string | undefined;
  let dataFlagSeen = false;
  let formFlagSeen = false;
  let skipped = false;

  const args = tokens.slice(1);
  let index = 0;

  const consumeArgument = (): string | undefined => {
    const next = args.at(index + 1);
    if (next === undefined) {
      skipped = true;
      return undefined;
    }
    index += 1;
    return next;
  };

  while (index < args.length) {
    const token = args[index];

    if (token !== '#' && !token.startsWith('-')) {
      urls.push(token);
      index += 1;
      continue;
    }

    if (METHOD_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        method = value.toUpperCase();
      }
      index += 1;
      continue;
    }

    if (HEAD_FLAGS.has(token)) {
      method = 'HEAD';
      index += 1;
      continue;
    }

    if (HEADER_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        const separator = value.indexOf(':');
        const name = separator === -1 ? '' : value.slice(0, separator).trim();
        if (name === '') {
          skipped = true;
        } else {
          headers[name] = value.slice(separator + 1).trim();
        }
      }
      index += 1;
      continue;
    }

    if (DATA_FLAGS.has(token)) {
      dataFlagSeen = true;
      const value = consumeArgument();
      if (value !== undefined) {
        if (value.startsWith('@')) {
          skipped = true;
        } else {
          dataParts.push(value);
        }
      }
      index += 1;
      continue;
    }

    if (FORM_FLAGS.has(token)) {
      formFlagSeen = true;
      const value = consumeArgument();
      if (value !== undefined) {
        const separator = value.indexOf('=');
        const fieldValue = separator === -1 ? '' : value.slice(separator + 1);
        if (
          separator === -1 ||
          fieldValue.startsWith('@') ||
          fieldValue.startsWith('<')
        ) {
          skipped = true;
        } else {
          formFields.push({ key: value.slice(0, separator), value: fieldValue, type: 'text' });
        }
      }
      index += 1;
      continue;
    }

    if (token === '--url') {
      const value = consumeArgument();
      if (value !== undefined) {
        urls.push(value);
      }
      index += 1;
      continue;
    }

    if (USER_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        if (!value.includes(':')) {
          skipped = true;
        } else {
          headers['Authorization'] = `Basic ${Buffer.from(value).toString('base64')}`;
        }
      }
      index += 1;
      continue;
    }

    if (COOKIE_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        if (value.startsWith('@')) {
          skipped = true;
        } else {
          headers['Cookie'] = value;
        }
      }
      index += 1;
      continue;
    }

    if (token === '--json') {
      dataFlagSeen = true;
      const value = consumeArgument();
      if (value !== undefined) {
        if (value.startsWith('@')) {
          skipped = true;
        } else {
          headers['Accept'] = 'application/json';
          headers['Content-Type'] = 'application/json';
          dataParts.push(value);
        }
      }
      index += 1;
      continue;
    }

    if (AGENT_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        headers['User-Agent'] = value;
      }
      index += 1;
      continue;
    }

    if (REFERER_FLAGS.has(token)) {
      const value = consumeArgument();
      if (value !== undefined) {
        headers['Referer'] = value;
      }
      index += 1;
      continue;
    }

    if (WARN_SKIP_VALUE_FLAGS.has(token)) {
      skipped = true;
      consumeArgument();
      index += 1;
      continue;
    }

    if (WARN_SKIP_FLAGS.has(token) || token.startsWith('--http2')) {
      skipped = true;
      index += 1;
      continue;
    }

    // Unknown flag: treated as arity-0. A misclassified value then surfaces as
    // a second positional URL (refused below), never as a silent misparse.
    skipped = true;
    index += 1;
  }

  if (urls.length === 0) {
    return { ok: false, error: 'curl command is missing a URL' };
  }
  if (urls.length > 1) {
    return { ok: false, error: 'curl command has more than one URL' };
  }

  if (method !== undefined && !HTTP_METHODS.has(method)) {
    return { ok: false, error: `Unsupported HTTP method: ${method}` };
  }

  const rawUrl = urls[0];
  let parsedUrl: URL;
  let requestUrl: string;
  try {
    parsedUrl = new URL(rawUrl);
    requestUrl = rawUrl;
  } catch {
    try {
      requestUrl = `http://${rawUrl}`;
      parsedUrl = new URL(requestUrl);
    } catch {
      return { ok: false, error: `Could not parse URL: ${rawUrl}` };
    }
  }

  if (formFlagSeen && dataFlagSeen) {
    skipped = true;
  }

  const resolvedMethod = (method ?? (dataFlagSeen || formFlagSeen ? 'POST' : 'GET')) as HttpMethod;

  let body: string | undefined;
  let formdataFields: FormDataParam[] | undefined;
  if (formFlagSeen) {
    formdataFields = formFields.length > 0 ? formFields : undefined;
  } else {
    body = dataParts.length > 0 ? dataParts.join('&') : undefined;
  }

  return {
    ok: true,
    skipped,
    request: {
      name: `${resolvedMethod} ${parsedUrl.pathname || '/'}`,
      method: resolvedMethod,
      url: requestUrl,
      headers,
      body,
      formdataFields,
      lineNumber: 0,
      isDirty: true,
    },
  };
}
