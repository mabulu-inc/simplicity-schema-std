---
title: audit_backfill_by
description: Bootstrap helper that fills NULL created_by / updated_by on every audit-mixin table.
---

File: `schema/functions/audit_backfill_by.yaml` · `audit_backfill_by(p_actor bigint)`
→ `integer` · `plpgsql` · `SECURITY INVOKER` · `VOLATILE`

Fills NULL `created_by` / `updated_by` on every managed table carrying the
[`audit`](/simplicity-schema-std/mixins/audit/) mixin, attributing them to
`p_actor`. Returns the number of rows fixed.

## Why it exists

Rows seeded **during a schema-flow run** have no actor set, so their `_by`
columns land NULL. Those columns are still nullable at seed time — schema-flow
enforces `NOT NULL` only in a tighten phase that runs after seeds — but that
tighten will then fail on the NULLs unless you resolve them first. Call this from
a `post/` script (post-scripts run before tighten), passing a seeded fallback
identity:

```sql
-- schema/post/0001-backfill-audit-by.sql
SELECT audit_backfill_by((SELECT user_id FROM users WHERE name = 'system'));
```

`p_actor` is supplied by the app — the package can't know how to resolve a
fallback identity. See [Bootstrap & seeding](/simplicity-schema-std/guides/bootstrap-seeding/)
for the two seeding strategies.

## How it works

```sql
DECLARE
  t text;
  n int := 0;
  c int;
BEGIN
  -- Stamp the fallback actor first so the UPDATE's audit_stamp trigger
  -- stamps updated_by to it rather than re-NULLing it; created_by is
  -- preserved by COALESCE (the trigger only sets updated_* on UPDATE).
  PERFORM set_config('{{actor_guc}}', p_actor::text, true);

  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND column_name = 'created_by'
  LOOP
    EXECUTE format(
      'UPDATE %I
          SET created_by = COALESCE(created_by, $1),
              updated_by = COALESCE(updated_by, $1)
        WHERE created_by IS NULL OR updated_by IS NULL',
      t
    ) USING p_actor;
    GET DIAGNOSTICS c = ROW_COUNT;
    n := n + c;
  END LOOP;

  RETURN n;
END;
```

- It sets the actor GUC first, so the `UPDATE`'s own
  [`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/) trigger stamps
  `updated_by` to `p_actor` rather than re-NULLing it. `created_by` is preserved
  via `COALESCE` (the trigger only sets `updated_*` on UPDATE).
- The loop is keyed on the audit mixin's `created_by` column and scoped to
  `current_schema()`.
