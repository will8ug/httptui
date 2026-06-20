import { describe, expect, it } from 'vitest';

import {
  ENV_PICKER_VERTICAL_OVERHEAD,
  MAX_ENV_PICKER_VISIBLE,
  getEnvPickerVisibleHeight,
} from '../../src/utils/layout';

describe('getEnvPickerVisibleHeight', () => {
  it('caps at MAX_ENV_PICKER_VISIBLE (8) on large terminals', () => {
    expect(getEnvPickerVisibleHeight(24)).toBe(8);
    expect(getEnvPickerVisibleHeight(40)).toBe(8);
    expect(getEnvPickerVisibleHeight(80)).toBe(8);
  });

  it('returns rows minus overhead on small terminals', () => {
    expect(getEnvPickerVisibleHeight(12)).toBe(4);
    expect(getEnvPickerVisibleHeight(14)).toBe(6);
  });

  it('returns at least 1 on tiny terminals (Math.max floor)', () => {
    expect(getEnvPickerVisibleHeight(ENV_PICKER_VERTICAL_OVERHEAD)).toBe(1);
    expect(getEnvPickerVisibleHeight(1)).toBe(1);
  });

  it('caps exactly at 8 when rows - overhead equals MAX_ENV_PICKER_VISIBLE', () => {
    const boundaryRows = MAX_ENV_PICKER_VISIBLE + ENV_PICKER_VERTICAL_OVERHEAD;
    expect(getEnvPickerVisibleHeight(boundaryRows)).toBe(MAX_ENV_PICKER_VISIBLE);
    expect(getEnvPickerVisibleHeight(boundaryRows - 1)).toBe(MAX_ENV_PICKER_VISIBLE - 1);
  });
});
