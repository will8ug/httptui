import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import type { FileVariable, ParsedRequest, ResolvedRequest } from './types.js';

const PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/g;
const DEFAULT_RANDOM_MIN = 0;
const DEFAULT_RANDOM_MAX = 1000;

interface ResolutionContext {
  dotenvPath?: string;
  dotenvVariables?: Map<string, string>;
  baseDir?: string;
}

export function mergeVariables(
  fileVariables: FileVariable[],
  environmentVariables?: FileVariable[],
): FileVariable[] {
  if (!environmentVariables || environmentVariables.length === 0) {
    return fileVariables;
  }

  const merged = new Map<string, string>();

  for (const variable of fileVariables) {
    merged.set(variable.name, variable.value);
  }

  for (const variable of environmentVariables) {
    merged.set(variable.name, variable.value);
  }

  const result: FileVariable[] = [];
  for (const [name, value] of merged) {
    result.push({ name, value });
  }

  return result;
}

export function resolveVariables(
  request: ParsedRequest,
  variables: FileVariable[],
  baseDir?: string,
): ResolvedRequest {
  const context = createResolutionContext(baseDir);
  const resolvedFileVariables = resolveFileVariablesInternal(variables, context);

  const resolvedFormdataFields = request.formdataFields?.map((field) => ({
    ...field,
    value: resolveRequestValue(field.value, resolvedFileVariables, context),
  }));

  return {
    method: request.method,
    url: resolveRequestValue(request.url, resolvedFileVariables, context),
    headers: Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [
        key,
        resolveRequestValue(value, resolvedFileVariables, context),
      ]),
    ),
    body:
      request.body === undefined
        ? undefined
        : resolveRequestValue(request.body, resolvedFileVariables, context),
    formdataFields: resolvedFormdataFields,
  };
}

function resolveFileVariablesInternal(
  variables: FileVariable[],
  context: ResolutionContext,
): Map<string, string> {
  const rawVariables = new Map<string, string>();
  const resolvedVariables = new Map<string, string>();
  const resolvingVariables = new Set<string>();

  for (const variable of variables) {
    rawVariables.set(variable.name, variable.value);
  }

  const resolveVariable = (name: string): string | undefined => {
    const cachedValue = resolvedVariables.get(name);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const rawValue = rawVariables.get(name);

    if (rawValue === undefined) {
      return undefined;
    }

    if (resolvingVariables.has(name)) {
      return rawValue;
    }

    resolvingVariables.add(name);

    const withNestedVariables = replacePlaceholders(rawValue, (expression, original) => {
      if (expression.startsWith('$')) {
        return original;
      }

      return resolveVariable(expression) ?? original;
    });

    const finalValue = resolveSystemVariables(withNestedVariables, context);

    resolvingVariables.delete(name);
    resolvedVariables.set(name, finalValue);

    return finalValue;
  };

  for (const variable of variables) {
    resolveVariable(variable.name);
  }

  return resolvedVariables;
}

function resolveRequestValue(
  value: string,
  resolvedFileVariables: ReadonlyMap<string, string>,
  context: ResolutionContext,
): string {
  const withFileVariables = replacePlaceholders(value, (expression, original) => {
    if (expression.startsWith('$')) {
      return original;
    }

    return resolvedFileVariables.get(expression) ?? original;
  });

  return resolveSystemVariables(withFileVariables, context);
}

function resolveSystemVariables(value: string, context: ResolutionContext): string {
  return replacePlaceholders(value, (expression, original) => {
    if (!expression.startsWith('$')) {
      return original;
    }

    return resolveSystemVariable(expression, context) ?? original;
  });
}

function replacePlaceholders(
  value: string,
  resolver: (expression: string, original: string) => string,
): string {
  return value.replace(PLACEHOLDER_PATTERN, (original, expression: string) => {
    return resolver(expression.trim(), original);
  });
}

function resolveSystemVariable(
  expression: string,
  context: ResolutionContext,
): string | undefined {
  const [name, ...args] = expression.slice(1).split(/\s+/);

  switch (name) {
    case 'timestamp':
      return Math.floor(Date.now() / 1000).toString();
    case 'guid':
      return randomUUID();
    case 'randomInt':
      return resolveRandomInt(args);
    case 'processEnv':
      return resolveProcessEnv(args[0]);
    case 'dotenv':
      return resolveDotenv(args[0], context);
    default:
      return undefined;
  }
}

function resolveRandomInt(args: string[]): string | undefined {
  let min = DEFAULT_RANDOM_MIN;
  let max = DEFAULT_RANDOM_MAX;

  if (args.length === 2) {
    const parsedMin = Number.parseInt(args[0], 10);
    const parsedMax = Number.parseInt(args[1], 10);

    if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax)) {
      return undefined;
    }

    min = parsedMin;
    max = parsedMax;
  } else if (args.length !== 0) {
    return undefined;
  }

  if (min > max) {
    [min, max] = [max, min];
  }

  const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;

  return randomValue.toString();
}

function resolveProcessEnv(name: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }

  return process.env[name];
}

function resolveDotenv(name: string | undefined, context: ResolutionContext): string | undefined {
  if (!name) {
    return undefined;
  }

  return getDotenvVariables(context).get(name);
}

function getDotenvVariables(context: ResolutionContext): Map<string, string> {
  if (context.dotenvVariables !== undefined) {
    return context.dotenvVariables;
  }

  const baseDir = context.baseDir;
  let dotenvPath: string | undefined;

  if (baseDir) {
    const projectDotenv = resolvePath(baseDir, '.env');
    if (existsSync(projectDotenv)) {
      dotenvPath = projectDotenv;
    }
  }

  if (!dotenvPath) {
    const cwdDotenv = resolvePath(process.cwd(), '.env');
    if (existsSync(cwdDotenv)) {
      dotenvPath = cwdDotenv;
    }
  }

  context.dotenvVariables = parseDotenvFile(dotenvPath);

  return context.dotenvVariables;
}

function parseDotenvFile(filePath?: string): Map<string, string> {
  if (!filePath || !existsSync(filePath)) {
    return new Map<string, string>();
  }

  const fileContents = readFileSync(filePath, 'utf8');
  const variables = new Map<string, string>();

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (key === '') {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    variables.set(key, value);
  }

  return variables;
}

function createResolutionContext(baseDir?: string): ResolutionContext {
  return { baseDir };
}
