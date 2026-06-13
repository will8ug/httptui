import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'node:fs';

import { loadCertFiles, matchCertificate, resolvePassphrase } from '../../src/core/certificates';
import type { CertEntry } from '../../src/core/types';

const savedEnv: Record<string, string | undefined> = {};

function saveEnv(key: string): void {
  savedEnv[key] = process.env[key];
}

function restoreEnv(key: string): void {
  if (savedEnv[key] === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = savedEnv[key];
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  saveEnv('HOME');
  saveEnv('CERT_PASS');
  saveEnv('PFX_PASSWORD');
  saveEnv('MY_PWD');
  process.env.HOME = '/home/testuser';
});

afterEach(() => {
  restoreEnv('HOME');
  restoreEnv('CERT_PASS');
  restoreEnv('PFX_PASSWORD');
  restoreEnv('MY_PWD');
  vi.restoreAllMocks();
});

describe('matchCertificate', () => {
  const certificates: Record<string, CertEntry> = {
    'api.example.com:8443': { cert: '/certs/specific.pem', key: '/certs/specific.key' },
    'api.example.com': { cert: '/certs/api.pem', key: '/certs/api.key' },
    '*.staging.internal': { cert: '/certs/wildcard.pem', key: '/certs/wildcard.key' },
    '*.b.c.corp': { cert: '/certs/long-wildcard.pem', key: '/certs/long-wildcard.key' },
    '*.corp': { cert: '/certs/short-wildcard.pem', key: '/certs/short-wildcard.key' },
    'only-ca.example.com': { ca: '/certs/ca.pem' },
  };

  it('matches exact host:port from a URL with path and query', () => {
    const result = matchCertificate(
      'https://api.example.com:8443/path?query=1',
      certificates,
    );
    expect(result).toBe(certificates['api.example.com:8443']);
  });

  it('matches exact host from a URL without port', () => {
    const result = matchCertificate(
      'https://api.example.com/path',
      certificates,
    );
    expect(result).toBe(certificates['api.example.com']);
  });

  it('matches wildcard host for a subdomain', () => {
    const result = matchCertificate(
      'https://foo.staging.internal/path',
      certificates,
    );
    expect(result).toBe(certificates['*.staging.internal']);
  });

  it('matches longest wildcard when multiple patterns could match', () => {
    const result = matchCertificate(
      'https://a.b.c.corp/path',
      certificates,
    );
    expect(result).toBe(certificates['*.b.c.corp']);
  });

  it('returns undefined for HTTP URLs even when a matching entry exists', () => {
    const result = matchCertificate(
      'http://api.example.com/path',
      certificates,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when no entry matches the hostname', () => {
    const result = matchCertificate(
      'https://unknown.example.com/path',
      certificates,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined for an invalid URL', () => {
    const result = matchCertificate(
      'not-a-valid-url',
      certificates,
    );
    expect(result).toBeUndefined();
  });

  it('falls back to implicit port 443 for HTTPS when host:port key exists', () => {
    const localCerts: Record<string, CertEntry> = {
      'secure.example.com:443': { cert: '/certs/port.pem', key: '/certs/port.key' },
    };
    const result = matchCertificate(
      'https://secure.example.com/path',
      localCerts,
    );
    expect(result).toBe(localCerts['secure.example.com:443']);
  });

  it('matches exact host before wildcard when both exist', () => {
    const localCerts: Record<string, CertEntry> = {
      'api.example.com': { cert: '/certs/exact.pem', key: '/certs/exact.key' },
      '*.example.com': { cert: '/certs/wild.pem', key: '/certs/wild.key' },
    };
    const result = matchCertificate(
      'https://api.example.com/path',
      localCerts,
    );
    expect(result).toBe(localCerts['api.example.com']);
  });

  it('returns undefined when wildcard does not match a single-label hostname', () => {
    const localCerts: Record<string, CertEntry> = {
      '*.example.com': { cert: '/certs/wild.pem', key: '/certs/wild.key' },
    };
    const result = matchCertificate(
      'https://example.com/path',
      localCerts,
    );
    expect(result).toBeUndefined();
  });

  it('matches CA-only entry for an HTTPS host', () => {
    const result = matchCertificate(
      'https://only-ca.example.com/path',
      certificates,
    );
    expect(result).toBe(certificates['only-ca.example.com']);
  });
});

describe('resolvePassphrase', () => {
  it('returns environment variable value when passphrase starts with $', () => {
    process.env.CERT_PASS = 'secret123';
    const result = resolvePassphrase('$CERT_PASS', 'api.example.com');
    expect(result).toBe('secret123');
  });

  it('throws when environment variable referenced by $ is not set', () => {
    delete process.env.CERT_PASS;
    expect(() => {
      resolvePassphrase('$CERT_PASS', 'api.example.com');
    }).toThrow(
      'Environment variable CERT_PASS is not set (required for host api.example.com)',
    );
  });

  it('returns literal string as-is when it does not start with $', () => {
    const result = resolvePassphrase('plaintext-password', 'api.example.com');
    expect(result).toBe('plaintext-password');
  });

  it('throws with hostname in error message when env var is missing', () => {
    delete process.env.MY_PWD;
    expect(() => {
      resolvePassphrase('$MY_PWD', 'db.internal');
    }).toThrow(
      'Environment variable MY_PWD is not set (required for host db.internal)',
    );
  });
});

describe('loadCertFiles', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation((p: unknown) => {
      const filePath = p as string;
      if (filePath.endsWith('.p12')) return Buffer.from('test-pfx');
      if (filePath.includes('ca')) return Buffer.from('test-ca');
      if (filePath.includes('cert')) return Buffer.from('test-cert');
      if (filePath.includes('key')) return Buffer.from('test-key');
      return Buffer.from('test-content');
    });
  });

  it('returns Buffers for cert, key, and ca when all files exist', () => {
    const entry: CertEntry = {
      cert: '/etc/cert.pem',
      key: '/etc/key.pem',
      ca: '/etc/ca.pem',
    };

    const result = loadCertFiles(entry, '/tmp/config', 'api.example.com');

    expect(result.cert).toBeInstanceOf(Buffer);
    expect(result.cert!.toString()).toBe('test-cert');
    expect(result.key).toBeInstanceOf(Buffer);
    expect(result.key!.toString()).toBe('test-key');
    expect(result.ca).toBeInstanceOf(Buffer);
    expect(result.ca!.toString()).toBe('test-ca');
    expect(result.pfx).toBeUndefined();
    expect(result.passphrase).toBeUndefined();
  });

  it('throws when a cert file does not exist', () => {
    vi.mocked(existsSync).mockImplementation((p: unknown) => {
      return (p as string) !== '/etc/cert.pem';
    });

    const entry: CertEntry = {
      cert: '/etc/cert.pem',
      key: '/etc/key.pem',
    };

    expect(() => {
      loadCertFiles(entry, '/tmp/config', 'api.example.com');
    }).toThrow('Certificate file not found: /etc/cert.pem (for host api.example.com)');
  });

  it('returns only ca Buffer for CA-only entry', () => {
    const entry: CertEntry = { ca: '/etc/ca.pem' };

    const result = loadCertFiles(entry, '/tmp/config', 'api.example.com');

    expect(result.ca).toBeInstanceOf(Buffer);
    expect(result.ca!.toString()).toBe('test-ca');
    expect(result.cert).toBeUndefined();
    expect(result.key).toBeUndefined();
    expect(result.pfx).toBeUndefined();
    expect(result.passphrase).toBeUndefined();
  });

  it('loads PFX file and resolves passphrase from environment', () => {
    process.env.PFX_PASSWORD = 'secret-pfx';
    const entry: CertEntry = {
      pfx: '/etc/cert.p12',
      passphrase: '$PFX_PASSWORD',
    };

    const result = loadCertFiles(entry, '/tmp/config', 'api.internal');

    expect(result.pfx).toBeInstanceOf(Buffer);
    expect(result.pfx!.toString()).toBe('test-pfx');
    expect(result.passphrase).toBe('secret-pfx');
  });

  it('throws when CA file does not exist', () => {
    vi.mocked(existsSync).mockImplementation((p: unknown) => {
      return (p as string) !== '/etc/ca.pem';
    });

    const entry: CertEntry = { ca: '/etc/ca.pem' };

    expect(() => {
      loadCertFiles(entry, '/tmp/config', 'api.example.com');
    }).toThrow('Certificate file not found: /etc/ca.pem (for host api.example.com)');
  });

  it('throws when PFX file does not exist', () => {
    vi.mocked(existsSync).mockImplementation((p: unknown) => {
      return (p as string) !== '/etc/cert.p12';
    });

    const entry: CertEntry = { pfx: '/etc/cert.p12' };

    expect(() => {
      loadCertFiles(entry, '/tmp/config', 'api.example.com');
    }).toThrow('Certificate file not found: /etc/cert.p12 (for host api.example.com)');
  });

  it('resolves tilde paths in cert entries', () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const entry: CertEntry = {
      cert: '~/certs/client.pem',
      key: '~/certs/client.key',
    };

    const result = loadCertFiles(entry, '/tmp/config', 'api.example.com');

    expect(result.cert).toBeInstanceOf(Buffer);
    expect(result.key).toBeInstanceOf(Buffer);
  });
});
