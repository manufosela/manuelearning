import { defineConfig } from 'vitest/config';

const layerThreshold = (pct) => ({ statements: pct, branches: pct, functions: pct, lines: pct });

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/env.d.ts'],
      // Per-layer thresholds (ADR "Umbrales de cobertura por capa", MEL-TSK-0103).
      thresholds: {
        'src/lib/firebase/**': layerThreshold(80),
        'src/services/**': layerThreshold(80),
        'src/lib/*.js': layerThreshold(90),
        'src/lib/tours/**': layerThreshold(90),
        'src/config/**': layerThreshold(90),
        'src/components/**': layerThreshold(70),
      },
    },
  },
});
