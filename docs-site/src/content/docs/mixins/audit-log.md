---
title: audit_log
description: Attaches the audit_diff trigger so a table's field-level change history is written to the audit_log table.
---

File: `schema/mixins/audit_log.yaml`

Attaches the `audit_diff` trigger to a table. Tables that include this mixin get
full field-level change history written to the
[`audit_log`](/simplicity-schema-std/tables/audit-log/) table.

## Parameters

| Parameter   | Default        | Purpose                                  |
| ----------- | -------------- | ---------------------------------------- |
| `actor_guc` | `app.actor_id` | GUC `audit_diff` reads the actor id from |

## Trigger

- **`20_audit_log_diff`** (AFTER INSERT/UPDATE/DELETE) — writes field-level
  change history. See [`audit_diff`](/simplicity-schema-std/functions/audit-diff/).

Runs AFTER `audit_stamp` (`20_` > `10_`), so `created_*` / `updated_*` are
already populated when `audit_diff` fires.

## What gets written

| Operation | Rows written to `audit_log`                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `INSERT`  | one `__row__: created` marker                                                                                                   |
| `UPDATE`  | one row per changed column (skipping stamp columns), plus a `__row__: archived` / `restored` marker on `deleted_at` transitions |
| `DELETE`  | one `__row__: hard-deleted` marker                                                                                              |

## Usage

Include alongside the [`audit`](/simplicity-schema-std/mixins/audit/) mixin, and
ship the [`audit_log`](/simplicity-schema-std/tables/audit-log/) table (this
package) as the write target:

```yaml
mixins: [audit, audit_log]
```

:::note
With no actor set, `audit_diff` writes no history row — bootstrap activity is not
audit-worthy, and `audit_log.changed_by` is `NOT NULL`. See
[Bootstrap & seeding](/simplicity-schema-std/guides/bootstrap-seeding/).
:::
