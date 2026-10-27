import { describe, expect, it } from 'vitest';

import type { AppState, ParsedRequest } from '../../../src/core/types';
import { INITIAL_FILE_LOAD } from '../../../src/core/reducers/helpers';
import { createRequest } from '../../helpers/requests';
import { sampleRequests, sampleVariables, toVarMap } from '../../helpers/fixtures';
import { createInitialState, reducer } from '../../helpers/state';

describe('RELOAD_FILE reducer', () => {
  it('preserves selection by name when request still exists', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const newRequests: ParsedRequest[] = [
      sampleRequests[0],
      sampleRequests[1],
      sampleRequests[2],
    ];

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: newRequests,
      variables: [],
      format: 'http',
    });

    expect(result.selectedIndex).toBe(1);
  });

  it('resets selection to 0 when request name not found', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const newRequests: ParsedRequest[] = [
      sampleRequests[0],
    ];

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: newRequests,
      variables: [],
      format: 'http',
    });

    expect(result.selectedIndex).toBe(0);
  });

  it('clears response, error, and scroll offsets', () => {
    const state: AppState = {
      ...createInitialState(),
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: 'old data',
        rawBody: 'old data',
        timing: { durationMs: 100 },
        size: { bodyBytes: 8 },
      },
      requestError: null,
      responseScrollOffset: 5,
      requestScrollOffset: 3,
      detailsScrollOffset: 2,
      detailsHorizontalOffset: 4,
    };

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      format: 'http',
    });

    expect(result.response).toBeNull();
    expect(result.requestError).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
  });

  it('clears transientError when set', () => {
    const state: AppState = {
      ...createInitialState(),
      transientError: 'Reload failed',
    };

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      format: 'http',
    });

    expect(result.transientError).toBeNull();
  });

  it('sets transientMessage to "Reloaded"', () => {
    const result = reducer(createInitialState(), {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      format: 'http',
    });

    expect(result.transientMessage).toBe('Reloaded');
  });

  // Characterization pin: the reload outcome's format overwrites the previous
  // source format, mirroring LOAD_FILE.
  it('records the reloaded file format in state', () => {
    const state = createInitialState({ sourceFormat: 'http' });

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      format: 'postman',
    });

    expect(result.sourceFormat).toBe('postman');
  });
});

describe('CLEAR_TRANSIENT_MESSAGE reducer', () => {
  it('does not change other state fields', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 2,
      transientMessage: 'Reloaded',
    };

    const result = reducer(state, { type: 'CLEAR_TRANSIENT_MESSAGE' });

    expect(result.requests).toEqual(sampleRequests);
    expect(result.selectedIndex).toBe(2);
    expect(result.transientMessage).toBeNull();
  });

  it('clears transientError when set', () => {
    const state: AppState = {
      ...createInitialState(),
      transientError: 'Reload failed',
    };

    const result = reducer(state, { type: 'CLEAR_TRANSIENT_MESSAGE' });

    expect(result.transientError).toBeNull();
  });
});

describe('RELOAD_FILE preserves pristine file variables for later (none) switch', () => {
  it('after reloading the current file with an active env, switching to (none) falls back to the new file variables', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      environmentVariables: [{ name: 'baseUrl', value: 'from-env' }],
      variables: [{ name: 'baseUrl', value: 'from-env' }],
      fileVariables: [{ name: 'baseUrl', value: 'old-file-value' }],
      activeEnvName: 'Staging',
    };

    const afterReload = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: [{ name: 'baseUrl', value: 'new-file-value' }],
      format: 'http',
    });

    expect(afterReload.fileVariables).toEqual([{ name: 'baseUrl', value: 'new-file-value' }]);

    expect(toVarMap(afterReload.variables).get('baseUrl')).toBe('from-env');

    const afterNone = reducer(afterReload, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(afterNone.activeEnvName).toBeNull();
    expect(afterNone.environmentVariables).toEqual([]);
    expect(toVarMap(afterNone.variables).get('baseUrl')).toBe('new-file-value');
  });
});

describe('ENTER_FILE_LOAD reducer', () => {
  it('clears previous input, error, and cursor when entering file-load mode', () => {
    const state: AppState = {
      ...createInitialState(),
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'stale path', cursor: 5, error: 'stale error' },
    };

    const result = reducer(state, { type: 'ENTER_FILE_LOAD' });

    expect(result.fileLoad.input).toBe('');
    expect(result.fileLoad.cursor).toBe(0);
    expect(result.fileLoad.error).toBeNull();
  });
});

describe('UPDATE_FILE_LOAD_INPUT reducer', () => {
  it('updates fileLoad input and cursor', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'old' },
    };

    const result = reducer(state, { type: 'UPDATE_FILE_LOAD_INPUT', value: 'api.http', cursor: 4 });

    expect(result.fileLoad.input).toBe('api.http');
    expect(result.fileLoad.cursor).toBe(4);
  });

  it('clears a lingering fileLoad error like the save siblings', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'api.htt', error: 'File not found: api.htt' },
    };

    const result = reducer(state, { type: 'UPDATE_FILE_LOAD_INPUT', value: 'api.http', cursor: 8 });

    expect(result.fileLoad.error).toBeNull();
  });
});

