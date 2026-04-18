export interface Shortcut {
  key: string;
  label: string;
  description: string;
  showInBar: boolean;
  showInHelp: boolean;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { key: 'Enter', label: 'Send', description: 'Send selected request', showInBar: true, showInHelp: true },
  { key: 'h/j/k/l', label: 'Nav', description: 'Navigate requests and scroll panels', showInBar: true, showInHelp: false },
  { key: 'Tab', label: 'Panel', description: 'Switch focused panel', showInBar: true, showInHelp: true },
  { key: 'v', label: 'Verbose', description: 'Toggle verbose headers', showInBar: true, showInHelp: true },
  { key: 'r', label: 'Raw', description: 'Toggle raw response mode (no JSON formatting)', showInBar: false, showInHelp: true },
  { key: 'w', label: 'Wrap', description: 'Toggle text wrapping in response panel', showInBar: false, showInHelp: true },
  { key: 'd', label: 'Details', description: 'Toggle request details panel', showInBar: false, showInHelp: true },
  { key: 'o', label: '', description: 'Open a different file', showInBar: false, showInHelp: true },
  { key: 'R', label: '', description: 'Reload file from disk', showInBar: false, showInHelp: true },
  { key: 'Escape', label: '', description: 'Close current overlay', showInBar: false, showInHelp: true },
  { key: 'q', label: 'Quit', description: 'Quit application', showInBar: true, showInHelp: true },
  { key: '?', label: 'Help', description: 'Toggle this help overlay', showInBar: true, showInHelp: true },
  { key: '↑ / k', label: '', description: 'Previous request or scroll up', showInBar: false, showInHelp: true },
  { key: '↓ / j', label: '', description: 'Next request or scroll down', showInBar: false, showInHelp: true },
  { key: '← / h', label: '', description: 'Scroll focused panel left', showInBar: false, showInHelp: true },
  { key: '→ / l', label: '', description: 'Scroll focused panel right', showInBar: false, showInHelp: true },
  { key: 'g', label: '', description: 'Jump to top of focused panel', showInBar: false, showInHelp: true },
  { key: 'G', label: '', description: 'Jump to bottom of focused panel', showInBar: false, showInHelp: true },
  { key: '0', label: '', description: 'Jump to horizontal start of focused panel', showInBar: false, showInHelp: true },
  { key: '$', label: '', description: 'Jump to horizontal end of focused panel', showInBar: false, showInHelp: true },
] as const;