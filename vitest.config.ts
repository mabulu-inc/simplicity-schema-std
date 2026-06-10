import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config();

export default defineConfig({
  test: {
    globalSetup: './vitest.global-setup.ts',
    globals: true,
    testTimeout: 30_000,
    // Tests share one Postgres instance; useTestProject isolates each test in
    // its own pg schema, but the shared connection pool keeps them serial.
    fileParallelism: false,
  },
});
