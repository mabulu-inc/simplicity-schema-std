---
title: audit_log_actor
description: Internal mixin — supplies the parameterized changed_by FK for the audit_log table.
---

File: `schema/mixins/audit_log_actor.yaml`

:::caution[Internal]
This mixin is used **only** by the [`audit_log`](/simplicity-schema-std/tables/audit-log/)
table. Application tables use [`audit`](/simplicity-schema-std/mixins/audit/),
not this.
:::

Supplies the `changed_by` actor FK for the `audit_log` table, parameterized to
the app's identity table.

## Parameters

| Parameter    | Default   | Purpose                            |
| ------------ | --------- | ---------------------------------- |
| `user_table` | `users`   | identity table `changed_by` FKs to |
| `user_pk`    | `user_id` | primary-key column of `user_table` |

These mirror the [`audit`](/simplicity-schema-std/mixins/audit/) mixin's
parameters, so a single `imports[].params` override repoints
`created_by` / `updated_by` **and** `audit_log.changed_by` at the same identity
table.

## Column

| Column       | Type     | Null     | Notes                                                                     |
| ------------ | -------- | -------- | ------------------------------------------------------------------------- |
| `changed_by` | `bigint` | NOT NULL | FK → `{user_table}.{user_pk}`, `ON DELETE RESTRICT` / `ON UPDATE CASCADE` |

## Why it's separate

The `audit_log` table can't carry the [`audit`](/simplicity-schema-std/mixins/audit/)
mixin itself — that would attach the stamping triggers recursively to the audit
table. So the one piece it does need from the audit family, the parameterized
actor FK, is factored into this dedicated mixin. `changed_at` is recorded inline
by the inserting trigger.
