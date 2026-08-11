import { describe, expect, it } from 'vitest';

import {
  ENV_PICKER_VERTICAL_OVERHEAD,
  MAX_ENV_PICKER_VISIBLE,
  getEditorBoxHeight,
  getEditorBoxWidth,
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

describe('editor box and content dimensions', () => {
  it('derives content width from box width by subtracting horizontal chrome', () => {
    for (const columns of [10, 40, 54, 80, 120, 200]) {
      expect(getEditorContentWidth(columns)).toBe(getEditorBoxWidth(columns) - 4);
    }
  });

  it('derives visible height from box height by subtracting vertical chrome', () => {
    for (const rows of [1, 10, 14, 24, 40, 60]) {
      expect(getEditorVisibleHeight(rows)).toBe(getEditorBoxHeight(rows) - 7);
    }
  });

  it('floors the box at its minimum dimensions on tiny terminals', () => {
    expect(getEditorBoxWidth(10)).toBe(48);
    expect(getEditorBoxHeight(1)).toBe(10);
  });

  it('insets the box from the terminal edges on large terminals', () => {
    expect(getEditorBoxWidth(120)).toBe(114);
    expect(getEditorBoxHeight(40)).toBe(36);
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
  it('returns rows minus 11 on standard terminals', () => {
    expect(getEditorVisibleHeight(24)).toBe(13);
    expect(getEditorVisibleHeight(40)).toBe(29);
  });

  it('returns 3 at the boundary where rows - 4 equals 10', () => {
    expect(getEditorVisibleHeight(14)).toBe(3);
  });

  it('returns 3 on tiny terminals', () => {
    expect(getEditorVisibleHeight(10)).toBe(3);
    expect(getEditorVisibleHeight(1)).toBe(3);
  });
});
