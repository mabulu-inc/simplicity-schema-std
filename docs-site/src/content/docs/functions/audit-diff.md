---
title: audit_diff
description: AFTER INSERT/UPDATE/DELETE trigger that writes field-level change history to the audit_log table.
---

File: `schema/functions/audit_diff.yaml` · `returns trigger` · `plpgsql` ·
`SECURITY INVOKER` · `VOLATILE`

The `AFTER INSERT/UPDATE/DELETE` trigger function for the
[`audit_log`](/simplicity-schema-std/mixins/audit-log/) mixin
(`20_audit_log_diff`). Writes field-level change history to the
[`audit_log`](/simplicity-schema-std/tables/audit-log/) table, reading the actor
id from the [`actor_guc`](/simplicity-schema-std/getting-started/parameters/)
parameter.

## Behavior

- **No actor set** → the trigger returns early and writes nothing. Bootstrap
  activity is not audit-worthy, and `audit_log.changed_by` is `NOT NULL`, so
  there is no actor to record.
- **PK discovery** — the primary-key column is found from `pg_index` and cast to
  `text`, so both serial-int and text PKs are supported.
- **INSERT** → one `__row__` row, `new_value = 'created'`.
- **DELETE** → one `__row__` row, `previous_value = 'existed'`,
  `new_value = 'hard-deleted'`.
- **UPDATE** → the OLD and NEW rows are compared as `jsonb`; one history row is
  written per column whose value is `IS DISTINCT FROM` its old value.

## Skipped columns

These stamp columns are never diffed (they'd be noise on every update):

```
created_at, created_by, updated_at, updated_by, deleted_at
```

`deleted_at` is skipped as a per-column diff, but its **transitions** still
produce lifecycle markers:

| Transition              | `__row__` row         |
| ----------------------- | --------------------- |
| `deleted_at` NULL → set | `active → archived`   |
| `deleted_at` set → NULL | `archived → restored` |

## The `__row__` sentinel

Lifecycle transitions (created / archived / restored / hard-deleted) have no
specific column diff, so they are recorded against the sentinel `field` value
`'__row__'`. Per-column changes use the real column name as `field`.
