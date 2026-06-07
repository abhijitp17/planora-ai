'use client';

import { useEffect } from 'react';
import type { ModuleId } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts — Phase 6 Accessibility
// ─────────────────────────────────────────────────────────────────────────────
// Gmail-style shortcuts: G then D = Demand, G then I = Inventory, etc.
// ESC = close modals, / = focus search, ? = show help

interface ShortcutHandlers {
  onModuleSwitch: (moduleId: ModuleId) => void;
  onCopilotToggle: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}

const MODULE_SHORTCUTS: Record<string, ModuleId> = {
  'd': 'demand',
  'i': 'inventory',
  's': 'diagnostics',
  'o': 'sop',
  'f': 'finance',
  'a': 'analytics',
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape — close modals, clear focus
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // / — focus search (skip if already in input)
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // C — toggle copilot (skip if in input)
      if (e.key === 'c' && !isInput && e.ctrlKey) {
        e.preventDefault();
        handlers.onCopilotToggle();
        return;
      }

      // G + X shortcuts (Gmail style)
      if (!isInput) {
        const now = Date.now();
        if (e.key === 'g' && now - lastKeyTime < 1000) {
          // Second G within 1s = do nothing, wait for next key
          lastKey = 'g';
          lastKeyTime = now;
          return;
        }
        if (lastKey === 'g' && now - lastKeyTime < 1500) {
          const moduleKey = e.key.toLowerCase();
          if (MODULE_SHORTCUTS[moduleKey]) {
            e.preventDefault();
            handlers.onModuleSwitch(MODULE_SHORTCUTS[moduleKey]);
            lastKey = '';
            return;
          }
        }
        if (e.key === 'g') {
          lastKey = 'g';
          lastKeyTime = now;
        } else {
          lastKey = e.key;
          lastKeyTime = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus trap for modals — Phase 6
// ─────────────────────────────────────────────────────────────────────────────
export function useFocusTrap(ref: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTab);
    return () => element.removeEventListener('keydown', handleTab);
  }, [isActive, ref]);
}
