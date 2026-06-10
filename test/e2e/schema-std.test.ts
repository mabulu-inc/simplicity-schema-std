import { describe, it, expect, afterEach } from 'vitest';
import { runPipeline, createLogger } from '@smplcty/schema-flow';
import {
  useTestProject,
  writeSchema,
  installSelf,
  withSelfImport,
  fkTarget,
  functionBody,
  inSchema,
  type TestProject,
} from './helpers.js';
import { DATABASE_URL } from './setup.js';

const logger = createLogger({ verbose: false, quiet: true, json: false });

/** Apply the consumer schema + the imported @smplcty/schema-std package. */
async function apply(ctx: TestProject, params?: Record<string, string>): Promise<void> {
  installSelf(ctx.dir);
  await runPipeline(withSelfImport(ctx, params), logger);
}

const usersTable = `
table: users
columns:
  - name: user_id
    type: bigint
    primary_key: true
`;

/** An application table exercising every shipped mixin. */
const docsTable = `
table: docs
mixins: [audit, audit_log, soft_delete]
columns:
  - name: id
    type: bigint
    primary_key: true
  - name: title
    type: text
    nullable: false
`;

describe('E2E: @smplcty/schema-std', () => {
  let ctx: TestProject;

  afterEach(async () => {
    if (ctx) await ctx.cleanup();
  });

  it('(1) ships mixins/functions/table and defaults to the convention (param-free)', async () => {
    ctx = await useTestProject(DATABASE_URL);
    writeSchema(ctx.dir, { 'tables/users.yaml': usersTable, 'tables/docs.yaml': docsTable });

    await apply(ctx);

    // audit columns + soft_delete column landed on the consumer table
    expect(await fkTarget(ctx, 'docs', 'created_by')).toBe('users');
    expect(await fkTarget(ctx, 'docs', 'updated_by')).toBe('users');

    // the audit_log table shipped, with its actor FK defaulting to users
    expect(await fkTarget(ctx, 'audit_log', 'changed_by')).toBe('users');

    // the audit functions exist
    for (const fn of ['audit_stamp', 'audit_diff', 'audit_skip_noop', 'timestamps_stamp']) {
      expect(await functionBody(ctx, fn)).not.toBe('');
    }

    // default actor GUC interpolated into the function bodies
    expect(await functionBody(ctx, 'audit_stamp')).toContain('app.actor_id');
    expect(await functionBody(ctx, 'audit_stamp')).not.toContain('{{');
  });

  it('(2) imports[].params repoint the identity table and actor GUC', async () => {
    ctx = await useTestProject(DATABASE_URL);
    writeSchema(ctx.dir, {
      'tables/accounts.yaml': `
table: accounts
columns:
  - name: account_id
    type: bigint
    primary_key: true
`,
      'tables/docs.yaml': docsTable,
    });

    await apply(ctx, { user_table: 'accounts', user_pk: 'account_id', actor_guc: 'app.who_did_it' });

    expect(await fkTarget(ctx, 'docs', 'created_by')).toBe('accounts');
    expect(await fkTarget(ctx, 'audit_log', 'changed_by')).toBe('accounts');

    const stamp = await functionBody(ctx, 'audit_stamp');
    expect(stamp).toContain('app.who_did_it');
    expect(stamp).not.toContain('app.actor_id');
    expect(stamp).not.toContain('{{');
    expect(await functionBody(ctx, 'audit_diff')).toContain('app.who_did_it');
  });

  it('(3) timestamps mixin maintains created_at/updated_at via trigger (no actor)', async () => {
    ctx = await useTestProject(DATABASE_URL);
    writeSchema(ctx.dir, {
      // users is required by the package's audit_log table FK, even though
      // `notes` itself uses only the actor-free timestamps mixin.
      'tables/users.yaml': usersTable,
      'tables/notes.yaml': `
table: notes
mixins: [timestamps]
columns:
  - name: id
    type: bigint
    primary_key: true
  - name: body
    type: text
`,
    });

    await apply(ctx);

    await inSchema(ctx, async (q) => {
      await q(`INSERT INTO notes (id, body) VALUES (1, 'a')`);
      const inserted = await q(`SELECT created_at, updated_at FROM notes WHERE id = 1`);
      const { created_at, updated_at } = inserted.rows[0];
      expect(created_at).not.toBeNull();
      expect(created_at.getTime()).toBe(updated_at.getTime());

      await q(`UPDATE notes SET body = 'b' WHERE id = 1`);
      const updated = await q(`SELECT created_at, updated_at FROM notes WHERE id = 1`);
      expect(updated.rows[0].created_at.getTime()).toBe(created_at.getTime()); // unchanged
      expect(updated.rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(updated_at.getTime());
    });
  });

  it('(4) audit + audit_log + soft_delete: stamping, diff history, no-op skip', async () => {
    ctx = await useTestProject(DATABASE_URL);
    writeSchema(ctx.dir, { 'tables/users.yaml': usersTable, 'tables/docs.yaml': docsTable });

    await apply(ctx);

    await inSchema(ctx, async (q) => {
      await q(`INSERT INTO users (user_id) VALUES (1), (2)`);
      await q(`SELECT set_config('app.actor_id', '1', false)`);

      // INSERT stamps actor + creation marker in audit_log
      await q(`INSERT INTO docs (id, title) VALUES (1, 'first')`);
      const row = await q(`SELECT created_by, updated_by, created_at, deleted_at FROM docs WHERE id = 1`);
      expect(row.rows[0].created_by).toBe('1');
      expect(row.rows[0].updated_by).toBe('1');
      expect(row.rows[0].deleted_at).toBeNull();

      let log = await q(
        `SELECT field, new_value, changed_by FROM audit_log WHERE entity_id = '1' ORDER BY audit_log_id`,
      );
      expect(log.rows).toEqual([{ field: '__row__', new_value: 'created', changed_by: '1' }]);

      // UPDATE by a different actor: one diff row for the changed column, updated_by repointed
      await q(`SELECT set_config('app.actor_id', '2', false)`);
      await q(`UPDATE docs SET title = 'second' WHERE id = 1`);
      expect((await q(`SELECT updated_by FROM docs WHERE id = 1`)).rows[0].updated_by).toBe('2');
      log = await q(`SELECT field, previous_value, new_value FROM audit_log WHERE entity_id = '1' AND field = 'title'`);
      expect(log.rows).toEqual([{ field: 'title', previous_value: 'first', new_value: 'second' }]);

      // no-op UPDATE is cancelled: updated_at frozen, no new audit row
      const before = (await q(`SELECT updated_at FROM docs WHERE id = 1`)).rows[0].updated_at;
      await q(`UPDATE docs SET title = 'second' WHERE id = 1`);
      const after = (await q(`SELECT updated_at FROM docs WHERE id = 1`)).rows[0].updated_at;
      expect(after.getTime()).toBe(before.getTime());

      // soft delete writes an 'archived' lifecycle marker
      await q(`UPDATE docs SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1`);
      const archived = await q(
        `SELECT new_value FROM audit_log WHERE entity_id = '1' AND field = '__row__' AND new_value = 'archived'`,
      );
      expect(archived.rowCount).toBe(1);
    });
  });

  it('(5) audit_backfill_by fills NULL _by left by actor-less bootstrap seeds', async () => {
    ctx = await useTestProject(DATABASE_URL);
    writeSchema(ctx.dir, { 'tables/users.yaml': usersTable, 'tables/docs.yaml': docsTable });

    await apply(ctx);

    await inSchema(ctx, async (q) => {
      // Clear any actor leaked onto this pooled connection by an earlier test.
      await q(`RESET app.actor_id`);

      // Reproduce the pre-tighten bootstrap window: *_by columns still
      // nullable, and a row seeded with no actor set (audit_stamp writes NULL).
      await q(`ALTER TABLE docs ALTER COLUMN created_by DROP NOT NULL`);
      await q(`ALTER TABLE docs ALTER COLUMN updated_by DROP NOT NULL`);
      await q(`INSERT INTO users (user_id) VALUES (1)`);
      await q(`INSERT INTO docs (id, title) VALUES (1, 'seeded')`);

      const before = await q(`SELECT created_by, updated_by FROM docs WHERE id = 1`);
      expect(before.rows[0].created_by).toBeNull();
      expect(before.rows[0].updated_by).toBeNull();

      // Backfill to the fallback actor; returns the number of rows fixed.
      const fixed = await q(`SELECT audit_backfill_by(1) AS n`);
      expect(fixed.rows[0].n).toBe(1);

      const after = await q(`SELECT created_by, updated_by FROM docs WHERE id = 1`);
      expect(after.rows[0].created_by).toBe('1');
      expect(after.rows[0].updated_by).toBe('1');

      // tighten can now re-enforce NOT NULL without VALIDATE failing
      await expect(q(`ALTER TABLE docs ALTER COLUMN created_by SET NOT NULL`)).resolves.toBeDefined();
    });
  });
});
