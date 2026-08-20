export interface PathEntry {
  name: string;
  isDirectory: boolean;
}

export interface CompletionResult {
  text: string;
  cursor: number;
  candidates: string[] | null;
}

function longestCommonPrefix(names: string[]): string {
  let prefix = names[0] ?? '';
  for (const name of names) {
    let length = 0;
    const max = Math.min(prefix.length, name.length);
    while (length < max && prefix[length] === name[length]) {
      length += 1;
    }
    prefix = prefix.slice(0, length);
  }
  return prefix;
}

export function completePath(
  buffer: { text: string; cursor: number },
  listDir: (dir: string) => PathEntry[],
): CompletionResult {
  const before = buffer.text.slice(0, buffer.cursor);
  const after = buffer.text.slice(buffer.cursor);
  const separatorIndex = before.lastIndexOf('/');
  const dirPart =
    separatorIndex === -1 ? '' : before.slice(0, separatorIndex + 1);
  const partial = before.slice(separatorIndex + 1);

  const matches = listDir(dirPart).filter(
    (entry) =>
      entry.name.startsWith(partial) &&
      (!entry.name.startsWith('.') || partial.startsWith('.')),
  );

  if (matches.length === 0) {
    return { text: buffer.text, cursor: buffer.cursor, candidates: null };
  }

  if (matches.length === 1) {
    const completed = matches[0].isDirectory
      ? `${matches[0].name}/`
      : matches[0].name;
    return {
      text: dirPart + completed + after,
      cursor: dirPart.length + completed.length,
      candidates: null,
    };
  }

  const prefix = longestCommonPrefix(matches.map((entry) => entry.name));
  if (prefix.length > partial.length) {
    return {
      text: dirPart + prefix + after,
      cursor: dirPart.length + prefix.length,
      candidates: null,
    };
  }

  const candidates = matches
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((entry) => (entry.isDirectory ? `${entry.name}/` : entry.name));
  return { text: buffer.text, cursor: buffer.cursor, candidates };
}
