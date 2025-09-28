import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide minimal runtime shim for Svelte 5 runes used in .svelte.ts during tests
{
  const g = globalThis as Record<string, unknown>;
  if (typeof g.$state !== 'function') {
    g.$state = ((v: unknown) => v) as unknown;
  }
}

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
if (typeof window !== 'undefined') {
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
}

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
globalThis.localStorage = localStorageMock as unknown as Storage;

// Mock OverlayScrollbars and overlayscrollbars-svelte interop
vi.mock('overlayscrollbars', () => ({
  OverlayScrollbars: {
    valid: vi.fn(() => true),
  }
}));
vi.mock('overlayscrollbars-svelte', () => ({
  useOverlayScrollbars: vi.fn(() => [vi.fn()])
}));