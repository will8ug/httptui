const BOOLEAN_FLAGS = new Set(['--insecure', '-k']);
const VALUE_FLAGS = new Set(['--env', '-e']);

export function parseArgs(argv: string[]): { filePath: string | undefined; insecure: boolean; envPath: string | undefined } {
  const args = argv.slice(2);
  const insecure = args.some((arg) => BOOLEAN_FLAGS.has(arg));

  let envPath: string | undefined;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (BOOLEAN_FLAGS.has(arg)) {
      continue;
    }

    if (VALUE_FLAGS.has(arg)) {
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        envPath = nextArg;
        i += 1;
      }
      continue;
    }

    positionalArgs.push(arg);
  }

  return { filePath: positionalArgs[0], insecure, envPath };
}
