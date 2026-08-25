import type { CertEntry, ResolvedRequest } from './types';

export interface CurlCommandOptions {
  insecure: boolean;
  certificate?: CertEntry;
}

function quoteBashArgument(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function isContentTypeHeader(name: string): boolean {
  return name.toLowerCase() === 'content-type';
}

/**
 * Serialize a resolved request as a single-line bash `curl` command. Pure: no
 * I/O, no React imports. Certificate fields in `options` are file paths — curl
 * reads them itself, unlike the executor's loaded buffers.
 */
export function toCurlCommand(resolvedRequest: ResolvedRequest, options: CurlCommandOptions): string {
  const args: string[] = ['curl'];

  if (resolvedRequest.method === 'HEAD') {
    args.push('-I');
  } else if (resolvedRequest.method !== 'GET') {
    args.push('-X', resolvedRequest.method);
  }

  args.push(quoteBashArgument(resolvedRequest.url));

  const formdataFields = resolvedRequest.formdataFields ?? [];
  const hasFormdataFields = formdataFields.length > 0;

  for (const [name, value] of Object.entries(resolvedRequest.headers)) {
    if (hasFormdataFields && isContentTypeHeader(name)) {
      continue;
    }
    args.push('-H', quoteBashArgument(`${name}: ${value}`));
  }

  if (hasFormdataFields) {
    for (const field of formdataFields) {
      args.push('--form-string', quoteBashArgument(`${field.key}=${field.value}`));
    }
  } else if (resolvedRequest.body !== undefined) {
    args.push('--data-raw', quoteBashArgument(resolvedRequest.body));
  }

  if (options.insecure) {
    args.push('-k');
  }

  const certificate = options.certificate;
  if (certificate) {
    if (certificate.cert !== undefined) args.push('--cert', quoteBashArgument(certificate.cert));
    if (certificate.key !== undefined) args.push('--key', quoteBashArgument(certificate.key));
    if (certificate.pfx !== undefined) args.push('--cert', quoteBashArgument(certificate.pfx));
    if (certificate.passphrase !== undefined) args.push('--pass', quoteBashArgument(certificate.passphrase));
    if (certificate.ca !== undefined) args.push('--cacert', quoteBashArgument(certificate.ca));
  }

  return args.join(' ');
}
