import { spawn } from 'node:child_process';

export type ClipboardRunner = (
  command: string,
  args: string[],
  input: string,
  env?: NodeJS.ProcessEnv,
) => Promise<void>;

export type ClipboardReadRunner = (
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) => Promise<string>;

export interface ClipboardOptions {
  runner?: ClipboardRunner;
  readRunner?: ClipboardReadRunner;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
  }
}

interface ClipboardCandidate {
  command: string;
  args: string[];
  input: string;
  env?: NodeJS.ProcessEnv;
}

export function spawnClipboardTool(
  command: string,
  args: string[],
  input: string,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = env === undefined ? spawn(command, args) : spawn(command, args, { env });
    let settled = false;
    let failure: Error | undefined;
    let exitCode: number | null = null;
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (failure !== undefined) {
        reject(failure);
      } else if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with status ${exitCode === null ? 'unknown' : exitCode}`));
      }
    };
    child.on('error', (error) => {
      failure = error;
      settle();
    });
    child.on('close', (code) => {
      exitCode = code;
      settle();
    });
    // A tool exiting before draining stdin raises EPIPE on our end; the
    // child's exit status, not that write error, decides the outcome.
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function spawnClipboardReadTool(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = env === undefined ? spawn(command, args) : spawn(command, args, { env });
    let settled = false;
    let failure: Error | undefined;
    let exitCode: number | null = null;
    let stdout = '';
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (failure !== undefined) {
        reject(failure);
      } else if (exitCode === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} exited with status ${exitCode === null ? 'unknown' : exitCode}`));
      }
    };
    child.on('error', (error) => {
      failure = error;
      settle();
    });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.on('close', (code) => {
      exitCode = code;
      settle();
    });
    // Read tools ignore stdin; close it so the pipe cannot outlive the child.
    child.stdin.on('error', () => {});
    child.stdin.end();
  });
}

function powerShellCopyCommand(text: string): string {
  // The base64 argument carries the UTF-8 bytes past the console codepage;
  // piping raw text (clip.exe, naive stdin) recodes non-ASCII and corrupts it.
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${base64}')) | Set-Clipboard`;
}

function clipboardCandidates(
  text: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): ClipboardCandidate[] {
  switch (platform) {
    case 'darwin':
      return [
        {
          command: 'pbcopy',
          args: [],
          input: text,
          // pbcopy encodes according to the caller's locale; pinning the
          // CTYPE to UTF-8 keeps multi-byte characters intact.
          env: { ...env, LC_CTYPE: 'UTF-8' },
        },
      ];
    case 'win32':
      return [
        {
          command: 'powershell',
          args: ['-NoProfile', '-Command', powerShellCopyCommand(text)],
          input: '',
        },
      ];
    case 'linux': {
      const candidates: ClipboardCandidate[] = [];
      if (env.WAYLAND_DISPLAY) {
        candidates.push({ command: 'wl-copy', args: [], input: text });
      }
      candidates.push({ command: 'xclip', args: ['-selection', 'clipboard'], input: text });
      candidates.push({ command: 'xsel', args: ['--clipboard', '--input'], input: text });
      return candidates;
    }
    default:
      return [];
  }
}

function clipboardFailureMessage(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'darwin':
      return 'Could not copy to clipboard: pbcopy could not be run. pbcopy ships with macOS; verify /usr/bin/pbcopy exists.';
    case 'win32':
      return 'Could not copy to clipboard: PowerShell could not be run. Verify PowerShell is installed and on PATH.';
    case 'linux':
      return 'Could not copy to clipboard: no clipboard tool found. Install xclip, xsel, or wl-clipboard (provides wl-copy).';
    default:
      return `Could not copy to clipboard: ${platform} has no supported clipboard tool.`;
  }
}

export async function copyToClipboard(text: string, options: ClipboardOptions = {}): Promise<void> {
  const { runner = spawnClipboardTool, platform = process.platform, env = process.env } = options;
  for (const candidate of clipboardCandidates(text, platform, env)) {
    try {
      await runner(candidate.command, candidate.args, candidate.input, candidate.env);
      return;
    } catch {
      // Both spawn errors (ENOENT) and non-zero exits mean "try the next tool".
    }
  }
  throw new ClipboardError(clipboardFailureMessage(platform));
}

interface ClipboardReadCandidate {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

function clipboardReadCandidates(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): ClipboardReadCandidate[] {
  switch (platform) {
    case 'darwin':
      return [
        {
          command: 'pbpaste',
          args: [],
          // pbpaste decodes according to the caller's locale; pinning the
          // CTYPE to UTF-8 keeps multi-byte characters intact.
          env: { ...env, LC_CTYPE: 'UTF-8' },
        },
      ];
    case 'win32':
      return [
        {
          command: 'powershell',
          args: [
            '-NoProfile',
            '-Command',
            // PowerShell recodes its output through the console codepage;
            // pinning the output encoding to UTF-8 keeps multi-byte
            // characters intact (the read-side counterpart of the write
            // side's base64 transport).
            '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Clipboard -Raw',
          ],
        },
      ];
    case 'linux': {
      const candidates: ClipboardReadCandidate[] = [];
      if (env.WAYLAND_DISPLAY) {
        candidates.push({ command: 'wl-paste', args: [] });
      }
      candidates.push({ command: 'xclip', args: ['-selection', 'clipboard', '-o'] });
      candidates.push({ command: 'xsel', args: ['--clipboard', '--output'] });
      return candidates;
    }
    default:
      return [];
  }
}

function clipboardReadFailureMessage(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'darwin':
      return 'Could not read clipboard: pbpaste could not be run. pbpaste ships with macOS; verify /usr/bin/pbpaste exists.';
    case 'win32':
      return 'Could not read clipboard: PowerShell could not be run. Verify PowerShell is installed and on PATH.';
    case 'linux':
      return 'Could not read clipboard: no clipboard tool found. Install xclip, xsel, or wl-clipboard (provides wl-paste).';
    default:
      return `Could not read clipboard: ${platform} has no supported clipboard tool.`;
  }
}

export async function readFromClipboard(options: ClipboardOptions = {}): Promise<string> {
  const { readRunner = spawnClipboardReadTool, platform = process.platform, env = process.env } = options;
  for (const candidate of clipboardReadCandidates(platform, env)) {
    try {
      return await readRunner(candidate.command, candidate.args, candidate.env);
    } catch {
      // Both spawn errors (ENOENT) and non-zero exits mean "try the next tool".
    }
  }
  throw new ClipboardError(clipboardReadFailureMessage(platform));
}
