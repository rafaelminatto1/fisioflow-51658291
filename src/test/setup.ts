import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    }
  }
}));

// Mock do React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({})
  };
});

// Mock do Sonner (toast)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    custom: vi.fn()
  }
}));

// Mock do useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn()
  })
}));

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock do fetch
global.fetch = vi.fn();

// Mock do URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
});

// Mock do FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null
}));

// Configurações globais para testes
vi.stubGlobal('console', {
  ...console,
  // Silenciar warnings específicos durante os testes
  warn: vi.fn(),
  error: vi.fn()
});

// Global error handler to suppress uncaught errors from React Error Boundaries during testing
const originalOnError = window.onerror;
const originalOnUnhandledRejection = window.onunhandledrejection;

// Suppress React Error Boundary uncaught errors in tests
window.onerror = function(message, source, lineno, colno, error) {
  // Check if this is a React Error Boundary test error
  if (error && error.message && (error.message.includes('Test error') || error.message.includes('Manual error'))) {
    return true; // Suppress the error
  }
  // For other errors, use the original handler if it exists
  return originalOnError ? originalOnError.call(this, message, source, lineno, colno, error) : false;
};

window.onunhandledrejection = function(event) {
  // Check if this is a React Error Boundary test error
  if (event.reason && event.reason.message && (event.reason.message.includes('Test error') || event.reason.message.includes('Manual error'))) {
    event.preventDefault();
    return;
  }
  // For other rejections, use the original handler if it exists
  if (originalOnUnhandledRejection) {
    originalOnUnhandledRejection.call(this, event);
  }
};

// Helper para criar mocks de arquivos
export const createMockFile = (name: string, size: number, type: string) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  return file;
};

// Helper para criar eventos de drag and drop
export const createDragEvent = (type: string, files: File[]) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file
      })),
      types: ['Files']
    }
  });
  return event;
};

// Helper para aguardar próximo tick
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper para aguardar elemento aparecer
export const waitForElement = async (getElement: () => HTMLElement | null, timeout = 1000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = getElement();
    if (element) return element;
    await waitForNextTick();
  }
  throw new Error('Element not found within timeout');
};

// Configuração de timeout padrão para testes
vi.setConfig({
  testTimeout: 10000
});