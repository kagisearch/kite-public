import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Make vi available globally
(global as any).vi = vi;

// Mock browser APIs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Replace Node's built-in localStorage: in vitest workers it initializes
// with an invalid --localstorage-file path and shadows jsdom's working
// storage with a dead object (localStorage.getItem === undefined).
// Stateful; fresh per test file via setup re-run.
const localStorageStore = new Map<string, string>();
global.localStorage = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => void localStorageStore.set(key, String(value)),
  removeItem: (key: string) => void localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
  key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
  get length() {
    return localStorageStore.size;
  },
}

// Mock OverlayScrollbars
vi.mock('overlayscrollbars', () => ({
  OverlayScrollbars: vi.fn(() => ({
    options: vi.fn(),
    destroy: vi.fn()
  }))
}));