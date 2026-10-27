import { spawn } from 'node:child_process';

export interface ClipboardToolInput {
  input?: string;
  env?: NodeJS.ProcessEnv;
}

export type ClipboardRunner = (
  command: string,
  args: string[],
  tool: ClipboardToolInput,
) => Promise<string>;

interface ClipboardOptions {
  runner?: ClipboardRunner;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardError';
  }
}

interface ClipboardCandidate extends ClipboardToolInput {
  command: string;
  args: string[];
}

type ClipboardDirection = 'copy' | 'read';

interface ClipboardPlatformTools {
  copy(text: string, env: NodeJS.ProcessEnv): ClipboardCandidate[];
  read(env: NodeJS.ProcessEnv): ClipboardCandidate[];
}

export function spawnClipboardTool(
  command: string,
  args: string[],
  tool: ClipboardToolInput = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: tool.env });
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
    // A tool exiting before draining stdin raises EPIPE on our end; the
    // child's exit status, not that write error, decides the outcome. Closing
    // stdin also keeps the pipe from outliving tools that never read it.
    child.stdin.on('error', () => {});
    child.stdin.end(tool.input);
  });
}

function powerShellCopyCommand(text: string): string {
  // The base64 argument carries the UTF-8 bytes past the console codepage;
  // piping raw text (clip.exe, naive stdin) recodes non-ASCII and corrupts it.
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${base64}')) | Set-Clipboard`;
}

const clipboardTools: Partial<Record<NodeJS.Platform, ClipboardPlatformTools>> = {
  darwin: {
    copy: (text, env) => [
      {
        command: 'pbcopy',
        args: [],
        input: text,
        // pbcopy encodes according to the caller's locale; pinning the
        // CTYPE to UTF-8 keeps multi-byte characters intact.
        env: { ...env, LC_CTYPE: 'UTF-8' },
      },
    ],
    read: (env) => [
      {
        command: 'pbpaste',
        args: [],
        // pbpaste decodes according to the caller's locale; pinning the
        // CTYPE to UTF-8 keeps multi-byte characters intact.
        env: { ...env, LC_CTYPE: 'UTF-8' },
      },
    ],
  },
  win32: {
    copy: (text) => [
      {
        command: 'powershell',
        args: ['-NoProfile', '-Command', powerShellCopyCommand(text)],
      },
    ],
    read: () => [
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
    ],
  },
  linux: {
    copy: (text, env) => {
      const candidates: ClipboardCandidate[] = [];
      if (env.WAYLAND_DISPLAY) {
        candidates.push({ command: 'wl-copy', args: [], input: text });
      }
      candidates.push({ command: 'xclip', args: ['-selection', 'clipboard'], input: text });
      candidates.push({ command: 'xsel', args: ['--clipboard', '--input'], input: text });
      return candidates;
    },
    read: (env) => {
      const candidates: ClipboardCandidate[] = [];
      if (env.WAYLAND_DISPLAY) {
        candidates.push({ command: 'wl-paste', args: [] });
      }
      candidates.push({ command: 'xclip', args: ['-selection', 'clipboard', '-o'] });
      candidates.push({ command: 'xsel', args: ['--clipboard', '--output'] });
      return candidates;
    },
  },
};

function clipboardFailureMessage(direction: ClipboardDirection, platform: NodeJS.Platform): string {
  const prefix = direction === 'copy' ? 'Could not copy to clipboard' : 'Could not read clipboard';
  switch (platform) {
    case 'darwin': {
      const tool = direction === 'copy' ? 'pbcopy' : 'pbpaste';
      return `${prefix}: ${tool} could not be run. ${tool} ships with macOS; verify /usr/bin/${tool} exists.`;
    }
    case 'win32':
      return `${prefix}: PowerShell could not be run. Verify PowerShell is installed and on PATH.`;
    case 'linux': {
      const waylandTool = direction === 'copy' ? 'wl-copy' : 'wl-paste';
      return `${prefix}: no clipboard tool found. Install xclip, xsel, or wl-clipboard (provides ${waylandTool}).`;
    }
    default:
      return `${prefix}: ${platform} has no supported clipboard tool.`;
  }
}

export async function copyToClipboard(text: string, options: ClipboardOptions = {}): Promise<void> {
  const { runner = spawnClipboardTool, platform = process.platform, env = process.env } = options;
  for (const candidate of clipboardTools[platform]?.copy(text, env) ?? []) {
    try {
      await runner(candidate.command, candidate.args, candidate);
      return;
    } catch {
      // Both spawn errors (ENOENT) and non-zero exits mean "try the next tool".
    }
  }
  throw new ClipboardError(clipboardFailureMessage('copy', platform));
}

export async function readFromClipboard(options: ClipboardOptions = {}): Promise<string> {
  const { runner = spawnClipboardTool, platform = process.platform, env = process.env } = options;
  for (const candidate of clipboardTools[platform]?.read(env) ?? []) {
    try {
      return await runner(candidate.command, candidate.args, candidate);
    } catch {
      // Both spawn errors (ENOENT) and non-zero exits mean "try the next tool".
    }
  }
  throw new ClipboardError(clipboardFailureMessage('read', platform));
}
