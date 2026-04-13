export function getRequestTarget(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const target = `${parsedUrl.pathname || '/'}${parsedUrl.search}`;
    return target === '' ? '/' : target;
  } catch {
    return url;
  }
}