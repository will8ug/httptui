import { existsSync, readFileSync } from 'node:fs';
import tls from 'node:tls';

import { render } from 'ink';

import { App } from './app';
import { parseArgs } from './args';
import { parseHttpFile } from './core/parser';

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

const { filePath, insecure } = parseArgs(process.argv);

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

try {
  const bundled = tls.getCACertificates('bundled');
  const system = tls.getCACertificates('system');
  tls.setDefaultCACertificates([...bundled, ...system]);
} catch {
  // Silently fall back to bundled CAs
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
