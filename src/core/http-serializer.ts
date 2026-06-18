import type { FileVariable, FormDataParam, ParsedRequest } from './types';

function isMultipartContentType(name: string, value: string): boolean {
  return name.toLowerCase() === 'content-type' && value.toLowerCase().startsWith('multipart/form-data');
}

function serializeRequestBlock(request: ParsedRequest): string {
  const hasFormdataOmission =
    request.formdataFields !== undefined && request.formdataFields.length > 0 && request.body === undefined;

  const lines: string[] = [`### ${request.name}`, `${request.method} ${request.url}`];

  for (const [name, value] of Object.entries(request.headers)) {
    if (hasFormdataOmission && isMultipartContentType(name, value)) {
      continue;
    }
    lines.push(`${name}: ${value}`);
  }

  if (hasFormdataOmission) {
    const fields = request.formdataFields as FormDataParam[];
    const keys = fields.map((field) => field.key).join(', ');
    lines.push('');
    lines.push(`# form-data body omitted (${fields.length} text fields: ${keys})`);
  } else if (request.body !== undefined) {
    lines.push('');
    lines.push(...request.body.split('\n'));
  }

  return lines.join('\n');
}

/**
 * Convert the in-memory request and variable model into `.http` file text that the
 * existing `parseHttpFile` parser can read back. Pure: no I/O, no React imports.
 *
 * `{{var}}` placeholders are preserved verbatim. The synthetic `lineNumber` field
 * is never serialized. Form-data bodies (when `formdataFields` is present and
 * `body` is `undefined`) are replaced with a `# form-data body omitted` comment and
 * the `Content-Type: multipart/form-data` header is stripped.
 */
export function serializeHttpFile(requests: ParsedRequest[], variables: FileVariable[]): string {
  const blocks: string[] = [];

  if (variables.length > 0) {
    blocks.push(variables.map((variable) => `@${variable.name} = ${variable.value}`).join('\n'));
  }

  for (const request of requests) {
    blocks.push(serializeRequestBlock(request));
  }

  if (blocks.length === 0) {
    return '';
  }

  return `${blocks.join('\n\n')}\n`;
}
