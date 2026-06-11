const BOOLEAN_FLAGS = new Set(['--insecure', '-k']);
const ENV_FILE_FLAGS = new Set(['--env', '-e']);
const ENV_NAME_FLAGS = new Set(['--env-name', '-E']);

export function parseArgs(argv: string[]): {
  filePath: string | undefined;
  insecure: boolean;
  envPath: string | undefined;
  envName: string | undefined;
} {
  const args = argv.slice(2);
  const insecure = args.some((arg) => BOOLEAN_FLAGS.has(arg));

  let envPath: string | undefined;
  let envName: string | undefined;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (BOOLEAN_FLAGS.has(arg)) {
      continue;
    }

    if (ENV_FILE_FLAGS.has(arg)) {
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        envPath = nextArg;
        i += 1;
      }
      continue;
    }

    if (ENV_NAME_FLAGS.has(arg)) {
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        envName = nextArg;
        i += 1;
      }
      continue;
    }

    positionalArgs.push(arg);
  }

  return { filePath: positionalArgs[0], insecure, envPath, envName };
}
