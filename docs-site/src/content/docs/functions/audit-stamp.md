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
  IF actor IS NULL
     AND current_setting('{{lenient_guc}}', true) IS DISTINCT FROM 'true'
  THEN
    RAISE EXCEPTION 'audit_stamp: {{actor_guc}} is not set; refusing to write to %.%',
      TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING HINT = '… set {{lenient_guc}} = ''true'' only for bootstrap seeding.';
  END IF;
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
- `{{actor_guc}}` / `{{lenient_guc}}` are interpolated from the
  [`actor_guc` / `lenient_guc`](/simplicity-schema-std/getting-started/parameters/)
  parameters (defaults `app.actor_id` / `app.audit_lenient`).

## When the actor is unset

The trigger **raises a clear error** naming the GUC and refuses the write:

```
audit_stamp: app.actor_id is not set; refusing to write to public.docs
HINT: … set app.audit_lenient = 'true' only for bootstrap seeding.
```

A write to an audited table with no actor is a wiring bug — a code path that
forgot to open a session or service context — so it fails loudly at the source
rather than landing a NULL `_by` that surfaces later as a bare `NOT NULL`
violation.

The **one legitimate actor-less case is bootstrap seeding.** Set the
`lenient_guc` GUC (default `app.audit_lenient`) to `'true'` for those
transactions and the trigger leaves `_by` NULL instead of raising; the columns
are nullable until schema-flow's post-seed tighten phase, and
[`audit_backfill_by`](/simplicity-schema-std/functions/audit-backfill-by/) fills
them first. See
[Bootstrap & seeding](/simplicity-schema-std/guides/bootstrap-seeding/).
