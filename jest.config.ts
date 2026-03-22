import type { Config } from 'jest';
const config: Config = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', esModuleInterop: true, moduleResolution: 'node' } }] },
  moduleNameMapper: { '^mapbox-gl$': '<rootDir>/__mocks__/mapbox-gl.ts' },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};
export default config;
