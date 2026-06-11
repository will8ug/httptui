import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import tls from 'node:tls';

import { render } from 'ink';

import { App } from './app';
import { parseArgs } from './args';
import { loadConfig, resolveCertPath } from './core/config';
import { parseHttpFile } from './core/parser';
import { detectFormat, parsePostmanCollection } from './core/postman-parser';
import { parseEnvironmentFile } from './core/env-parser';
import { mergeVariables } from './core/variables';
import type { FileVariable, ParseResult } from './core/types';

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

const { filePath, insecure, envPath, envName } = parseArgs(process.argv);

if (!filePath) {
  exitWithError('Usage: httptui <file.http>');
}

if (!existsSync(filePath)) {
  exitWithError(`File not found: ${filePath}`);
}

if (envPath && envName) {
  exitWithError('Error: only one of --env and --env-name can be specified');
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

let environmentVariables: FileVariable[] = [];

let resolvedEnvPath = envPath;

if (envName) {
  const environments = httptuiConfig?.environments;
  if (!environments) {
    exitWithError('Error: no environments configured in config file');
  }
  const match = environments.find((e) => e.name === envName);
  if (!match) {
    exitWithError(`Environment not found in config: ${envName}`);
  }
  const baseDir = httptuiConfig.configDir ?? dirname(filePath);
  resolvedEnvPath = resolveCertPath(match.file, baseDir);
}

if (resolvedEnvPath) {
  if (!existsSync(resolvedEnvPath)) {
    exitWithError(`Environment file not found: ${resolvedEnvPath}`);
  }

  try {
    const envContent = readFileSync(resolvedEnvPath, 'utf8');
    environmentVariables = parseEnvironmentFile(envContent);
  } catch (error) {
    exitWithError(
      error instanceof Error
        ? `Failed to parse environment file: ${error.message}`
        : 'Failed to parse environment file',
    );
  }
}

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
