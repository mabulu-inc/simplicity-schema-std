/**
 * E2E test helpers for @smplcty/schema-std.
 *
 * These mirror @smplcty/schema-flow's own e2e helpers but consume the
 * published package surface (`@smplcty/schema-flow` + its `/testing` entry)
 * rather than its internal source. The key difference: instead of writing
 * throwaway fixture YAML, `installSelf` copies this package's *real* shipped
 * `schema/` into a fake `node_modules/@smplcty/schema-std` so the tests
 * exercise the artifact consumers actually import.
 */

import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient } from '@smplcty/schema-flow';
import type { SimplicitySchemaConfig } from '@smplcty/schema-flow';
import type { TestProject } from '@smplcty/schema-flow/testing';

export { useTestProject, writeSchema } from '@smplcty/schema-flow/testing';
export type { TestProject } from '@smplcty/schema-flow/testing';

const PKG = '@smplcty/schema-std';
const SCHEMA_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'schema');

/** Recursively list files under a directory, relative to it. */
function listFiles(root: string, base = root): string[] {
  return readdirSync(root).flatMap((entry) => {
    const full = join(root, entry);
    return statSync(full).isDirectory() ? listFiles(full, base) : [relative(base, full)];
  });
}

/**
 * Install this package's real shipped `schema/` as `@smplcty/schema-std`
 * inside the test project's node_modules, so `imports:` resolution finds it.
 */
export function installSelf(projectDir: string): void {
  const pkgRoot = join(projectDir, 'node_modules', PKG);
  mkdirSync(pkgRoot, { recursive: true });
  writeFileSync(join(pkgRoot, 'package.json'), JSON.stringify({ name: PKG, version: '0.0.0' }));
  for (const rel of listFiles(SCHEMA_ROOT)) {
    const dest = join(pkgRoot, 'schema', rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(join(SCHEMA_ROOT, rel)));
  }
}

/** Clone a test project's config, importing this package with the given params. */
export function withSelfImport(ctx: TestProject, params?: Record<string, string>): SimplicitySchemaConfig {
  return { ...ctx.config, imports: [{ package: PKG, ...(params ? { params } : {}) }] };
}

/** Run a sequence of statements on one connection with search_path set to the test schema. */
export function inSchema<T>(
  ctx: TestProject,
  fn: (q: (sql: string, params?: unknown[]) => Promise<import('pg').QueryResult>) => Promise<T>,
): Promise<T> {
  return withClient(ctx.connectionString, (client) => fn((sql, params) => client.query(sql, params)), {
    pgSchema: ctx.schema,
  });
}

/** Resolve the table a FK column points at, within the test schema. */
export async function fkTarget(ctx: TestProject, table: string, column: string): Promise<string | null> {
  return inSchema(ctx, async (q) => {
    const result = await q(
      `SELECT ccu.table_name AS target
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1 AND tc.table_name = $2 AND kcu.column_name = $3`,
      [ctx.schema, table, column],
    );
    return result.rowCount ? result.rows[0].target : null;
  });
}

/** Read a function's source body from the test schema. */
export async function functionBody(ctx: TestProject, name: string): Promise<string> {
  return inSchema(ctx, async (q) => {
    const result = await q(
      `SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = $1 AND p.proname = $2`,
      [ctx.schema, name],
    );
    return result.rowCount ? result.rows[0].prosrc : '';
  });
}
