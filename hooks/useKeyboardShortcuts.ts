import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onOpenProjectSwitcher?: () => void;
  onOpenSearch?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Sidebar Toggle: Ctrl+B
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      }

      // Project Switcher: Ctrl+P
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.onOpenProjectSwitcher?.();
      }

      // Search: Ctrl+K (also handled in GlobalSearch but here for consistency or manual trigger)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        // GlobalSearch component already handles this, but we could trigger it from here if needed
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
