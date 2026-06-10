---
title: Quick start
description: Import the package, add mixins to a table, and set the actor per request.
---

## 1. Import the package

In your schema-flow config, add `@smplcty/schema-std` to `imports`. The
parameter defaults make the params block optional:

```yaml
# schema-flow config
imports:
  - package: '@smplcty/schema-std'
    # params: { user_table: users, user_pk: user_id, actor_guc: app.actor_id }
```

The import pulls in the mixins, functions, and the `audit_log` table. They are
referenced from the package, not vendored into your repo — upgrade the package
and every consuming app picks up the change.

## 2. Add mixins to a table

Compose the building blocks a table needs:

```yaml
# any table
mixins: [audit, audit_log, soft_delete]
```

- [`audit`](/simplicity-schema-std/mixins/audit/) adds the four stamp columns
  and their triggers.
- [`audit_log`](/simplicity-schema-std/mixins/audit-log/) records field-level
  history to the `audit_log` table.
- [`soft_delete`](/simplicity-schema-std/mixins/soft-delete/) adds `deleted_at`.

Want creation/update times without change-attribution? Use
[`timestamps`](/simplicity-schema-std/mixins/timestamps/) instead of `audit` —
it carries no identity-table dependency.

## 3. Set the actor per request

The consuming app supplies the identity table named by `user_table` (default
`users`, with a `user_pk` primary key) and sets the `actor_guc` GUC per request:

```sql
SET LOCAL "app.actor_id" = '<user_id>';
```

With this set, `audit_stamp` fills `created_by` / `updated_by`, and `audit_diff`
writes history rows attributed to that actor.

:::caution[No actor set]
With no actor, `audit_stamp` leaves `created_by` / `updated_by` NULL and
`audit_diff` writes no history row. In production the `NOT NULL` `_by` columns
reject such a write, and the app's session layer rejects an unauthenticated
request long before it reaches the DB. The one legitimate no-actor window is
bootstrap — see [Bootstrap & seeding](/simplicity-schema-std/guides/bootstrap-seeding/).
:::

## What you get

| Operation                      | Effect                                                                  |
| ------------------------------ | ----------------------------------------------------------------------- |
| `INSERT`                       | stamps `created_*` / `updated_*`; one `__row__: created` history marker |
| `UPDATE`                       | refreshes `updated_*`; one history row per changed column               |
| no-op `UPDATE`                 | cancelled — no MVCC tuple, no `updated_at` bump, no history             |
| soft delete (`deleted_at` set) | `__row__: active → archived` history marker                             |
| restore (`deleted_at` cleared) | `__row__: archived → restored` history marker                           |
| `DELETE`                       | one `__row__: hard-deleted` history marker                              |
