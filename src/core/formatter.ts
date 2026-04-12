export function formatResponseBody(body: string): string {
  if (body.length === 0) {
    return body;
  }

  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}