const INSECURE_FLAGS = new Set(['--insecure', '-k']);
const ENV_FILE_FLAGS = new Set(['--env', '-e']);
const ENV_NAME_FLAGS = new Set(['--env-name', '-E']);
const VERSION_FLAGS = new Set(['--version', '-v']);

export function parseArgs(argv: string[]): {
  filePath: string | undefined;
  insecure: boolean;
  envPath: string | undefined;
  envName: string | undefined;
  version: boolean;
} {
  const args = argv.slice(2);
  const insecure = args.some((arg) => INSECURE_FLAGS.has(arg));
  const version = args.some((arg) => VERSION_FLAGS.has(arg));

  let envPath: string | undefined;
  let envName: string | undefined;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (INSECURE_FLAGS.has(arg) || VERSION_FLAGS.has(arg)) {
      continue;
    }

    if (ENV_FILE_FLAGS.has(arg)) {
      const nextArg = args[i + 1];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for missing next argument
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        envPath = nextArg;
        i += 1;
      }
      continue;
    }

    if (ENV_NAME_FLAGS.has(arg)) {
      const nextArg = args[i + 1];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for missing next argument
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        envName = nextArg;
        i += 1;
      }
      continue;
    }

    positionalArgs.push(arg);
  }

  return { filePath: positionalArgs[0], insecure, envPath, envName, version };
}
