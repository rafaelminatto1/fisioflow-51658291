/**
 * Accessibility Utilities Tests
 *
 * @description
 * Tests for accessibility helper functions and hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  generateId,
  announceToScreenReader,
  ariaAttributes,
  keys,
  isActivationKey,
  isArrowKey,
  createKeyboardHandler,
  useFocusTrap,
  useFocusRestoration,
  useSkipLink,
  useKeyboardListNavigation,
} from '@/lib/a11y';

// Setup DOM for tests
beforeEach(() => {
  document.body.innerHTML = '';
});

describe('generateId', () => {
  it('should generate unique IDs with default prefix', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^id-\d+$/);
  });

  it('should generate unique IDs with custom prefix', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^test-\d+$/);
  });

  it('should increment counter correctly', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();

    expect(id1).toBe('id-1');
    expect(id2).toBe('id-2');
    expect(id3).toBe('id-3');
  });
});

describe('announceToScreenReader', () => {
  it('should create live region element', () => {
    announceToScreenReader('Test message', 'polite');

    const liveRegion = document.getElementById('sr-announcement-polite');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('should create assertive live region for assertive priority', () => {
    announceToScreenReader('Critical message', 'assertive');

    const liveRegion = document.getElementById('sr-announcement-assertive');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('should remove live region after announcement', async () => {
    announceToScreenReader('Test message');

    // Wait for cleanup (5100ms timeout)
    await new Promise(resolve => setTimeout(resolve, 5500));

    const liveRegion = document.getElementById('sr-announcement-polite');
    expect(liveRegion).not.toBeInTheDocument();
  });
});

describe('ariaAttributes', () => {
  describe('expanded', () => {
    it('should return aria-expanded true', () => {
      expect(ariaAttributes.expanded(true)).toEqual({ 'aria-expanded': true });
    });

    it('should return aria-expanded false', () => {
      expect(ariaAttributes.expanded(false)).toEqual({ 'aria-expanded': false });
    });
  });

  describe('selected', () => {
    it('should return aria-selected true', () => {
      expect(ariaAttributes.selected(true)).toEqual({ 'aria-selected': true });
    });
  });

  describe('checked', () => {
    it('should accept boolean values', () => {
      expect(ariaAttributes.checked(true)).toEqual({ 'aria-checked': true });
      expect(ariaAttributes.checked(false)).toEqual({ 'aria-checked': false });
    });

    it('should accept mixed value', () => {
      expect(ariaAttributes.checked('mixed')).toEqual({ 'aria-checked': 'mixed' });
    });
  });

  describe('invalid', () => {
    it('should mark field as invalid with message', () => {
      const result = ariaAttributes.invalid(true, 'error-id');
      expect(result).toEqual({
        'aria-invalid': true,
        'aria-describedby': 'error-id',
      });
    });

    it('should mark field as valid without message', () => {
      const result = ariaAttributes.invalid(false);
      expect(result).toEqual({
        'aria-invalid': false,
      });
    });
  });

  describe('modal', () => {
    it('should use dialog role by default', () => {
      expect(ariaAttributes.modal()).toEqual({
        role: 'dialog',
        'aria-modal': 'true',
      });
    });

    it('should use alertdialog role when specified', () => {
      expect(ariaAttributes.modal('alertdialog')).toEqual({
        role: 'alertdialog',
        'aria-modal': 'true',
      });
    });
  });

  describe('navigation', () => {
    it('should include aria-label when provided', () => {
      const result = ariaAttributes.navigation('Main Navigation');
      expect(result).toEqual({
        role: 'navigation',
        'aria-label': 'Main Navigation',
      });
    });

    it('should not include aria-label when not provided', () => {
      const result = ariaAttributes.navigation();
      expect(result).toEqual({
        role: 'navigation',
      });
    });
  });
});

describe('keys', () => {
  it('should have all expected key constants', () => {
    expect(keys.ENTER).toBe('Enter');
    expect(keys.SPACE).toBe(' ');
    expect(keys.ESCAPE).toBe('Escape');
    expect(keys.TAB).toBe('Tab');
    expect(keys.ARROW_UP).toBe('ArrowUp');
    expect(keys.ARROW_DOWN).toBe('ArrowDown');
    expect(keys.ARROW_LEFT).toBe('ArrowLeft');
    expect(keys.ARROW_RIGHT).toBe('ArrowRight');
  });
});

describe('isActivationKey', () => {
  it('should return true for Enter key', () => {
    expect(isActivationKey('Enter')).toBe(true);
  });

  it('should return true for Space key', () => {
    expect(isActivationKey(' ')).toBe(true);
  });

  it('should return false for other keys', () => {
    expect(isActivationKey('Escape')).toBe(false);
    expect(isActivationKey('Tab')).toBe(false);
  });
});

describe('isArrowKey', () => {
  it('should return true for arrow keys', () => {
    expect(isArrowKey('ArrowUp')).toBe(true);
    expect(isArrowKey('ArrowDown')).toBe(true);
    expect(isArrowKey('ArrowLeft')).toBe(true);
    expect(isArrowKey('ArrowRight')).toBe(true);
  });

  it('should return false for non-arrow keys', () => {
    expect(isArrowKey('Enter')).toBe(false);
    expect(isArrowKey('Tab')).toBe(false);
  });
});

describe('createKeyboardHandler', () => {
  it('should call appropriate handler for key', () => {
    const enterHandler = vi.fn();
    const escapeHandler = vi.fn();

    const handler = createKeyboardHandler({
      Enter: enterHandler,
      Escape: escapeHandler,
    });

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    handler(enterEvent);
    expect(enterHandler).toHaveBeenCalledWith(enterEvent);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    handler(escapeEvent);
    expect(escapeHandler).toHaveBeenCalledWith(escapeEvent);
  });

  it('should not call handler for unmapped keys', () => {
    const handler = createKeyboardHandler({
      Enter: vi.fn(),
    });

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(() => handler(event)).not.toThrow();
  });
});

describe('useFocusTrap', () => {
  it('should return ref', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    expect(result.current).toBe(null);
  });

  it('should trap focus when active', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    // Create container with focusable elements
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    `;

    result.current = container;
    act(() => {
      document.body.appendChild(container);
    });

    // Focus should be trapped within container
    const buttons = container.querySelectorAll('button');
    expect(document.activeElement).toBe(buttons[0]);

    cleanup();
  });
});

describe('useFocusRestoration', () => {
  it('should save focus when opening', () => {
    // Create a button and focus it
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { rerender } = renderHook(() => useFocusRestoration(true));

    // Focus should be saved
    rerender();

    // After unmount, focus should be restored
    cleanup();
    expect(document.activeElement).toBe(button);
  });
});

describe('useSkipLink', () => {
  it('should show skip link when Tab is pressed', () => {
    const { result } = renderHook(() => useSkipLink());

    expect(result.current.showSkipLink).toBe(false);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(event);
    });

    expect(result.current.showSkipLink).toBe(true);
  });

  it('should hide skip link when mouse is pressed', () => {
    const { result } = renderHook(() => useSkipLink());

    act(() => {
      const event = new MouseEvent('mousedown');
      document.dispatchEvent(event);
    });

    expect(result.current.showSkipLink).toBe(false);
  });

  it('should focus target when skip link is clicked', () => {
    const target = document.createElement('div');
    target.id = 'main-content';
    document.body.appendChild(target);

    const { result } = renderHook(() => useSkipLink());

    act(() => {
      result.current.handleClick();
    });

    expect(document.activeElement).toBe(target);

    cleanup();
  });
});

describe('useKeyboardListNavigation', () => {
  it('should navigate list with arrow keys', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect, {
        orientation: 'vertical',
      })
    );

    expect(result.current.selectedIndex).toBe(0);

    // Arrow Down - increment index
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(1);

    // Arrow Up - decrement index
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should loop to start when reaching end', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect, {
        loop: true,
      })
    );

    // Go to last item
    act(() => {
      result.current.setSelectedIndex(2);
    });

    // Arrow Down should loop to first
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should not loop when disabled', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect, {
        loop: false,
      })
    );

    // Go to last item
    act(() => {
      result.current.setSelectedIndex(2);
    });

    // Arrow Down should stay at last
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it('should call onSelect on activation key', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      result.current.handleKeyDown(event);
    });

    expect(onSelect).toHaveBeenCalledWith(items[0], 0);
  });

  it('should handle Home key', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect)
    );

    // Set to middle item
    act(() => {
      result.current.setSelectedIndex(1);
    });

    // Home should go to first
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Home' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('should handle End key', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect)
    );

    // End should go to last
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'End' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it('should not navigate when inactive', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const onSelect = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardListNavigation(items, onSelect, {
        isActive: false,
      })
    );

    const initialIndex = result.current.selectedIndex;

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.selectedIndex).toBe(initialIndex);
  });
});
