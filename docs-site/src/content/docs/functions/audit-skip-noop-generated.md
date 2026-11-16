---
title: audit_skip_noop_generated
description: BEFORE UPDATE trigger that cancels no-op updates on a table with a stored generated column.
---

File: `schema/functions/audit_skip_noop_generated.yaml` · `returns trigger` · `plpgsql` ·
`SECURITY INVOKER` · `VOLATILE`

PostgreSQL computes stored generated columns after `BEFORE` triggers, so `NEW`
holds `NULL` in them and [`audit_skip_noop`](/simplicity-schema-std/functions/audit-skip-noop/)
never sees an unchanged row on such a table as unchanged. This function copies
`OLD`'s generated values into `NEW` and compares the records, so every other
column is compared by its own type's equality. If the copy cannot reproduce a
value exactly, the update goes through rather than being skipped.

**No parameters.** The `audit` mixin does not attach it; declare it on each
table that has a stored generated column, between `00_` and `10_`:

```yaml
triggers:
  - name: 01_audit_skip_noop_generated
    timing: BEFORE
    events: [UPDATE]
    function: audit_skip_noop_generated
    for_each: ROW
```

It runs only for rows `00_audit_skip_noop` let through, and looks up the
table's generated columns in `pg_attribute` each time, so attach it only where
it is needed.
