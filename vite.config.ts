import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
      reporter: ['text'],
      // Gate do CI (D2, sem SonarCloud): o valor medido menos uma folga pequena. Suba conforme a cobertura crescer.
      thresholds: { statements: 76, branches: 74, functions: 70, lines: 77 }
    }
  }
});
