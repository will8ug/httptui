type ParseHeadersResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: 'missing a ":"' | 'missing a header name'; line: number };

export function headersToText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');
}

export function parseHeadersText(text: string): ParseHeadersResult {
  const headers: Record<string, string> = {};
  const headerNames = new Map<string, string>();
  const lines = text.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === '') {
      continue;
    }

    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return { ok: false, error: 'missing a ":"', line: index + 1 };
    }

    const name = line.slice(0, separatorIndex).trim();

    if (name === '') {
      return { ok: false, error: 'missing a header name', line: index + 1 };
    }

    const value = line.slice(separatorIndex + 1).trim();
    const normalizedName = name.toLowerCase();
    const previousName = headerNames.get(normalizedName);

    if (previousName !== undefined && previousName !== name) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- header normalization requires removing old key
      delete headers[previousName];
    }

    headerNames.set(normalizedName, name);
    headers[name] = value;
  }

  return { ok: true, headers };
}
