import { existsSync, readFileSync } from 'node:fs';

import { resolveCertPath } from './config';
import type { CertEntry } from './types';

export function matchCertificate(
  url: string,
  certificates: Record<string, CertEntry>,
): CertEntry | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol === 'http:') {
    return undefined;
  }

  const hostname = parsed.hostname;
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');

  const hostPortKey = `${hostname}:${port}`;
  if (certificates[hostPortKey]) {
    return certificates[hostPortKey];
  }

  if (certificates[hostname]) {
    return certificates[hostname];
  }

  let bestMatch: { key: string; suffix: string } | undefined;
  for (const key of Object.keys(certificates)) {
    if (key.startsWith('*.')) {
      const suffix = key.slice(2);
      if (hostname.endsWith(`.${suffix}`)) {
        if (!bestMatch || suffix.length > bestMatch.suffix.length) {
          bestMatch = { key, suffix };
        }
      }
    }
  }

  if (bestMatch) {
    return certificates[bestMatch.key];
  }

  return undefined;
}

export function resolvePassphrase(passphrase: string, hostname: string): string {
  if (passphrase.startsWith('$')) {
    const varName = passphrase.slice(1);
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set (required for host ${hostname})`);
    }
    return value;
  }

  return passphrase;
}

export function loadCertFiles(
  entry: CertEntry,
  configDir: string,
  hostname: string,
): { cert?: Buffer; key?: Buffer; pfx?: Buffer; passphrase?: string; ca?: Buffer } {
  const result: { cert?: Buffer; key?: Buffer; pfx?: Buffer; passphrase?: string; ca?: Buffer } = {};

  if (entry.cert) {
    const resolved = resolveCertPath(entry.cert, configDir);
    if (!existsSync(resolved)) {
      throw new Error(`Certificate file not found: ${resolved} (for host ${hostname})`);
    }
    result.cert = readFileSync(resolved);
  }

  if (entry.key) {
    const resolved = resolveCertPath(entry.key, configDir);
    if (!existsSync(resolved)) {
      throw new Error(`Certificate file not found: ${resolved} (for host ${hostname})`);
    }
    result.key = readFileSync(resolved);
  }

  if (entry.pfx) {
    const resolved = resolveCertPath(entry.pfx, configDir);
    if (!existsSync(resolved)) {
      throw new Error(`Certificate file not found: ${resolved} (for host ${hostname})`);
    }
    result.pfx = readFileSync(resolved);
  }

  if (entry.passphrase) {
    result.passphrase = resolvePassphrase(entry.passphrase, hostname);
  }

  if (entry.ca) {
    const resolved = resolveCertPath(entry.ca, configDir);
    if (!existsSync(resolved)) {
      throw new Error(`Certificate file not found: ${resolved} (for host ${hostname})`);
    }
    result.ca = readFileSync(resolved);
  }

  return result;
}
