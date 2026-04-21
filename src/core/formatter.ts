export function formatResponseBody(body: string, raw: boolean): string {
  if (body.length === 0 || raw) {
    return body;
  }

  try {
    const parsed: unknown = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}
