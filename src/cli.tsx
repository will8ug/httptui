import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import tls from 'node:tls';

import { render } from 'ink';

import { App } from './app';
import { parseArgs } from './args';
import { loadConfig } from './core/config';
import { parseHttpFile } from './core/parser';
import { detectFormat, parsePostmanCollection } from './core/postman-parser';
import { parsePostmanEnvironment } from './core/postman-env-parser';
import { mergeVariables } from './core/variables';
import type { FileVariable, ParseResult } from './core/types';

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

const { filePath, insecure, envPath } = parseArgs(process.argv);

if (!filePath) {
  exitWithError('Usage: httptui <file.http>');
}

if (!existsSync(filePath)) {
  exitWithError(`File not found: ${filePath}`);
}

let environmentVariables: FileVariable[] = [];

if (envPath) {
  if (!existsSync(envPath)) {
    exitWithError(`Environment file not found: ${envPath}`);
  }

  try {
    const envContent = readFileSync(envPath, 'utf8');
    environmentVariables = parsePostmanEnvironment(envContent);
  } catch (error) {
    exitWithError(
      error instanceof Error
        ? `Failed to parse environment file: ${error.message}`
        : 'Failed to parse environment file',
    );
  }
}

const content = readFileSync(filePath, 'utf8');
const parseResult: ParseResult =
  detectFormat(filePath, content) === 'postman'
    ? parsePostmanCollection(content)
    : parseHttpFile(content);

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

const httptuiConfig = loadConfig(dirname(filePath));

const mergedVariables = mergeVariables(parseResult.variables, environmentVariables);

const app = render(
  <App
    filePath={filePath}
    requests={parseResult.requests}
    variables={mergedVariables}
    environmentVariables={environmentVariables}
    executorConfig={{ insecure, certificates: httptuiConfig?.certificates, configDir: httptuiConfig?.configDir }}
  />,
);

void app.waitUntilExit().finally(restoreScreen);
