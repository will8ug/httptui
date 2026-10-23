import { computeResponseLayout } from './response-layout';
import type { VisualSection } from './response-layout';
import { formatResponseBody } from './formatter';
import type { FocusedPanel, ResponseData, WrapMode } from './types';
import {
  getFullscreenRequestContentWidth,
  getLeftPanelWidth,
  getRequestContentWidth,
} from '../utils/layout';
import { cellWidth } from '../utils/text';
import type { ColorSegment } from '../utils/wrap';

/** Border (1 + 1) + paddingX (1 + 1) for the response panel */
export const RESPONSE_PANEL_CHROME = 4;

/** Vertical chrome (border top + title + border bottom) inside the response panel */
export const RESPONSE_PANEL_VERTICAL_CHROME = 3;

const SEARCH_BAR_HEIGHT = 1;
const MIN_RESPONSE_CONTENT_WIDTH = 20;

export function getResponseContentWidth(columns: number): number {
  return Math.max(
    MIN_RESPONSE_CONTENT_WIDTH,
    columns - getLeftPanelWidth(columns) - RESPONSE_PANEL_CHROME,
  );
}

export function getFullscreenContentWidth(columns: number): number {
  return Math.max(MIN_RESPONSE_CONTENT_WIDTH, columns - RESPONSE_PANEL_CHROME);
}

export function getPanelContentWidth({
  panel,
  maximizedPanel,
  columns,
}: {
  panel: FocusedPanel;
  maximizedPanel: FocusedPanel | null;
  columns: number;
}): number {
  const isMaximized = maximizedPanel === panel;
  if (panel === 'requests') {
    return isMaximized
      ? getFullscreenRequestContentWidth(columns)
      : getRequestContentWidth(columns);
  }
  return isMaximized
    ? getFullscreenContentWidth(columns)
    : getResponseContentWidth(columns);
}

export interface ResponseViewportGeometry {
  columns: number;
  availableHeight: number;
  fullscreen: boolean;
  searchVisible: boolean;
}

export interface ResponseViewportOptions {
  response: ResponseData;
  verbose: boolean;
  rawMode: boolean;
  wrapMode: WrapMode;
  geometry: ResponseViewportGeometry;
}

export interface ResponseViewportModel {
  sections: VisualSection[];
  totalVisualLines: number;
  bodyStartVisualIndex: number;
  bodyVisualStart: number[];
  visibleHeight: number;
  maxVerticalOffset: number;
  maxLineDisplayWidth: number;
  contentWidth: number;
}

function visibleHeightFor(geometry: ResponseViewportGeometry): number {
  const searchBarRows = geometry.searchVisible ? SEARCH_BAR_HEIGHT : 0;
  return Math.max(1, geometry.availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarRows);
}

function visualLineDisplayWidth(segments: ColorSegment[]): number {
  let width = 0;
  for (const segment of segments) {
    width += cellWidth(segment.text);
  }
  return width;
}

function maxVisualLineDisplayWidth(sections: VisualSection[]): number {
  let maxWidth = 0;
  for (const section of sections) {
    for (const visualLine of section.visualLines) {
      maxWidth = Math.max(maxWidth, visualLineDisplayWidth(visualLine));
    }
  }
  return maxWidth;
}

function contentWidthFor(geometry: ResponseViewportGeometry): number {
  return geometry.fullscreen
    ? getFullscreenContentWidth(geometry.columns)
    : getResponseContentWidth(geometry.columns);
}

function flattenVisualLines(sections: VisualSection[]): ColorSegment[][] {
  const lines: ColorSegment[][] = [];
  for (const section of sections) {
    for (const visualLine of section.visualLines) {
      lines.push(visualLine);
    }
  }
  return lines;
}

/**
 * Returns the renderable visual lines for a scroll window. Offsets beyond the
 * last visual line yield a shortened window; negative offsets are treated as zero.
 */
export function sliceVisibleLines(
  model: ResponseViewportModel,
  offset: number,
  height: number,
): ColorSegment[][] {
  const start = Math.max(0, offset);
  return flattenVisualLines(model.sections).slice(start, start + Math.max(0, height));
}

function sameGeometry(a: ResponseViewportGeometry, b: ResponseViewportGeometry): boolean {
  return (
    a.columns === b.columns &&
    a.availableHeight === b.availableHeight &&
    a.fullscreen === b.fullscreen &&
    a.searchVisible === b.searchVisible
  );
}

function sameOptions(a: ResponseViewportOptions, b: ResponseViewportOptions): boolean {
  return (
    a.response === b.response &&
    a.verbose === b.verbose &&
    a.rawMode === b.rawMode &&
    a.wrapMode === b.wrapMode &&
    sameGeometry(a.geometry, b.geometry)
  );
}

let memoizedOptions: ResponseViewportOptions | null = null;
let memoizedModel: ResponseViewportModel | null = null;

export function computeResponseViewport(options: ResponseViewportOptions): ResponseViewportModel {
  if (memoizedModel && memoizedOptions && sameOptions(memoizedOptions, options)) {
    return memoizedModel;
  }

  const { response, verbose, rawMode, wrapMode, geometry } = options;
  const contentWidth = contentWidthFor(geometry);
  const layout = computeResponseLayout({
    response,
    verbose,
    rawMode,
    wrapMode,
    contentWidth,
    formattedBody: formatResponseBody(response.body, rawMode),
  });
  const visibleHeight = visibleHeightFor(geometry);
  const model: ResponseViewportModel = {
    sections: layout.sections,
    totalVisualLines: layout.totalVisualLines,
    bodyStartVisualIndex: layout.bodyStartVisualIndex,
    bodyVisualStart: layout.bodyVisualStart,
    visibleHeight,
    maxVerticalOffset: Math.max(0, layout.totalVisualLines - visibleHeight),
    maxLineDisplayWidth: maxVisualLineDisplayWidth(layout.sections),
    contentWidth,
  };
  memoizedOptions = options;
  memoizedModel = model;
  return model;
}
