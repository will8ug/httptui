import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { CertEntry, HttptuiConfig } from './types';

export function getConfigDir(): string {
  if (process.env.HTTP_TUI_CONFIG) {
    const raw = process.env.HTTP_TUI_CONFIG;
    if (raw.startsWith('~')) {
      return path.join(os.homedir(), raw.slice(1));
    }
    return raw;
  }

  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'httptui');
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'httptui');
  }

  return path.join(os.homedir(), '.config', 'httptui');
}

function validateEntry(key: string, entry: CertEntry): boolean {
  const hasCertKey = (entry.cert !== undefined && entry.cert !== '') || (entry.key !== undefined && entry.key !== '');
  const hasPfx = entry.pfx !== undefined && entry.pfx !== '';
  const hasCa = entry.ca !== undefined && entry.ca !== '';

  if (entry.cert !== undefined && entry.cert !== '' && (entry.key === undefined || entry.key === '')) {
    process.stderr.write(`Warning: certificate entry "${key}" has cert but no key — skipping\n`);
    return false;
  }

  if (entry.key !== undefined && entry.key !== '' && (entry.cert === undefined || entry.cert === '')) {
    process.stderr.write(`Warning: certificate entry "${key}" has key but no cert — skipping\n`);
    return false;
  }

  if (hasCertKey && hasPfx) {
    process.stderr.write(`Warning: certificate entry "${key}" has both cert/key and pfx — skipping\n`);
    return false;
  }

  if (!hasCertKey && !hasPfx && !hasCa) {
    process.stderr.write(`Warning: certificate entry "${key}" has no cert, key, pfx, or ca — skipping\n`);
    return false;
  }

  return true;
}

export function loadConfig(): HttptuiConfig | null {
  const configDir = getConfigDir();
  const configPath = path.join(configDir, 'config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  let raw: unknown;
  try {
    const content = readFileSync(configPath, 'utf8');
    raw = JSON.parse(content);
  } catch {
    process.stderr.write(`Error: failed to parse ${configPath}\n`);
    return null;
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const rawCerts = obj.certificates;

  if (rawCerts === undefined || rawCerts === null) {
    return {};
  }

  if (typeof rawCerts !== 'object' || Array.isArray(rawCerts)) {
    process.stderr.write('Error: "certificates" must be an object in config.json\n');
    return null;
  }

  const certificates: Record<string, CertEntry> = {};
  for (const [key, value] of Object.entries(rawCerts as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      process.stderr.write(`Warning: certificate entry "${key}" is not a valid object — skipping\n`);
      continue;
    }

    const entry = value as Record<string, unknown>;
    const certEntry: CertEntry = {};

    if (typeof entry.cert === 'string') certEntry.cert = entry.cert;
    if (typeof entry.key === 'string') certEntry.key = entry.key;
    if (typeof entry.pfx === 'string') certEntry.pfx = entry.pfx;
    if (typeof entry.passphrase === 'string') certEntry.passphrase = entry.passphrase;
    if (typeof entry.ca === 'string') certEntry.ca = entry.ca;

    if (validateEntry(key, certEntry)) {
      certificates[key] = certEntry;
    }
  }

  return { certificates };
}

export function resolveCertPath(inputPath: string, configDir: string): string {
  let resolved = inputPath;

  if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }

  if (path.isAbsolute(resolved)) {
    return resolved;
  }

  return path.resolve(configDir, resolved);
}
