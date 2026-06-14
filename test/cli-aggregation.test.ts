import { describe, expect, it } from 'vitest';

import { aggregateEnvironments } from '../src/cli';
import type { EnvironmentConfig } from '../src/core/types';

describe('aggregateEnvironments', () => {
  describe('availableEnvironments', () => {
    it('prepends (none) at index 0', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.availableEnvironments[0]).toEqual({ name: '(none)', file: null });
    });

    it('returns only (none) when neither config nor --env is provided', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.availableEnvironments).toEqual([{ name: '(none)', file: null }]);
    });

    it('aggregates only from config when no --env', () => {
      const configEnvironments: EnvironmentConfig[] = [
        { name: 'Dev', file: '/cfg/dev.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
      ];

      const result = aggregateEnvironments({
        configEnvironments,
        envName: undefined,
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'Dev', file: '/cfg/dev.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
      ]);
    });

    it('aggregates from --env file when no config', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: '/env/my-env.json',
        parsedEnvFileName: 'MyEnv',
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'MyEnv', file: '/env/my-env.json' },
      ]);
    });

    it('aggregates from both config and --env without conflict', () => {
      const configEnvironments: EnvironmentConfig[] = [
        { name: 'Dev', file: '/cfg/dev.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
      ];

      const result = aggregateEnvironments({
        configEnvironments,
        envName: undefined,
        envPath: '/env/prod.json',
        parsedEnvFileName: 'Production',
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'Dev', file: '/cfg/dev.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
        { name: 'Production', file: '/env/prod.json' },
      ]);
    });

    it('--env file name wins on conflict and replaces the config entry', () => {
      const configEnvironments: EnvironmentConfig[] = [
        { name: 'Production', file: '/cfg/prod.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
      ];

      const result = aggregateEnvironments({
        configEnvironments,
        envName: undefined,
        envPath: '/env/prod.json',
        parsedEnvFileName: 'Production',
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'Production', file: '/env/prod.json' },
        { name: 'Staging', file: '/cfg/staging.json' },
      ]);
    });

    it('does not add the --env file option when --env was not used (only --env-name)', () => {
      const configEnvironments: EnvironmentConfig[] = [
        { name: 'Dev', file: '/cfg/dev.json' },
      ];

      const result = aggregateEnvironments({
        configEnvironments,
        envName: 'Dev',
        envPath: undefined,
        parsedEnvFileName: 'Dev',
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'Dev', file: '/cfg/dev.json' },
      ]);
    });

    it('ignores the --env file option when the file has no top-level name', () => {
      const configEnvironments: EnvironmentConfig[] = [
        { name: 'Dev', file: '/cfg/dev.json' },
      ];

      const result = aggregateEnvironments({
        configEnvironments,
        envName: undefined,
        envPath: '/env/some-file.json',
        parsedEnvFileName: null,
      });

      expect(result.availableEnvironments).toEqual([
        { name: '(none)', file: null },
        { name: 'Dev', file: '/cfg/dev.json' },
      ]);
    });
  });

  describe('activeEnvName', () => {
    it('is null when neither --env nor --env-name was used', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBeNull();
    });

    it('is null when no env was used even with config environments present', () => {
      const result = aggregateEnvironments({
        configEnvironments: [{ name: 'Dev', file: '/cfg/dev.json' }],
        envName: undefined,
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBeNull();
    });

    it('uses --env-name when --env-name was used', () => {
      const result = aggregateEnvironments({
        configEnvironments: [{ name: 'Dev', file: '/cfg/dev.json' }],
        envName: 'Dev',
        envPath: undefined,
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBe('Dev');
    });

    it('--env-name takes priority even if a parsed env name would otherwise apply', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: 'ConfiguredName',
        envPath: '/env/file.json',
        parsedEnvFileName: 'FileName',
      });

      expect(result.activeEnvName).toBe('ConfiguredName');
    });

    it('uses the --env file name when --env was used and the file has a name', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: '/env/dev.json',
        parsedEnvFileName: 'Development',
      });

      expect(result.activeEnvName).toBe('Development');
    });

    it('falls back to basename without final extension when --env file has no name', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: '/env/dev.json',
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBe('dev');
    });

    it('falls back to basename for complex paths', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: '/some/nested/path/to/my-env.json',
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBe('my-env');
    });

    it('falls back to basename for files with no extension', () => {
      const result = aggregateEnvironments({
        configEnvironments: [],
        envName: undefined,
        envPath: '/env/dev',
        parsedEnvFileName: null,
      });

      expect(result.activeEnvName).toBe('dev');
    });
  });
});
