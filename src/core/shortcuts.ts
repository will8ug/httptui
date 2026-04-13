export interface Shortcut {
  key: string;
  label: string;
  description: string;
  showInBar: boolean;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { key: 'Enter', label: 'Send', description: 'Send selected request', showInBar: true },
  { key: 'j/k', label: 'Nav', description: 'Next request or scroll down', showInBar: true },
  { key: '←/→', label: 'Scroll', description: 'Scroll focused panel left or right', showInBar: true },
  { key: 'Tab', label: 'Panel', description: 'Switch focused panel', showInBar: true },
  { key: 'v', label: 'Verbose', description: 'Toggle verbose headers', showInBar: true },
  { key: 'q', label: 'Quit', description: 'Quit application', showInBar: true },
  { key: '?', label: 'Help', description: 'Toggle this help overlay', showInBar: true },
  { key: '↑ / k', label: '', description: 'Previous request or scroll up', showInBar: false },
  { key: '↓ / j', label: '', description: 'Next request or scroll down', showInBar: false },
  { key: '← / h', label: '', description: 'Scroll focused panel left', showInBar: false },
  { key: '→ / l', label: '', description: 'Scroll focused panel right', showInBar: false },
  { key: 'o', label: '', description: 'Open a different file', showInBar: false },
  { key: 'R', label: '', description: 'Reload file from disk', showInBar: false },
  { key: 'Escape', label: '', description: 'Close current overlay', showInBar: false },
] as const;