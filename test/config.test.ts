import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getConfigDir, loadConfig, resolveCertPath } from '../src/core/config';

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
  saveEnv('HTTP_TUI_CONFIG');
  saveEnv('XDG_CONFIG_HOME');
  saveEnv('APPDATA');
  saveEnv('HOME');
});

afterEach(() => {
  restoreEnv('HTTP_TUI_CONFIG');
  restoreEnv('XDG_CONFIG_HOME');
  restoreEnv('APPDATA');
  restoreEnv('HOME');
  vi.restoreAllMocks();
});

describe('getConfigDir', () => {
  beforeEach(() => {
    process.env.HOME = '/home/testuser';
    delete process.env.HTTP_TUI_CONFIG;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
  });

  it('returns HTTP_TUI_CONFIG value when set', () => {
    process.env.HTTP_TUI_CONFIG = '/custom/config/dir';
    expect(getConfigDir()).toBe('/custom/config/dir');
  });

  it('expands tilde in HTTP_TUI_CONFIG value using os.homedir', () => {
    process.env.HTTP_TUI_CONFIG = '~/myconfig';
    expect(getConfigDir()).toBe('/home/testuser/myconfig');
  });

  it('returns XDG_CONFIG_HOME/httptui when XDG_CONFIG_HOME is set and HTTP_TUI_CONFIG is unset', () => {
    process.env.XDG_CONFIG_HOME = '/xdg/config';
    expect(getConfigDir()).toBe('/xdg/config/httptui');
  });

  it('returns APPDATA/httptui on Windows when APPDATA is set', () => {
    const appdata = 'C:\\Users\\test\\AppData\\Roaming';
    process.env.APPDATA = appdata;
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

    const expected = path.join(appdata, 'httptui');
    expect(getConfigDir()).toBe(expected);

    platformSpy.mockRestore();
  });

  it('falls back to $HOME/.config/httptui when no other env var is set', () => {
    expect(getConfigDir()).toBe('/home/testuser/.config/httptui');
  });

  it('handles tilde expansion: HTTP_TUI_CONFIG overrides XDG fallback', () => {
    process.env.HTTP_TUI_CONFIG = '~/my-override';
    process.env.XDG_CONFIG_HOME = '/xdg/config';
    expect(getConfigDir()).toBe('/home/testuser/my-override');
  });
});

describe('loadConfig', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env.HOME = '/home/testuser';
    delete process.env.HTTP_TUI_CONFIG;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
  });

  it('returns parsed config when config file exists and is valid', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        certificates: {
          'api.example.com': { cert: '/path/to/cert', key: '/path/to/key' },
        },
      }),
    );

    const result = loadConfig();

    expect(result).toEqual({
      certificates: {
        'api.example.com': { cert: '/path/to/cert', key: '/path/to/key' },
      },
    });
  });

  it('returns null when config file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = loadConfig();

    expect(result).toBeNull();
  });

  it('returns null for malformed JSON and writes error to stderr', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not valid json }');

    const result = loadConfig();

    expect(result).toBeNull();
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('Error: failed to parse'),
    );
  });

  it('skips entry with cert but no key and emits warning to stderr', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        certificates: {
          'incomplete.example.com': { cert: '/path/to/cert' },
        },
      }),
    );

    const result = loadConfig();

    expect(result).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining(
        'certificate entry "incomplete.example.com" has cert but no key',
      ),
    );
  });

  it('skips entry with both cert/key and pfx and emits warning to stderr', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        certificates: {
          'conflict.example.com': { cert: '/cert', key: '/key', pfx: '/pfx' },
        },
      }),
    );

    const result = loadConfig();

    expect(result).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining(
        'certificate entry "conflict.example.com" has both cert/key and pfx',
      ),
    );
  });

  it('skips empty entry with no cert, key, pfx, or ca and emits warning', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        certificates: {
          'empty.example.com': {},
        },
      }),
    );

    const result = loadConfig();

    expect(result).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining(
        'certificate entry "empty.example.com" has no cert, key, pfx, or ca',
      ),
    );
  });

  it('returns only valid entries when mixed with invalid entries', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        certificates: {
          'valid.example.com': { cert: '/cert', key: '/key' },
          'invalid.example.com': {},
        },
      }),
    );

    const result = loadConfig();

    expect(result).toEqual({
      certificates: {
        'valid.example.com': { cert: '/cert', key: '/key' },
      },
    });
  });

  it('returns empty config when certificates key is missing from JSON', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

    const result = loadConfig();

    expect(result).toEqual({});
  });

  it('returns null when certificates value is an array instead of an object', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ certificates: ['not', 'an', 'object'] }),
    );

    const result = loadConfig();

    expect(result).toBeNull();
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('"certificates" must be an object'),
    );
  });
});

describe('resolveCertPath', () => {
  beforeEach(() => {
    process.env.HOME = '/home/testuser';
  });

  it('expands tilde path to home directory', () => {
    const result = resolveCertPath('~/certs/a.crt', '/tmp/config');
    expect(result).toBe('/home/testuser/certs/a.crt');
  });

  it('returns absolute path as-is', () => {
    const result = resolveCertPath('/etc/ssl/a.crt', '/tmp/config');
    expect(result).toBe('/etc/ssl/a.crt');
  });

  it('resolves relative path against configDir', () => {
    const result = resolveCertPath('./certs/a.crt', '/etc/httptui');
    expect(result).toBe('/etc/httptui/certs/a.crt');
  });

  it('returns Windows-style path as-is when path.isAbsolute returns true', () => {
    const isAbsoluteSpy = vi.spyOn(path, 'isAbsolute').mockReturnValue(true);

    const result = resolveCertPath('C:\\certs\\a.crt', '/tmp/config');

    expect(result).toBe('C:\\certs\\a.crt');

    isAbsoluteSpy.mockRestore();
  });

  it('resolves relative paths with parent directory traversal', () => {
    const result = resolveCertPath('../certs/a.crt', '/etc/httptui/sub');
    expect(result).toBe('/etc/httptui/certs/a.crt');
  });

  it('expands tilde and resolves as absolute immediately', () => {
    const result = resolveCertPath('~/certs/a.crt', '/tmp/config');
    expect(result).toBe(path.join(os.homedir(), 'certs/a.crt'));
  });
});
