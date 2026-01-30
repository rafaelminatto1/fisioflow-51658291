# Accessibility Utilities

Comprehensive accessibility utilities for implementing WCAG 2.1 AA compliant features.

## Overview

This module provides React hooks, utility functions, and ARIA attribute helpers to make FisioFlow accessible to all users, including those using assistive technologies.

## Table of Contents

- [Installation](#installation)
- [ARIA Attributes](#aria-attributes)
- [Hooks](#hooks)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Usage Examples](#usage-examples)
- [WCAG 2.1 Compliance](#wcag-21-compliance)

## Installation

No installation required - utilities are built-in.

```typescript
import {
  generateId,
  announceToScreenReader,
  ariaAttributes,
  keys,
  useFocusTrap,
  useFocusRestoration,
  useSkipLink,
  useKeyboardListNavigation,
} from '@/lib/a11y';
```

## ARIA Attributes

### Helper Functions

The `ariaAttributes` object provides helper functions for all common ARIA patterns:

```typescript
import { ariaAttributes } from '@/lib/a11y';

// Expanded/Collapsed state
<div {...ariaAttributes.expanded(isOpen)} />

// Modal/Dialog
<div {...ariaAttributes.modal('alertdialog')}>
  <h2>Warning</h2>
</div>

// Form validation
<input
  {...ariaAttributes.invalid(hasError, 'error-message')}
  aria-describedby={hasError ? 'error-message' : undefined}
/>

// Button with icon
<button
  {...ariaAttributes.pressed(isPressed)}
  aria-label="Toggle menu"
>
  <MenuIcon />
</button>
```

### Available ARIA Helpers

| Helper | Description |
|--------|-------------|
| `expanded(isExpanded)` | Expandable sections |
| `popup(isOpen, type)` | Dropdowns, popovers |
| `selected(isSelected)` | Tabs, list items |
| `checked(isChecked)` | Checkboxes, toggle buttons |
| `pressed(isPressed)` | Toggle buttons |
| `disabled(isDisabled)` | Disabled state |
| `invalid(isInvalid, messageId)` | Form errors |
| `liveRegion(politeness)` | Live announcements |
| `current(isCurrent)` | Current page/item |
| `modal(role?)` | Modals/dialogs |
| `tab(isSelected, controlsId, panelId)` | Tabs |
| `slider(value, min, max)` | Range sliders |
| `progressBar(value, max)` | Progress bars |
| `navigation(label?)` | Nav regions |
| `main(label?)` | Main content |
| `search(label?)` | Search regions |
| `form(label)` | Forms |

## Hooks

### `useFocusTrap`

Traps keyboard focus within a modal/dialog.

```typescript
import { useFocusTrap } from '@/lib/a11y';

function Modal({ isOpen, onClose, children }) {
  const containerRef = useFocusTrap(isOpen);

  return (
    <dialog
      ref={containerRef}
      open={isOpen}
      onClose={onClose}
      {...ariaAttributes.modal()}
    >
      {children}
    </dialog>
  );
}
```

**Features:**
- Saves and restores focus automatically
- Cycles through focusable elements with Tab/Shift+Tab
- Escape key closes (optional)

### `useFocusRestoration`

Restores focus after modal closes.

```typescript
import { useFocusRestoration } from '@/lib/a11y';

function MyModal({ isOpen }) {
  useFocusRestoration(isOpen);
  // Focus is automatically saved when opening, restored when closing
}
```

### `useSkipLink`

Creates a "Skip to main content" link.

```typescript
import { useSkipLink } from '@/lib/a11y';

function Layout() {
  const { showSkipLink, handleClick } = useSkipLink('main-content');

  return (
    <>
      {showSkipLink && (
        <a
          href="#main-content"
          onClick={handleClick}
          className="sr-only focus:not-sr-only"
        >
          Pular para o conteúdo principal
        </a>
      )}
      <main id="main-content">
        {/* Main content */}
      </main>
    </>
  );
}
```

### `useKeyboardListNavigation`

Keyboard navigation for lists/menus.

```typescript
import { useKeyboardListNavigation } from '@/lib/a11y';

function Select({ options, onSelect }) {
  const { selectedIndex, handleKeyDown } = useKeyboardListNavigation(
    options,
    (option, index) => onSelect(option),
    { orientation: 'vertical', loop: true }
  );

  return (
    <ul role="listbox" onKeyDown={handleKeyDown}>
      {options.map((option, index) => (
        <li
          key={option.id}
          role="option"
          aria-selected={selectedIndex === index}
        >
          {option.label}
        </li>
      ))}
    </ul>
  );
}
```

## Keyboard Navigation

### Key Constants

```typescript
import { keys } from '@/lib/a11y';

keys.ENTER;     // 'Enter'
keys.SPACE;     // ' '
keys.ESCAPE;    // 'Escape'
keys.TAB;       // 'Tab'
keys.ARROW_UP;   // 'ArrowUp'
keys.ARROW_DOWN; // 'ArrowDown'
keys.ARROW_LEFT; // 'ArrowLeft'
keys.ARROW_RIGHT;// 'ArrowRight'
keys.HOME;      // 'Home'
keys.END;       // 'End'
```

### Type Guards

```typescript
import { isActivationKey, isArrowKey } from '@/lib/a11y';

function handleKeyDown(e: KeyboardEvent) {
  if (isActivationKey(e.key)) {
    // Enter or Space - activate item
  } else if (isArrowKey(e.key)) {
    // Arrow keys - navigate
  }
}
```

### Keyboard Handler Creator

```typescript
import { createKeyboardHandler } from '@/lib/a11y';

const handler = createKeyboardHandler({
  Enter: () => console.log('Activated'),
  Escape: () => console.log('Cancelled'),
  ArrowUp: () => console.log('Up'),
});

element.addEventListener('keydown', handler);
```

## Screen Reader Support

### `announceToScreenReader`

Announces messages to screen readers using ARIA live regions.

```typescript
import { announceToScreenReader } from '@/lib/a11y';

// Success message
announceToScreenReader('Paciente salvo com sucesso!');

// Error message
announceToScreenReader('Erro ao salvar. Tente novamente.', 'assertive');

// Status update
announceToScreenReader('Carregando dados...', 'polite');
```

**Features:**
- Creates live region element automatically
- Removes element after announcement
- Supports both `polite` and `assertive` priorities

### Live Regions in Components

```typescript
import { ariaAttributes } from '@/lib/a11y';

function StatusMessage({ message, isVisible }) {
  return (
    <div
      role="status"
      {...ariaAttributes.liveRegion('polite')}
      aria-live="polite"
      aria-atomic="true"
      className={isVisible ? '' : 'sr-only'}
    >
      {message}
    </div>
  );
}
```

## Usage Examples

### Example 1: Accessible Modal

```typescript
import { useFocusTrap, ariaAttributes } from '@/lib/a11y';

function Modal({ isOpen, onClose, title, children }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        {...ariaAttributes.modal()}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <div>
          {children}
        </div>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
```

### Example 2: Accessible Dropdown

```typescript
import { ariaAttributes, keys, isActivationKey } from '@/lib/a11y';

function Dropdown({ trigger, items }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isActivationKey(e.key)) {
      setIsOpen(!isOpen);
    } else if (e.key === keys.ESCAPE) {
      setIsOpen(false);
    }
  };

  return (
    <div>
      <button
        {...ariaAttributes.popup(isOpen, 'menu')}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label="Opções"
      >
        {trigger}
      </button>

      {isOpen && (
        <ul role="menu" onKeyDown={handleKeyDown}>
          {items.map(item => (
            <li key={item.id}>
              <button onClick={() => item.action()}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Example 3: Accessible Form

```typescript
import { ariaAttributes } from '@/lib/a11y';

function Input({ label, error, ...props }) {
  const errorId = `error-${props.name}`;
  const inputId = `input-${props.name}`;

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        {...props}
        {...ariaAttributes.required(props.required)}
        {...ariaAttributes.invalid(!!error, errorId)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" {...ariaAttributes.alert()}>
          {error}
        </span>
      )}
    </div>
  );
}
```

### Example 4: Accessible Tabs

```typescript
import { ariaAttributes } from '@/lib/a11y';

function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          {...ariaAttributes.tab(
            index === activeTab,
            `tab-${tab.id}`,
            `panel-${tab.id}`
          )}
          onClick={() => setActiveTab(index)}
        >
          {tab.label}
        </button>
      ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          {...ariaAttributes.tabPanel(`tab-${tab.id}`)}
          hidden={index !== activeTab}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Example 5: Skip Link

```typescript
import { useSkipLink } from '@/lib/a11y';

function AppLayout() {
  const { showSkipLink, handleClick } = useSkipLink('main');

  return (
    <>
      {showSkipLink && (
        <a
          href="#main"
          onClick={handleClick}
          className="fixed top-4 left-4 z-50 sr-only focus:not-sr-one
                     bg-white px-4 py-2 rounded shadow-lg"
        >
          Pular para o conteúdo principal
        </a>
      )}

      <nav aria-label="Navegação principal">
        {/* Navigation */}
      </nav>

      <main id="main">
        {/* Main content */}
      </main>
    </>
  );
}
```

## WCAG 2.1 Compliance

### Perceivable
- ✅ Text alternatives for non-text content
- ✅ Captions for video content
- ✅ Audio descriptions
- ✅ Adaptable content
- ✅ High contrast mode support

### Operable
- ✅ Keyboard accessible
- ✅ No keyboard traps
- ✅ Focus indicators
- ✅ Skip navigation link
- ✅ Sufficient time limits
- ✅ No seizure triggers

### Understandable
- ✅ Language of page
- ✅ Consistent navigation
- ✅ Error identification
- ✅ Labels and instructions

### Robust
- ✅ Compatible with assistive technologies
- ✅ Accessible by name, role, value
- ✅ ARIA attributes correct

## Best Practices

### 1. Always Add Labels

```typescript
// Good - Has label
<button aria-label="Fechar modal">
  <XIcon />
</button>

// Bad - No label
<button>
  <XIcon />
</button>
```

### 2. Use Semantic HTML

```typescript
// Good - Semantic
<nav aria-label="Navegação principal">
  <ul><li><a href="/">Home</a></li></ul>
</nav>

// Bad - Non-semantic
<div class="nav">
  <div onclick="navigate('/')">Home</div>
</div>
```

### 3. Provide Focus Management

```typescript
// Save focus before opening modal
const previousFocus = document.activeElement;

// Restore focus after closing
(previousFocus as HTMLElement)?.focus();
```

### 4. Announce Dynamic Changes

```typescript
import { announceToScreenReader } from '@/lib/a11y';

// When content changes
setData(newData);
announceToScreenReader('Dados atualizados');
```

### 5. Test with Screen Reader

- NVDA (Windows, free)
- JAWS (Windows, paid)
- VoiceOver (Mac, free)
- TalkBack (Android, free)

## See Also

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Type System Documentation](../../types/README.md)
