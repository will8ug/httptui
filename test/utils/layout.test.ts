import { describe, expect, it } from 'vitest';

import {
  ENV_PICKER_VERTICAL_OVERHEAD,
  MAX_ENV_PICKER_VISIBLE,
  getEditorContentWidth,
  getEditorVisibleHeight,
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

describe('getEditorContentWidth', () => {
  it('returns columns minus 10 when columns is large enough', () => {
    expect(getEditorContentWidth(80)).toBe(70);
    expect(getEditorContentWidth(120)).toBe(110);
  });

  it('returns 44 at the minimum-width threshold', () => {
    expect(getEditorContentWidth(54)).toBe(44);
  });

  it('floors at 44 on narrow terminals', () => {
    expect(getEditorContentWidth(40)).toBe(44);
    expect(getEditorContentWidth(10)).toBe(44);
  });
});

describe('getEditorVisibleHeight', () => {
  it('returns rows minus 10 on standard terminals', () => {
    expect(getEditorVisibleHeight(24)).toBe(14);
    expect(getEditorVisibleHeight(40)).toBe(30);
  });

  it('returns 4 at the boundary where rows - 4 equals 10', () => {
    expect(getEditorVisibleHeight(14)).toBe(4);
  });

  it('returns at least 4 on tiny terminals', () => {
    expect(getEditorVisibleHeight(10)).toBe(4);
    expect(getEditorVisibleHeight(1)).toBe(4);
  });
});
