import type { FileVariable } from './types.js';

export function parseEnvironmentFile(content: string): {
  name: string | null;
  variables: FileVariable[];
} {
  let raw: unknown;

  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse environment file: invalid JSON');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Failed to parse environment file: expected JSON object');
  }

  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' && obj.name !== '' ? obj.name : null;
  const values = obj.values;

  if (!Array.isArray(values)) {
    return { name, variables: [] };
  }

  const variables: FileVariable[] = [];

  for (const entry of values) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const valueEntry = entry as Record<string, unknown>;

    const key = valueEntry.key;
    if (typeof key !== 'string' || key === '') {
      continue;
    }

    if (valueEntry.enabled === false) {
      continue;
    }

    const value = valueEntry.value;
    const valueStr = typeof value === 'string' ? value : String(value ?? '');

    variables.push({
      name: key,
      value: valueStr,
    });
  }

  return { name, variables };
}
