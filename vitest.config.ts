import { defineConfig } from 'vitest/config';

// The tests read the BUILT package in dist/ (what npm ships), so `yarn gates` builds first.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
