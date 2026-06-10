---
title: audit_skip_noop
description: BEFORE UPDATE trigger that cancels no-op updates before they touch the row.
---

File: `schema/functions/audit_skip_noop.yaml` · `returns trigger` · `plpgsql` ·
`SECURITY INVOKER` · `VOLATILE`

The `BEFORE UPDATE` trigger function for the
[`audit`](/simplicity-schema-std/mixins/audit/) mixin (`00_audit_skip_noop`,
runs first). Cancels no-op UPDATEs so they don't generate an MVCC tuple, bump
`updated_at`, or produce spurious `audit_log` rows.

**No parameters.**

```sql
BEGIN
  IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
```

Returning `NULL` from a `BEFORE ROW` trigger skips the operation for that row
entirely. Because it carries the `00_` prefix it fires before
[`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/) (`10_`), so an
unchanged row never even reaches the stamping logic.

:::note[Why it matters]
Without this, an `UPDATE` that sets every column to its current value would still
write a new row version, refresh `updated_at`, and — on a table with
[`audit_log`](/simplicity-schema-std/mixins/audit-log/) — could churn the history
table. Cancelling the no-op keeps writes and history honest.
:::
