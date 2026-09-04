import { isJsonBody } from './formatter';

export function deriveResponseSaveFilename(requestName: string, body: string): string {
  const extension = isJsonBody(body) ? '.json' : '.txt';
  return `${requestName.replaceAll('/', '-')}${extension}`;
}
