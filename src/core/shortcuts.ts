export type ShortcutGroup = 'navigation' | 'request' | 'display' | 'search' | 'general';

export const SHORTCUT_GROUP_ORDER: readonly ShortcutGroup[] = [
  'navigation',
  'request',
  'display',
  'search',
  'general',
];

export const SHORTCUT_GROUP_LABELS: Record<ShortcutGroup, string> = {
  navigation: 'Navigation',
  request: 'Request',
  display: 'Display',
  search: 'Search',
  general: 'General',
};

export interface Shortcut {
  key: string;
  label: string;
  description: string;
  showInBar: boolean;
  showInHelp: boolean;
  group: ShortcutGroup;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { key: 'Enter', label: 'Send', description: 'Send selected request', showInBar: true, showInHelp: true, group: 'request' },
  // Bar-only composite entry — not shown in help overlay
  { key: 'h/j/k/l', label: 'Nav', description: 'Navigate requests and scroll panels', showInBar: true, showInHelp: false, group: 'navigation' },
  { key: 'Tab', label: 'Panel', description: 'Switch focused panel', showInBar: true, showInHelp: true, group: 'navigation' },
  { key: 'v', label: 'Verbose', description: 'Toggle verbose headers', showInBar: true, showInHelp: true, group: 'display' },
  { key: 'q', label: 'Quit', description: 'Quit application', showInBar: true, showInHelp: true, group: 'general' },
  { key: '?', label: 'Help', description: 'Toggle this help overlay', showInBar: true, showInHelp: true, group: 'general' },
  { key: '↑ / k', label: '', description: 'Previous request or scroll up', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: '↓ / j', label: '', description: 'Next request or scroll down', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: '← / h', label: '', description: 'Scroll focused panel left', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: '→ / l', label: '', description: 'Scroll focused panel right', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: 'g', label: '', description: 'Jump to top of focused panel', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: 'G', label: '', description: 'Jump to bottom of focused panel', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: '0', label: '', description: 'Jump to horizontal start of focused panel', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: '$', label: '', description: 'Jump to horizontal end of focused panel', showInBar: false, showInHelp: true, group: 'navigation' },
  { key: 'r', label: 'Raw', description: 'Toggle raw response mode (no JSON formatting)', showInBar: false, showInHelp: true, group: 'display' },
  { key: 'w', label: 'Wrap', description: 'Toggle text wrapping in response panel', showInBar: false, showInHelp: true, group: 'display' },
  { key: 'd', label: 'Details', description: 'Toggle request details panel', showInBar: false, showInHelp: true, group: 'display' },
  { key: 'R', label: '', description: 'Reload file from disk', showInBar: false, showInHelp: true, group: 'request' },
  { key: '/', label: '', description: 'Search response body', showInBar: false, showInHelp: true, group: 'search' },
  { key: 'n', label: '', description: 'Go to next search match', showInBar: false, showInHelp: true, group: 'search' },
  { key: 'N', label: '', description: 'Go to previous search match', showInBar: false, showInHelp: true, group: 'search' },
  { key: 'o', label: '', description: 'Open a different file', showInBar: false, showInHelp: true, group: 'request' },
  { key: 'Escape', label: '', description: 'Close current overlay', showInBar: false, showInHelp: true, group: 'general' },
] as const;