describe('FILE_LOAD_KEY reducer', () => {
  it('applies the op to the cluster buffer', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'api.http', cursor: 2 },
    };

    const inserted = reducer(state, { type: 'FILE_LOAD_KEY', op: 'insert', insert: 'X' });
    expect(inserted.fileLoad.input).toBe('apXi.http');
    expect(inserted.fileLoad.cursor).toBe(3);

    const moved = reducer(state, { type: 'FILE_LOAD_KEY', op: 'left' });
    expect(moved.fileLoad.input).toBe('api.http');
    expect(moved.fileLoad.cursor).toBe(1);
  });

  it('clears a lingering error on text-editing ops but not on cursor motions', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'api.htt', cursor: 7, error: 'File not found: api.htt' },
    };

    const moved = reducer(state, { type: 'FILE_LOAD_KEY', op: 'left' });
    expect(moved.fileLoad.error).toBe('File not found: api.htt');

    const edited = reducer(state, { type: 'FILE_LOAD_KEY', op: 'insert', insert: 'p' });
    expect(edited.fileLoad.error).toBeNull();
  });

  it('clears the completion list on every key op', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'src/', cursor: 4, completions: ['src/app'] },
    };

    expect(reducer(state, { type: 'FILE_LOAD_KEY', op: 'left' }).fileLoad.completions).toBeNull();
    expect(reducer(state, { type: 'FILE_LOAD_KEY', op: 'insert', insert: 'a' }).fileLoad.completions).toBeNull();
  });
});

describe('SET_FILE_LOAD_ERROR reducer', () => {
  it('stays in fileLoad mode after error', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { ...INITIAL_FILE_LOAD, input: 'bad.http' },
    };
    const result = reducer(state, { type: 'SET_FILE_LOAD_ERROR', error: 'File not found: bad.http' });

    expect(result.mode).toBe('fileLoad');
    expect(result.fileLoad.input).toBe('bad.http');
  });
});

describe('fileLoad dormancy invariant', () => {
  // Characterization pin: the exit and commit resets already enforce dormancy.
  it('cluster deep-equals INITIAL_FILE_LOAD after every exit/commit action', () => {
    const dirty: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoad: { input: 'stale.http', cursor: 4, error: 'File not found: stale.http', completions: ['stale.http'] },
    };

    const afterCancel = reducer(dirty, { type: 'CANCEL_FILE_LOAD' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.fileLoad).toEqual(INITIAL_FILE_LOAD);

    const afterLoad = reducer(dirty, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'next.http',
      format: 'http',
    });
    expect(afterLoad.mode).toBe('normal');
    expect(afterLoad.fileLoad).toEqual(INITIAL_FILE_LOAD);
  });
});

describe('LOAD_FILE reducer', () => {
  it('preserves selection by name when request still exists', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'other.http',
      format: 'http',
    });

    expect(result.selectedIndex).toBe(1);
  });

  it('resets selection to 0 when request name not found', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const newRequests: ParsedRequest[] = [
      createRequest({ name: 'Different request', url: 'https://new.api/other' }),
    ];

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: newRequests,
      variables: [],
      filePath: 'other.http',
      format: 'http',
    });

    expect(result.selectedIndex).toBe(0);
  });

  it('clears response, error, and scroll offsets', () => {
    const state: AppState = {
      ...createInitialState(),
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: 'old data',
        rawBody: 'old data',
        timing: { durationMs: 100 },
        size: { bodyBytes: 8 },
      },
      requestError: null,
      responseScrollOffset: 5,
      requestScrollOffset: 3,
      detailsScrollOffset: 2,
      detailsHorizontalOffset: 4,
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'new.http',
      format: 'http',
    });

    expect(result.response).toBeNull();
    expect(result.requestError).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
  });

  it('sets transientMessage with basename of filePath', () => {
    const state = createInitialState();
    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: '/some/deep/path/api.http',
      format: 'http',
    });

    expect(result.transientMessage).toBe('Loaded: api.http');
  });

  it('clears transientError when set', () => {
    const state: AppState = {
      ...createInitialState(),
      transientError: 'Load failed',
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: '/some/deep/path/api.http',
      format: 'http',
    });

    expect(result.transientError).toBeNull();
  });

  // Characterization pin: a loaded file's format replaces the previous source
  // format, unlike APPEND_REQUEST which appends and keeps it.
  it('records the loaded file format in state', () => {
    const state = createInitialState({ sourceFormat: 'http' });

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'collection.json',
      format: 'openapi',
    });

    expect(result.sourceFormat).toBe('openapi');
  });
});

describe('CANCEL_FILE_LOAD reducer', () => {
  it('does not change existing requests or filePath', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      requests: sampleRequests,
      filePath: 'original.http',
    };

    const result = reducer(state, { type: 'CANCEL_FILE_LOAD' });

    expect(result.requests).toEqual(sampleRequests);
    expect(result.filePath).toBe('original.http');
    expect(result.mode).toBe('normal');
    expect(result.fileLoad.input).toBe('');
    expect(result.fileLoad.error).toBeNull();
  });
});

describe('LOAD_FILE preserves pristine file variables for later (none) switch', () => {
  it('after loading a new file with an active env, switching to (none) falls back to the new file variables', () => {
    const state: AppState = {
      ...createInitialState(),
      environmentVariables: [{ name: 'baseUrl', value: 'from-env' }],
      variables: [{ name: 'baseUrl', value: 'from-env' }],
      activeEnvName: 'Staging',
    };

    const afterLoad = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: [{ name: 'baseUrl', value: 'from-file' }],
      filePath: 'other.http',
      format: 'http',
    });

    expect(afterLoad.fileVariables).toEqual([{ name: 'baseUrl', value: 'from-file' }]);

    expect(toVarMap(afterLoad.variables).get('baseUrl')).toBe('from-env');

    const afterNone = reducer(afterLoad, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(afterNone.activeEnvName).toBeNull();
    expect(afterNone.environmentVariables).toEqual([]);
    expect(toVarMap(afterNone.variables).get('baseUrl')).toBe('from-file');
  });
});