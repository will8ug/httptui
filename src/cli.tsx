import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { render } from 'ink';

import { App } from './app';
import { parseHttpFile } from './core/parser';

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

export function parseArgs(argv: string[]): { filePath: string | undefined; insecure: boolean } {
  const args = argv.slice(2);
  const flags = new Set(['--insecure', '-k']);
  const insecure = args.some((arg) => flags.has(arg));
  const positionalArgs = args.filter((arg) => !flags.has(arg));

  return { filePath: positionalArgs[0], insecure };
}

export function main(argv: string[] = process.argv): void {
  const { filePath, insecure } = parseArgs(argv);

  if (!filePath) {
    exitWithError('Usage: httptui <file.http>');
  }

  if (!existsSync(filePath)) {
    exitWithError(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf8');
  const parseResult = parseHttpFile(content);

  if (parseResult.requests.length === 0) {
    exitWithError(`No requests found in ${filePath}`);
  }

  let alternateScreenActive = false;

  const restoreScreen = (): void => {
    if (!alternateScreenActive || !process.stdout.isTTY) {
      return;
    }

    process.stdout.write('\u001B[?1049l');
    alternateScreenActive = false;
  };

  if (process.stdout.isTTY) {
    process.stdout.write('\u001B[?1049h');
    alternateScreenActive = true;
  }

  if (insecure) {
    process.stderr.write('\x1b[33m⚠ TLS certificate verification disabled (--insecure)\x1b[0m\n');
  }

  const app = render(
    <App
      filePath={filePath}
      requests={parseResult.requests}
      variables={parseResult.variables}
      executorConfig={{ insecure }}
    />,
  );

  void app.waitUntilExit().finally(restoreScreen);
}

const isEntrypoint = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isEntrypoint) {
  main();
}
