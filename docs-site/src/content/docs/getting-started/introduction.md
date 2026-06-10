---
title: Introduction
description: What @smplcty/schema-std is, what it ships, and why it's parameterized.
---

`@smplcty/schema-std` is a set of **standard, parameterized PostgreSQL schema
building blocks** — consumed by reference via
[`@smplcty/schema-flow`](https://github.com/mabulu-inc/simplicity-schema-flow)
`imports`, not copy-pasted into each app.

These are the cross-cutting patterns every app re-implements: audit columns,
soft delete, timestamps, an audit-log trail. They belong to no domain, so they
live here — and they are **parameterized**, so each consuming app supplies its
own identity table and actor GUC. The package therefore carries no dependency
on any app's data model (including `@smplcty/auth`, which consumes this like any
other app).

## What's in the box

- **Mixins**
  - [`audit`](/simplicity-schema-std/mixins/audit/) — `created_at` /
    `updated_at` / `created_by` / `updated_by` plus the trigger pair
    (`audit_skip_noop`, `audit_stamp`) that maintains them.
  - [`audit_log`](/simplicity-schema-std/mixins/audit-log/) — attaches the
    `audit_diff` trigger so a table's field-level change history is written to
    the `audit_log` table.
  - [`timestamps`](/simplicity-schema-std/mixins/timestamps/) — `created_at` /
    `updated_at` + a trigger; the actor-free subset of `audit` (no
    identity-table dependency).
  - [`soft_delete`](/simplicity-schema-std/mixins/soft-delete/) — `deleted_at`.
  - [`audit_log_actor`](/simplicity-schema-std/mixins/audit-log-actor/) —
    internal: supplies the parameterized `changed_by` FK for the `audit_log`
    table (application tables don't use it).
- **Functions** — [`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/),
  [`audit_diff`](/simplicity-schema-std/functions/audit-diff/),
  [`audit_skip_noop`](/simplicity-schema-std/functions/audit-skip-noop/),
  [`timestamps_stamp`](/simplicity-schema-std/functions/timestamps-stamp/), and
  [`audit_backfill_by(p_actor)`](/simplicity-schema-std/functions/audit-backfill-by/)
  (a bootstrap helper).
- **Table** — [`audit_log`](/simplicity-schema-std/tables/audit-log/)
  (append-only field-level history).

## Why parameterized

Audit columns FK to _your_ users table, and the audit triggers read the actor
id from _your_ session GUC. Hard-coding those names would couple the package to
one app's data model. Instead, three parameters —
[`user_table` / `user_pk` / `actor_guc`](/simplicity-schema-std/getting-started/parameters/)
— default to the convention (`users` / `user_id` / `app.actor_id`), so the
common case is param-free, and any app can override them in one place.

## Requirements

- **schema-flow ≥ 0.11.0** — needs `imports` plus parameterized mixins.
- **PostgreSQL** — the triggers are plain `plpgsql`; no extensions required.

Next: [Quick start](/simplicity-schema-std/getting-started/quick-start/).
