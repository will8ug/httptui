import { basename, extname } from 'node:path';

import type { EnvOption, EnvironmentConfig } from './types';

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
