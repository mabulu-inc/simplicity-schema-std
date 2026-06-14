---
title: audit
description: created_at / updated_at / created_by / updated_by plus the trigger pair that maintains them.
---

File: `schema/mixins/audit.yaml`

Adds the four stamp columns and the trigger pair that maintains them. Tables
that carry change-attribution include this mixin and do not redeclare the
columns.

## Parameters

| Parameter     | Default             | Purpose                                                                          |
| ------------- | ------------------- | -------------------------------------------------------------------------------- |
| `user_table`  | `users`             | identity table the actor columns FK to                                           |
| `user_pk`     | `user_id`           | primary-key column of `user_table`                                               |
| `actor_guc`   | `app.actor_id`      | GUC `audit_stamp` reads the actor id from                                        |
| `lenient_guc` | `app.audit_lenient` | GUC that, when `'true'`, lets `audit_stamp` tolerate a missing actor (bootstrap) |

All default to the convention, so the common case is param-free. See
[Parameters](/simplicity-schema-std/getting-started/parameters/).

## Columns

| Column       | Type          | Null     | Notes                                                                     |
| ------------ | ------------- | -------- | ------------------------------------------------------------------------- |
| `created_at` | `timestamptz` | NOT NULL | stamped on INSERT                                                         |
| `updated_at` | `timestamptz` | NOT NULL | refreshed on every write                                                  |
| `created_by` | `bigint`      | NOT NULL | FK → `{user_table}.{user_pk}`, `ON DELETE RESTRICT` / `ON UPDATE CASCADE` |
| `updated_by` | `bigint`      | NOT NULL | FK → `{user_table}.{user_pk}`, `ON DELETE RESTRICT` / `ON UPDATE CASCADE` |

## Triggers

Triggers fire in name order, so the numeric prefixes set the sequence:

1. **`00_audit_skip_noop`** (BEFORE UPDATE) — cancels no-op UPDATEs
   (`NEW IS NOT DISTINCT FROM OLD`) so they don't generate an MVCC tuple or bump
   `updated_at`. See [`audit_skip_noop`](/simplicity-schema-std/functions/audit-skip-noop/).
2. **`10_audit_stamp`** (BEFORE INSERT/UPDATE) — stamps
   `created_at` / `updated_at` / `created_by` / `updated_by` from the actor GUC
   (set per request by the app, or per-tx during bootstrap). **Raises** a clear
   error if no actor is set, unless `lenient_guc` is `'true'`. See
   [`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/).

When paired with [`audit_log`](/simplicity-schema-std/mixins/audit-log/), that
mixin's `20_audit_log_diff` runs after `10_`, so `created_*` / `updated_*` are
already populated when `audit_diff` fires.

## Usage

```yaml
# tables that need change-attribution
mixins: [audit]
```

Pair with [`audit_log`](/simplicity-schema-std/mixins/audit-log/) on tables
whose change history should be queryable, and with
[`soft_delete`](/simplicity-schema-std/mixins/soft-delete/) on tables that need
archive semantics rather than `DELETE`.

:::tip[No actor columns needed?]
Use [`timestamps`](/simplicity-schema-std/mixins/timestamps/) instead — the
actor-free subset, with no identity-table dependency.
:::
