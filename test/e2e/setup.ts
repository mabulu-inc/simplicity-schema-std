import { afterAll } from 'vitest';
import { closePool } from '@smplcty/schema-flow';

export const DATABASE_URL = process.env.DATABASE_URL!;

afterAll(async () => {
  await closePool();
});
