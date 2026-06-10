---
title: Parameters
description: The three parameters — user_table, user_pk, actor_guc — and how to override them.
---

The package is parameterized so it depends on no app's data model. Three
parameters are supplied once, at import time, via `imports[].params`:

| Parameter    | Default        | What it controls                                                     |
| ------------ | -------------- | -------------------------------------------------------------------- |
| `user_table` | `users`        | FK target for `created_by` / `updated_by` and `audit_log.changed_by` |
| `user_pk`    | `user_id`      | the primary-key column of `user_table` the FKs point at              |
| `actor_guc`  | `app.actor_id` | the GUC the audit triggers read the actor id from                    |

All three default to the convention, so the common case is **param-free**:

```yaml
imports:
  - package: '@smplcty/schema-std'
```

## Overriding

Override any subset; the rest keep their defaults. One override repoints
`created_by`, `updated_by`, **and** `audit_log.changed_by` at the same identity
table, because the [`audit`](/simplicity-schema-std/mixins/audit/) and
[`audit_log_actor`](/simplicity-schema-std/mixins/audit-log-actor/) mixins share
`user_table` / `user_pk`:

```yaml
imports:
  - package: '@smplcty/schema-std'
    params:
      user_table: accounts
      user_pk: account_id
      actor_guc: app.account_id
```

## Where each parameter lands

- **`user_table` / `user_pk`** are interpolated into the FK `references` of the
  `audit` mixin's `created_by` / `updated_by` columns and the
  `audit_log_actor` mixin's `changed_by` column:

  ```yaml
  references:
    table: '{{user_table}}'
    column: '{{user_pk}}'
    on_delete: RESTRICT
    on_update: CASCADE
  ```

- **`actor_guc`** is interpolated into the function bodies of
  [`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/),
  [`audit_diff`](/simplicity-schema-std/functions/audit-diff/), and
  [`audit_backfill_by`](/simplicity-schema-std/functions/audit-backfill-by/),
  where the actor id is read:

  ```sql
  NULLIF(current_setting('{{actor_guc}}', true), '')::bigint
  ```

## The actor type

`created_by` / `updated_by` / `changed_by` are `bigint`, and the GUC value is
cast to `bigint`. The `user_pk` column you point at must be an integer key.
