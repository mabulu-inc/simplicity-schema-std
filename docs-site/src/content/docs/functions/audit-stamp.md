---
title: audit_stamp
description: BEFORE INSERT/UPDATE trigger that stamps the audit columns from the actor GUC.
---

File: `schema/functions/audit_stamp.yaml` · `returns trigger` · `plpgsql` ·
`SECURITY INVOKER` · `VOLATILE`

The `BEFORE INSERT/UPDATE` trigger function for the
[`audit`](/simplicity-schema-std/mixins/audit/) mixin (`10_audit_stamp`). Stamps
`created_at` / `updated_at` / `created_by` / `updated_by` from the actor GUC.

```sql
DECLARE
  actor bigint := NULLIF(current_setting('{{actor_guc}}', true), '')::bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := CURRENT_TIMESTAMP;
    NEW.created_by := actor;
    NEW.updated_at := NEW.created_at;
    NEW.updated_by := actor;
  ELSE
    NEW.updated_at := CURRENT_TIMESTAMP;
    NEW.updated_by := actor;
  END IF;
  RETURN NEW;
END;
```

- On **INSERT**, all four columns are set; `created_at` and `updated_at` get the
  same `CURRENT_TIMESTAMP` (transaction start).
- On **UPDATE**, only `updated_at` / `updated_by` change.
- `{{actor_guc}}` is interpolated from the
  [`actor_guc`](/simplicity-schema-std/getting-started/parameters/) parameter
  (default `app.actor_id`).

## When the actor is unset

`created_by` / `updated_by` are left NULL. That is tolerated only in the
bootstrap window, where schema-flow keeps the `_by` columns nullable until the
post-seed tighten phase (a backfill fills them first). In production the columns
are `NOT NULL`, so a write with no actor set is rejected by the constraint — the
app sets `{{actor_guc}}` per request. See
[Bootstrap & seeding](/simplicity-schema-std/guides/bootstrap-seeding/).
