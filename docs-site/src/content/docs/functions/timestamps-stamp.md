---
title: timestamps_stamp
description: BEFORE INSERT/UPDATE trigger that stamps created_at / updated_at with no actor attribution.
---

File: `schema/functions/timestamps_stamp.yaml` · `returns trigger` · `plpgsql` ·
`SECURITY INVOKER` · `VOLATILE`

The `BEFORE INSERT/UPDATE` trigger function for the
[`timestamps`](/simplicity-schema-std/mixins/timestamps/) mixin
(`10_timestamps_stamp`). Stamps `created_at` on INSERT and `updated_at` on every
write — the actor-free counterpart to
[`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/).

**No parameters.**

```sql
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := CURRENT_TIMESTAMP;
    NEW.updated_at := NEW.created_at;
  ELSE
    NEW.updated_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
```

On INSERT both columns get the same `CURRENT_TIMESTAMP` (transaction start); on
UPDATE only `updated_at` is refreshed. Because the values are set in the trigger
rather than by column defaults, a client can't override them.
