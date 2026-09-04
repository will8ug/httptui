export function isJsonBody(body: string): boolean {
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

export function formatResponseBody(body: string, raw: boolean): string {
  if (body.length === 0 || raw) {
    return body;
  }

  if (!isJsonBody(body)) {
    return body;
  }

  return JSON.stringify(JSON.parse(body), null, 2);
}
