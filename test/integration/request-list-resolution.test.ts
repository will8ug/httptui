import { describe, expect, it } from 'vitest';

import { getMaxRequestLineWidth } from '../../src/utils/scroll';
import { resolveVariables } from '../../src/core/variables';
import type { FileVariable, ParsedRequest } from '../../src/core/types';
import { createInitialState, reducer as stateReducer } from '../helpers/state';
import { createRequest } from '../helpers/requests';

describe('request list re-resolves on env switch', () => {
  it('SWITCH_ENV updates the variable map used by the request list', () => {
    const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.local' }];
    const envVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.dev.com' }];
    const requests: ParsedRequest[] = [createRequest({ url: '{{baseUrl}}/posts', lineNumber: 1 })];

    const initialState = createInitialState({
      requests,
      fileVariables,
      variables: fileVariables,
      availableEnvironments: [
        { name: '(none)', file: null },
        { name: 'Dev', file: 'env/dev.json' },
      ],
    });

    const switchedState = stateReducer(initialState, {
      type: 'SWITCH_ENV',
      environmentVariables: envVariables,
      envName: 'Dev',
    });

    expect(switchedState.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.dev.com' });

    const resolvedUrl = resolveVariables(requests[0], switchedState.variables, switchedState.filePath).url;
    expect(resolvedUrl).toBe('https://api.dev.com/posts');

    const width = getMaxRequestLineWidth({ requests: switchedState.requests, variables: switchedState.variables, baseDir: switchedState.filePath });
    expect(width).toBe(2 + 7 + '/posts'.length);
  });

  it('switching back to (none) reverts to file variables', () => {
    const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.local' }];
    const envVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.dev.com' }];
    const requests: ParsedRequest[] = [createRequest({ url: '{{baseUrl}}/posts', lineNumber: 1 })];

    const initialState = createInitialState({
      requests,
      fileVariables,
      variables: fileVariables,
      availableEnvironments: [
        { name: '(none)', file: null },
        { name: 'Dev', file: 'env/dev.json' },
      ],
    });

    const switchedState = stateReducer(initialState, {
      type: 'SWITCH_ENV',
      environmentVariables: envVariables,
      envName: 'Dev',
    });

    const revertedState = stateReducer(switchedState, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    const resolvedUrl = resolveVariables(requests[0], revertedState.variables, revertedState.filePath).url;
    expect(resolvedUrl).toBe('https://api.local/posts');
  });
});

describe('request list re-resolves on file reload', () => {
  it('RELOAD_FILE updates the variable map used by the request list', () => {
    const oldVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://a.com' }];
    const newVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://b.com' }];
    const requests: ParsedRequest[] = [createRequest({ url: '{{baseUrl}}/very-long-path', lineNumber: 1 })];

    const initialState = createInitialState({
      requests,
      fileVariables: oldVariables,
      variables: oldVariables,
    });

    const reloadedState = stateReducer(initialState, {
      type: 'RELOAD_FILE',
      requests,
      variables: newVariables,
    });

    expect(reloadedState.variables).toContainEqual({ name: 'baseUrl', value: 'https://b.com' });

    const width = getMaxRequestLineWidth({ requests: reloadedState.requests, variables: reloadedState.variables, baseDir: reloadedState.filePath });
    expect(width).toBe(2 + 7 + '/very-long-path'.length);
  });
});