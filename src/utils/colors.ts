type ColorSegment = {
  text: string;
  color: string;
};

const STRUCTURAL_CHARACTERS = new Set(['{', '}', '[', ']', ',', ':']);

export function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return 'green';
  }

  if (statusCode >= 300 && statusCode < 400) {
    return 'yellow';
  }

  if (statusCode >= 400 && statusCode < 500) {
    return 'yellowBright';
  }

  if (statusCode >= 500 && statusCode < 600) {
    return 'red';
  }

  return 'white';
}

export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'green';
    case 'POST':
      return 'blue';
    case 'PUT':
      return 'yellow';
    case 'PATCH':
      return 'magenta';
    case 'DELETE':
      return 'red';
    case 'HEAD':
      return 'cyan';
    case 'OPTIONS':
      return 'gray';
    default:
      return 'white';
  }
}

export function isJsonString(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function colorizeJson(json: string): Array<{ text: string; color: string }> {
  if (json.length === 0) {
    return [];
  }

  const segments: ColorSegment[] = [];
  const lines = json.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    let index = 0;

    while (index < line.length) {
      const character = line[index];

      if (character === ' ' || character === '\t') {
        const start = index;
        while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
          index += 1;
        }
        segments.push({ text: line.slice(start, index), color: 'white' });
        continue;
      }

      if (STRUCTURAL_CHARACTERS.has(character)) {
        segments.push({ text: character, color: 'white' });
        index += 1;
        continue;
      }

      if (character === '"') {
        const start = index;
        index += 1;

        while (index < line.length) {
          if (line[index] === '\\') {
            index += 2;
            continue;
          }

          if (line[index] === '"') {
            index += 1;
            break;
          }

          index += 1;
        }

        let lookahead = index;
        while (lookahead < line.length && /\s/.test(line[lookahead])) {
          lookahead += 1;
        }

        segments.push({
          text: line.slice(start, index),
          color: line[lookahead] === ':' ? 'cyan' : 'green',
        });
        continue;
      }

      if (character === '-' || /\d/.test(character)) {
        const start = index;
        index += 1;

        while (index < line.length && /[0-9eE+.-]/.test(line[index])) {
          index += 1;
        }

        segments.push({ text: line.slice(start, index), color: 'yellow' });
        continue;
      }

      if (line.startsWith('true', index) || line.startsWith('false', index)) {
        const value = line.startsWith('true', index) ? 'true' : 'false';
        segments.push({ text: value, color: 'magenta' });
        index += value.length;
        continue;
      }

      if (line.startsWith('null', index)) {
        segments.push({ text: 'null', color: 'gray' });
        index += 4;
        continue;
      }

      segments.push({ text: character, color: 'white' });
      index += 1;
    }

    if (lineIndex < lines.length - 1) {
      segments.push({ text: '\n', color: 'white' });
    }
  }

  return segments;
}
