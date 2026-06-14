import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, extname } from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

import { render } from 'ink';

import { App } from './app';
import { parseArgs } from './args';
import { loadConfig, resolveCertPath } from './core/config';
import { parseHttpFile } from './core/parser';
import { detectFormat, parsePostmanCollection } from './core/postman-parser';
import { parseEnvironmentFile } from './core/env-parser';
import { mergeVariables } from './core/variables';
import type { EnvOption, EnvironmentConfig, FileVariable, ParseResult } from './core/types';

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

function isMainModule(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  try {
    const entryPath = realpathSync(process.argv[1]);
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return entryPath === modulePath;
  } catch {
    return false;
  }
}

export interface AggregateEnvironmentsInput {
  configEnvironments: EnvironmentConfig[];
  envName: string | undefined;
  envPath: string | undefined;
  parsedEnvFileName: string | null;
}

export interface AggregateEnvironmentsResult {
  availableEnvironments: EnvOption[];
  activeEnvName: string | null;
}

export function aggregateEnvironments(input: AggregateEnvironmentsInput): AggregateEnvironmentsResult {
  const { configEnvironments, envName, envPath, parsedEnvFileName } = input;

  const availableEnvironments: EnvOption[] = [{ name: '(none)', file: null }];
  for (const cfg of configEnvironments) {
    availableEnvironments.push({ name: cfg.name, file: cfg.file });
  }

  if (envPath !== undefined && parsedEnvFileName !== null) {
    const existingIndex = availableEnvironments.findIndex((opt) => opt.name === parsedEnvFileName);
    if (existingIndex !== -1) {
      availableEnvironments[existingIndex] = { name: parsedEnvFileName, file: envPath };
    } else {
      availableEnvironments.push({ name: parsedEnvFileName, file: envPath });
    }
  }

  let activeEnvName: string | null = null;
  if (envName !== undefined) {
    activeEnvName = envName;
  } else if (envPath !== undefined) {
    activeEnvName = parsedEnvFileName ?? basename(envPath, extname(envPath));
  }

  return { availableEnvironments, activeEnvName };
}

async function runCli(): Promise<void> {
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
  let parsedEnvFileName: string | null = null;

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
    resolvedEnvPath = resolveCertPath(match.file, '');
  }

  if (resolvedEnvPath) {
    if (!existsSync(resolvedEnvPath)) {
      exitWithError(`Environment file not found: ${resolvedEnvPath}`);
    }

    try {
      const envContent = readFileSync(resolvedEnvPath, 'utf8');
      const parsed = parseEnvironmentFile(envContent);
      environmentVariables = parsed.variables;
      parsedEnvFileName = parsed.name;
    } catch (error) {
      exitWithError(
        error instanceof Error
          ? `Failed to parse environment file: ${error.message}`
          : 'Failed to parse environment file',
      );
    }
  }

  const mergedVariables = mergeVariables(parseResult.variables, environmentVariables);

  const { availableEnvironments, activeEnvName } = aggregateEnvironments({
    configEnvironments: httptuiConfig?.environments ?? [],
    envName,
    envPath,
    parsedEnvFileName,
  });

  const app = render(
    <App
      filePath={filePath}
      requests={parseResult.requests}
      variables={mergedVariables}
      fileVariables={parseResult.variables}
      environmentVariables={environmentVariables}
      activeEnvName={activeEnvName}
      availableEnvironments={availableEnvironments}
      executorConfig={{ insecure, certificates: httptuiConfig?.certificates }}
    />,
  );

  await app.waitUntilExit();
  restoreScreen();
}

if (isMainModule()) {
  void runCli();
}
