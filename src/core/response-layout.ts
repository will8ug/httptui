import type { ResponseData, WrapMode } from './types';
import { colorizeJson, getStatusColor, isJsonString } from '../utils/colors';
import type { ColorSegment } from '../utils/wrap';
import { wrapColorizedSegments, wrapLine } from '../utils/wrap';

export type VisualSection =
  | { kind: 'status'; visualLines: ColorSegment[][] }
  | { kind: 'header'; name: string; visualLines: ColorSegment[][] }
  | { kind: 'separator'; visualLines: ColorSegment[][] }
  | { kind: 'body'; rawBodyIndex: number; visualLines: ColorSegment[][] };

export interface ResponseLayout {
  sections: VisualSection[];
  totalVisualLines: number;
  bodyStartVisualIndex: number;
  bodyVisualStart: number[];
}

export type ResponseForLayout = Pick<
  ResponseData,
  'statusCode' | 'statusText' | 'headers' | 'timing'
>;

export interface ComputeResponseLayoutOptions {
  response: ResponseForLayout;
  verbose: boolean;
  rawMode: boolean;
  wrapMode: WrapMode;
  contentWidth: number;
  formattedBody: string;
}

export function formatStatusLine(response: ResponseForLayout): ColorSegment[] {
  return [
    { text: 'HTTP/1.1 ', color: 'gray' },
    {
      text: `${response.statusCode} ${response.statusText}`,
      color: getStatusColor(response.statusCode),
    },
    { text: `  ${Math.round(response.timing.durationMs)}ms`, color: 'gray' },
  ];
}

function singleLineSection(segments: ColorSegment[]): ColorSegment[][] {
  return [segments];
}

function wrapSegments(
  segments: ColorSegment[],
  contentWidth: number,
  wrapMode: WrapMode,
): ColorSegment[][] {
  if (wrapMode === 'wrap') {
    return wrapColorizedSegments(segments, contentWidth);
  }
  return singleLineSection(segments);
}

function buildHeaderSegments(name: string, value: string): ColorSegment[] {
  return [{ text: `${name}: ${value}`, color: 'gray' }];
}

function buildSeparatorSegments(contentWidth: number): ColorSegment[] {
  return [{ text: '─'.repeat(contentWidth), color: 'gray' }];
}

function buildBodyLineVisualLines(
  rawLine: string,
  isJsonBody: boolean,
  wrapMode: WrapMode,
  contentWidth: number,
): ColorSegment[][] {
  const safeLine = rawLine === '' ? ' ' : rawLine;

  if (wrapMode === 'wrap') {
    if (isJsonBody) {
      const segments = colorizeJson(safeLine);
      return wrapColorizedSegments(segments, contentWidth);
    }
    return wrapLine(safeLine, contentWidth).map((line) => [{ text: line, color: 'white' }]);
  }

  if (isJsonBody) {
    return singleLineSection(colorizeJson(safeLine));
  }
  return singleLineSection([{ text: safeLine, color: 'white' }]);
}

export function computeResponseLayout(
  options: ComputeResponseLayoutOptions,
): ResponseLayout {
  const { response, verbose, rawMode, wrapMode, contentWidth, formattedBody } = options;

  const sections: VisualSection[] = [];
  let totalVisualLines = 0;

  const statusSegments = formatStatusLine(response);
  const statusVisualLines = wrapSegments(statusSegments, contentWidth, wrapMode);
  sections.push({ kind: 'status', visualLines: statusVisualLines });
  totalVisualLines += statusVisualLines.length;

  if (verbose) {
    for (const [name, value] of Object.entries(response.headers)) {
      const headerVisualLines = wrapSegments(
        buildHeaderSegments(name, value),
        contentWidth,
        wrapMode,
      );
      sections.push({ kind: 'header', name, visualLines: headerVisualLines });
      totalVisualLines += headerVisualLines.length;
    }
  }

  const separatorVisualLines = singleLineSection(buildSeparatorSegments(contentWidth));
  sections.push({ kind: 'separator', visualLines: separatorVisualLines });
  totalVisualLines += separatorVisualLines.length;

  const bodyStartVisualIndex = totalVisualLines;

  const isJsonBody = !rawMode && isJsonString(formattedBody);
  const bodyLines = formattedBody.split('\n');
  const bodyVisualStart: number[] = [];

  for (let rawBodyIndex = 0; rawBodyIndex < bodyLines.length; rawBodyIndex += 1) {
    bodyVisualStart.push(totalVisualLines);
    const visualLines = buildBodyLineVisualLines(
      bodyLines[rawBodyIndex],
      isJsonBody,
      wrapMode,
      contentWidth,
    );
    sections.push({ kind: 'body', rawBodyIndex, visualLines });
    totalVisualLines += visualLines.length;
  }

  return { sections, totalVisualLines, bodyStartVisualIndex, bodyVisualStart };
}
