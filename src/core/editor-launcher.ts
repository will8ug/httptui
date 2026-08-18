import { spawn } from 'node:child_process';
import type { SuspendTerminal } from 'ink';

export type EditorLauncher = (command: string, filePath: string) => Promise<void>;

export interface RunEditorHandoffOptions {
  filePath: string;
  suspend: SuspendTerminal;
  editor?: string;
  launch?: EditorLauncher;
}

export function resolveEditorCommand(env: NodeJS.ProcessEnv = process.env, configEditor?: string): string {
  if (configEditor !== undefined && configEditor.trim() !== '') {
    return configEditor;
  }
  if (env.VISUAL) {
    return env.VISUAL;
  }
  if (env.EDITOR) {
    return env.EDITOR;
  }
  return process.platform === 'win32' ? 'notepad' : 'vi';
}

export function parseEditorCommand(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

export function launchEditor(command: string, filePath: string): Promise<void> {
  // Deliberately asynchronous: synchronous child-process calls keep the
  // platform's console input read active after the parent releases stdin,
  // racing terminal editors like vim on Windows. Do not "simplify" to
  // spawnSync.
  const [executable = '', ...args] = parseEditorCommand(command);
  const child = spawn(executable, [...args, filePath], { stdio: 'inherit' });
  return new Promise((resolve, reject) => {
    // Only a launch failure rejects; the exit code is ignored on purpose.
    // Terminal editors disagree on what non-zero means (vim's :cq exits
    // non-zero after a successful save), so the caller decides what to do
    // from the file's state, never from the exit status.
    child.on('exit', () => {
      resolve();
    });
    child.on('error', reject);
  });
}

export async function runEditorHandoff(options: RunEditorHandoffOptions): Promise<void> {
  const { filePath, suspend, editor, launch = launchEditor } = options;
  const command = resolveEditorCommand(process.env, editor);
  await suspend(async () => {
    await launch(command, filePath);
  });
}
