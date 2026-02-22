/**
 * SkipLinks - Links de navegação para acessibilidade
 *
 * Features:
 * - Skip to main content
 * - Skip to navigation
 * - Skip to search
 * - Skip to footer
 * - Keyboard focus visible
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface SkipLink {
  id: string;
  label: string;
  target: string;
}

const SKIP_LINKS: SkipLink[] = [
  { id: 'skip-main', label: 'Pular para o conteúdo principal', target: 'main-content' },
  { id: 'skip-nav', label: 'Pular para a navegação', target: 'main-nav' },
  { id: 'skip-search', label: 'Pular para a busca', target: 'search-input' },
  { id: 'skip-footer', label: 'Pular para o rodapé', target: 'main-footer' },
];

export const SkipLinks: React.FC = () => {
  return (
    <>
      <nav aria-label="Links de atalho" className="sr-only">
        <ul>
          {SKIP_LINKS.map((link) => (
            <li key={link.id}>
              <Link
                to={`#${link.target}`}
                className="skip-link"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .skip-link:focus {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 9999;
          padding: 1rem 1.5rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          text-decoration: none;
          border: 2px solid var(--color-primary);
          border-radius: var(--radius-md);
          font-weight: 600;
          width: auto;
          height: auto;
          clip: auto;
          white-space: normal;
        }
      `}</style>
    </>
  );
};

SkipLinks.displayName = 'SkipLinks';

// ============================================================================
// LIVE REGION COMPONENT
// ============================================================================

interface LiveRegionProps {
  children: React.ReactNode;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaAtomic?: boolean;
  ariaRelevant?: 'additions' | 'removals' | 'text' | 'all';
  role?: 'status' | 'alert' | 'log' | 'marquee' | 'timer';
  id?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  ariaLive = 'polite',
  ariaAtomic = true,
  ariaRelevant = 'additions',
  role = 'status',
  id,
}) => {
  return (
    <div
      id={id}
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
    >
      {children}
    </div>
  );
};

LiveRegion.displayName = 'LiveRegion';

// ============================================================================
// ANNOUNCEMENT COMPONENT
// ============================================================================

interface AnnouncementProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, 0 = persistent
  onClose?: () => void;
}

export const Announcement: React.FC<AnnouncementProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  return (
    <LiveRegion ariaLive="assertive" role="alert">
      <div
        className={`
          fixed top-4 left-1/2 -translate-x-1/2 z-50
          px-6 py-3 rounded-lg shadow-lg border
          flex items-center gap-3 animate-in slide-in-from-top-2
          ${typeStyles[type]}
        `}
      >
        {type === 'error' && (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm2-3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'warning' && (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'success' && (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 0V9z" clipRule="evenodd" />
          </svg>
        )}
        <span className="flex-1">{message}</span>
        {onClose && (
          <button
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Fechar anúncio"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </LiveRegion>
  );
};

// ============================================================================
// SCREEN READER ONLY
// ============================================================================

interface SrOnlyProps {
  children: React.ReactNode;
}

export const SrOnly: React.FC<SrOnlyProps> = ({ children }) => {
  return (
    <span className="sr-only" aria-hidden="false">
      {children}
    </span>
  );
};

SrOnly.displayName = 'SrOnly';

// ============================================================================
// FOCUS TRAP
// ============================================================================

interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active, onEscape }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!active || !containerRef.current) return;

    if (e.key === 'Escape') {
      onEscape?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [active, onEscape]);

  // Salvar e restaurar foco
  React.useEffect(() => {
    if (active && containerRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const firstFocusable = containerRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }

    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  React.useEffect(() => {
    if (!active) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, handleKeyDown]);

  return (
    <div ref={containerRef} role="dialog" aria-modal={active}>
      {children}
    </div>
  );
};

FocusTrap.displayName = 'FocusTrap';
