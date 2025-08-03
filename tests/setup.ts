// Test setup file
import { beforeEach, afterEach, vi } from 'vitest';

// Mock browser APIs if not available
if (typeof crypto === 'undefined' || !crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        generateKey: vi.fn(),
        digest: vi.fn(),
      },
    },
    writable: true,
    configurable: true,
  });
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Clean up between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});