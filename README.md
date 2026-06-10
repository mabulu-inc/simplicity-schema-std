# @smplcty/schema-std

Standard, **parameterized** PostgreSQL schema building blocks — consumed by
reference via [`@smplcty/schema-flow`](https://github.com/mabulu-inc/simplicity-schema-flow)
`imports`, not copy-pasted.

These are the cross-cutting patterns every app re-implements: audit columns,
soft delete, timestamps, an audit-log trail. They belong to no domain, so they
live here and are parameterized — each consuming app supplies its own identity
table and actor GUC, so the package carries no dependency on any app's data
model (including `@smplcty/auth`, which consumes this like any other app).

> **Status: implemented, unpublished (`0.0.0`).** Requires schema-flow ≥ 0.11.0
> (`imports` + parameterized mixins). Not yet on npm.

## Contents

- **Mixins**
  - `audit` — `created_at` / `updated_at` / `created_by` / `updated_by` + the
    trigger pair (`audit_skip_noop`, `audit_stamp`) that maintains them.
  - `audit_log` — attaches the `audit_diff` trigger so a table's field-level
    change history is written to the `audit_log` table.
  - `timestamps` — `created_at` / `updated_at` + a trigger, the actor-free
    subset of `audit` (no identity-table dependency).
  - `soft_delete` — `deleted_at`.
  - `audit_log_actor` — internal: supplies the parameterized `changed_by` FK
    for the `audit_log` table (application tables don't use it).
- **Functions** — `audit_stamp`, `audit_diff`, `audit_skip_noop`,
  `timestamps_stamp`.
- **Table** — `audit_log` (append-only field-level history).
- **Parameters** — `user_table` / `user_pk` (the FK target for
  `created_by` / `updated_by` and `audit_log.changed_by`) and `actor_guc`
  (the GUC the audit triggers stamp from), defaulting to
  `users` / `user_id` / `app.actor_id`.

## Usage

```yaml
# schema-flow config — defaults make params optional
imports:
  - package: '@smplcty/schema-std'
    # params: { user_table: users, user_pk: user_id, actor_guc: app.actor_id }
```

```yaml
# any table
mixins: [audit, audit_log, soft_delete]
```

The consuming app supplies the identity table named by `user_table` (default
`users`, with a `user_pk` primary key) and sets the `actor_guc` GUC per request
— e.g. `SET LOCAL "app.actor_id" = '<user_id>'`. With no actor set, `audit_stamp`
leaves `created_by` / `updated_by` NULL and `audit_diff` writes no history row;
in production the `NOT NULL` `_by` columns reject such a write. During bootstrap
those columns are still nullable (schema-flow tightens `NOT NULL` only after
seeds), so seeded rows land with NULL `_by` and a backfill post-script fills
them before the tighten phase.

## Tests

```
pnpm test          # spins up postgres via docker compose, applies the real
                   # shipped schema through schema-flow imports + params
```

Tests provision an isolated Postgres schema per case (via
`@smplcty/schema-flow/testing`), install this package's `schema/` as an imported
dependency, and assert both structure (FK targets, interpolated function bodies)
and behavior (stamping, diff history, no-op skip, soft-delete markers).

## Releasing

Same tooling as `@smplcty/schema-flow`: `release-it` with the keep-a-changelog
plugin cuts the tag + GitHub release from `main`; the `publish.yml` workflow
publishes to npm with provenance and refuses any tag not reachable from `main`.

```
pnpm release        # derives the bump from CHANGELOG, or:
pnpm release:patch | release:minor | release:major
```

## License

MIT © Mabulu Inc.
