import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getConfigDir, loadConfig, resolveCertPath } from '../../src/core/config';

const ENV_KEYS = ['HTTP_TUI_CONFIG', 'XDG_CONFIG_HOME', 'APPDATA', 'HOME'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  vi.restoreAllMocks();
});

function mockConfigFile(json: unknown): void {
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(json));
}

function mockMergeConfigs(globalJson: unknown, projectJson: unknown | undefined): void {
  vi.mocked(existsSync).mockImplementation((p) => {
    if (typeof p !== 'string') return false;
    if (p.includes('config.json')) return true;
    if (projectJson !== undefined && p.includes('.httptui.json')) return true;
    return false;
  });
  vi.mocked(readFileSync).mockImplementation((p) => {
    const pathStr = String(p);
    if (pathStr.includes('config.json')) return JSON.stringify(globalJson);
    if (pathStr.includes('.httptui.json') && projectJson !== undefined) return JSON.stringify(projectJson);
    return '';
  });
}

function mockNoConfig(): void {
  vi.mocked(existsSync).mockReturnValue(false);
}

function suppressStderr(): void {
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

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

    expect(getConfigDir()).toBe(path.join(appdata, 'httptui'));

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
    suppressStderr();
    process.env.HOME = '/home/testuser';
    delete process.env.HTTP_TUI_CONFIG;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
  });

  it('returns parsed config when config file exists and is valid', () => {
    mockConfigFile({
      certificates: {
        'api.example.com': { cert: '/path/to/cert', key: '/path/to/key' },
      },
    });

    expect(loadConfig()).toEqual({
      certificates: {
        'api.example.com': { cert: '/path/to/cert', key: '/path/to/key' },
      },
    });
  });

  it('returns null when config file does not exist', () => {
    mockNoConfig();
    expect(loadConfig()).toBeNull();
  });

  it('returns null for malformed JSON and writes error to stderr', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not valid json }');

    expect(loadConfig()).toBeNull();
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('Error: failed to parse'),
    );
  });

  it('skips entry with cert but no key and emits warning to stderr', () => {
    mockConfigFile({
      certificates: {
        'incomplete.example.com': { cert: '/path/to/cert' },
      },
    });

    expect(loadConfig()).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('certificate entry "incomplete.example.com" has cert but no key'),
    );
  });

  it('skips entry with both cert/key and pfx and emits warning to stderr', () => {
    mockConfigFile({
      certificates: {
        'conflict.example.com': { cert: '/cert', key: '/key', pfx: '/pfx' },
      },
    });

    expect(loadConfig()).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('certificate entry "conflict.example.com" has both cert/key and pfx'),
    );
  });

  it('skips empty entry with no cert, key, pfx, or ca and emits warning', () => {
    mockConfigFile({
      certificates: {
        'empty.example.com': {},
      },
    });

    expect(loadConfig()).toEqual({ certificates: {} });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('certificate entry "empty.example.com" has no cert, key, pfx, or ca'),
    );
  });

  it('returns only valid entries when mixed with invalid entries', () => {
    mockConfigFile({
      certificates: {
        'valid.example.com': { cert: '/cert', key: '/key' },
        'invalid.example.com': {},
      },
    });

    expect(loadConfig()).toEqual({
      certificates: {
        'valid.example.com': { cert: '/cert', key: '/key' },
      },
    });
  });

  it('returns empty config when certificates key is missing from JSON', () => {
    mockConfigFile({});
    expect(loadConfig()).toEqual({});
  });

  it('returns null when certificates value is an array instead of an object', () => {
    mockConfigFile({ certificates: ['not', 'an', 'object'] });

    expect(loadConfig()).toBeNull();
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('"certificates" must be an object'),
    );
  });

  it('merges project config over global config when project config exists', () => {
    mockMergeConfigs(
      { certificates: { 'global.example.com': { cert: '/global/cert', key: '/global/key' } } },
      { certificates: { 'project.example.com': { cert: '/project/cert', key: '/project/key' } } },
    );

    expect(loadConfig('/project/api')).toEqual({
      certificates: {
        'project.example.com': { cert: '/project/cert', key: '/project/key' },
      },
    });
  });

  it('returns global config when project config does not exist', () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (typeof p === 'string' && p.includes('config.json')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes('config.json')) {
        return JSON.stringify({
          certificates: { 'global.example.com': { cert: '/global/cert', key: '/global/key' } },
        });
      }
      return '';
    });

    expect(loadConfig('/project/api')).toEqual({
      certificates: {
        'global.example.com': { cert: '/global/cert', key: '/global/key' },
      },
    });
  });

  it('returns project config when no global config exists', () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (typeof p === 'string' && p.includes('.httptui.json')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes('.httptui.json')) {
        return JSON.stringify({
          certificates: { 'project.example.com': { cert: '/project/cert', key: '/project/key' } },
        });
      }
      return '';
    });

    expect(loadConfig('/project/api')).toEqual({
      certificates: {
        'project.example.com': { cert: '/project/cert', key: '/project/key' },
      },
    });
  });

  it('returns null when neither global nor project config exists', () => {
    mockNoConfig();
    expect(loadConfig('/project/api')).toBeNull();
  });

  it('parses environments array from config', () => {
    mockConfigFile({
      environments: [
        { name: 'Development', file: 'env/dev.json' },
        { name: 'Staging', file: 'env/staging.json' },
      ],
    });

    expect(loadConfig()).toEqual({
      environments: [
        { name: 'Development', file: '/home/testuser/.config/httptui/env/dev.json' },
        { name: 'Staging', file: '/home/testuser/.config/httptui/env/staging.json' },
      ],
    });
  });

  it('skips invalid environment entries and emits warnings', () => {
    mockConfigFile({
      environments: [
        { name: 'Valid', file: 'env/valid.json' },
        { name: '', file: 'env/empty-name.json' },
        { name: 'MissingFile' },
        'not an object',
      ],
    });

    expect(loadConfig()).toEqual({
      environments: [{ name: 'Valid', file: '/home/testuser/.config/httptui/env/valid.json' }],
    });
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('environment entry must have non-empty "name" and "file" strings'),
    );
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('environment entry is not a valid object'),
    );
  });

  it('warns when environments is not an array', () => {
    mockConfigFile({ environments: 'not an array' });

    expect(loadConfig()).toEqual({});
    expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
      expect.stringContaining('"environments" must be an array'),
    );
  });

  it('merges project environments over global environments', () => {
    mockMergeConfigs(
      { environments: [{ name: 'GlobalDev', file: 'env/global-dev.json' }] },
      { environments: [{ name: 'ProjectDev', file: 'env/project-dev.json' }] },
    );

    expect(loadConfig('/project/api')).toEqual({
      environments: [{ name: 'ProjectDev', file: '/project/api/env/project-dev.json' }],
    });
  });

  it('resolves global environment paths relative to global config dir when project config exists without environments', () => {
    mockMergeConfigs(
      { environments: [{ name: 'LocalAPI', file: 'env/local.json' }] },
      { certificates: { localhost: { cert: './certs/client.crt', key: './certs/client.key' } } },
    );

    expect(loadConfig('/project/api')?.environments).toEqual([
      { name: 'LocalAPI', file: '/home/testuser/.config/httptui/env/local.json' },
    ]);
  });

  it('resolves project environment paths relative to project config dir', () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (typeof p === 'string' && p.includes('.httptui.json')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes('.httptui.json')) {
        return JSON.stringify({ environments: [{ name: 'Dev', file: 'env/dev.json' }] });
      }
      return '';
    });

    expect(loadConfig('/project/api')?.environments).toEqual([
      { name: 'Dev', file: '/project/api/env/dev.json' },
    ]);
  });

  it('resolves global cert paths relative to global config dir when project config exists without certs', () => {
    mockMergeConfigs(
      { certificates: { 'api.example.com': { cert: './certs/client.crt', key: './certs/client.key' } } },
      { environments: [{ name: 'Dev', file: 'env/dev.json' }] },
    );

    expect(loadConfig('/project/api')?.certificates).toEqual({
      'api.example.com': {
        cert: '/home/testuser/.config/httptui/certs/client.crt',
        key: '/home/testuser/.config/httptui/certs/client.key',
      },
    });
  });
});

describe('resolveCertPath', () => {
  beforeEach(() => {
    process.env.HOME = '/home/testuser';
  });

  it('returns absolute path as-is', () => {
    expect(resolveCertPath('/etc/ssl/a.crt', '/tmp/config')).toBe('/etc/ssl/a.crt');
  });

  it('resolves relative path against configDir', () => {
    expect(resolveCertPath('./certs/a.crt', '/etc/httptui')).toBe('/etc/httptui/certs/a.crt');
  });

  it('returns Windows-style path as-is when path.isAbsolute returns true', () => {
    const isAbsoluteSpy = vi.spyOn(path, 'isAbsolute').mockReturnValue(true);
    expect(resolveCertPath('C:\\certs\\a.crt', '/tmp/config')).toBe('C:\\certs\\a.crt');
    isAbsoluteSpy.mockRestore();
  });

  it('resolves relative paths with parent directory traversal', () => {
    expect(resolveCertPath('../certs/a.crt', '/etc/httptui/sub')).toBe('/etc/httptui/certs/a.crt');
  });

  it('expands tilde and resolves using os.homedir', () => {
    expect(resolveCertPath('~/certs/a.crt', '/tmp/config')).toBe(
      path.join(os.homedir(), 'certs/a.crt'),
    );
  });
});