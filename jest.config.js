const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.spec.ts', '!src/app/**/*.model.ts'],
  // HU-QA-GATE-1: umbral inicial = valor medido real (npm test -- --coverage,
  // 2026-08-24), redondeado hacia abajo — no aspiracional. Ver regla de
  // ratchet en README.md.
  coverageThreshold: {
    global: {
      statements: 83,
      branches: 68,
      functions: 74,
      lines: 84,
    },
  },
  // @fullcalendar/angular y sus dependencias (preact) publican ESM en
  // node_modules sin extensión .mjs — el preset de jest-preset-angular solo
  // transforma .mjs y @angular/common/locales por defecto, así que sin esto
  // el import de CalendarComponent rompe con "Unexpected token 'export'".
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|preact|@fullcalendar))',
  ],
};
