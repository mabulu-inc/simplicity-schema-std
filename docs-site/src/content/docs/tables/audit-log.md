---
title: audit_log
description: Append-only field-level change history for audited entities.
---

File: `schema/tables/audit_log.yaml`

Field-level change history for audited entities. Populated by the
[`audit_log`](/simplicity-schema-std/mixins/audit-log/) mixin's trigger
([`audit_diff`](/simplicity-schema-std/functions/audit-diff/)). The `changed_by`
actor FK is supplied by the
[`audit_log_actor`](/simplicity-schema-std/mixins/audit-log-actor/) mixin so it
can be parameterized to the app's identity table.

The table does **not** carry the `audit` / `audit_log` mixins itself — that would
attach the triggers recursively. `changed_by` + `changed_at` are recorded inline
by the inserting trigger.

## Columns

| Column           | Type          | Null     | Notes                                                                      |
| ---------------- | ------------- | -------- | -------------------------------------------------------------------------- |
| `audit_log_id`   | `bigserial`   | NOT NULL | primary key                                                                |
| `entity_type`    | `varchar(50)` | NOT NULL | table name of the audited entity (e.g. `producers`)                        |
| `entity_id`      | `text`        | NOT NULL | PK of the audited row, stringified — serial-int or text PKs both supported |
| `field`          | `varchar(50)` | NOT NULL | column that changed; `__row__` marks lifecycle transitions                 |
| `previous_value` | `text`        | NULL     | old value (NULL on create)                                                 |
| `new_value`      | `text`        | NULL     | new value                                                                  |
| `changed_by`     | `bigint`      | NOT NULL | actor FK (via `audit_log_actor`)                                           |
| `changed_at`     | `timestamptz` | NOT NULL | `DEFAULT CURRENT_TIMESTAMP`                                                |

## Indexes

| Index                      | Columns                                |
| -------------------------- | -------------------------------------- |
| `audit_log_entity_idx`     | `(entity_type, entity_id, changed_at)` |
| `audit_log_changed_at_idx` | `(changed_at)`                         |

The composite index serves the common query — _the history of one entity, in
order_ — and the `changed_at` index serves time-range scans across all entities.

## The `__row__` sentinel

When `field = '__row__'`, the row records a lifecycle transition rather than a
column diff:

| `previous_value` → `new_value` | Meaning                           |
| ------------------------------ | --------------------------------- |
| `NULL` → `created`             | row inserted                      |
| `active` → `archived`          | soft-deleted (`deleted_at` set)   |
| `archived` → `restored`        | un-deleted (`deleted_at` cleared) |
| `existed` → `hard-deleted`     | row `DELETE`d                     |

## Grants & append-only

This package ships **no grants** on `audit_log` — role names are app-specific.
Append-only semantics are recommended: grant `SELECT` + `INSERT`, withhold
`UPDATE` + `DELETE` so history can't be rewritten. Add them in the consuming app
via `extend:` against this table:

```yaml
extend: audit_log
grants:
  - to: app_user
    privileges: [SELECT, INSERT]
```
