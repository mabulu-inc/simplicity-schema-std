# @smplcty/schema-std

Standard, **parameterized** PostgreSQL schema building blocks — consumed by
reference via [`@smplcty/schema-flow`](https://github.com/mabulu-inc/simplicity-schema-flow)
`imports`, not copy-pasted.

These are the cross-cutting patterns every app re-implements: audit columns,
soft delete, timestamps, an audit-log trail. They belong to no domain, so they
live here and are parameterized — each consuming app supplies its own identity
table and actor GUC, so the package carries no dependency on any app's data
model (including `@smplcty/auth`, which consumes this like any other app).

> **Status: scaffolding.** The mixin/function content is implemented in
> [#1](https://github.com/mabulu-inc/simplicity-schema-std/issues/1), which
> depends on schema-flow's parameterized-mixins feature
> ([simplicity-schema-flow#56](https://github.com/mabulu-inc/simplicity-schema-flow/issues/56))
> and `imports`
> ([simplicity-schema-flow#55](https://github.com/mabulu-inc/simplicity-schema-flow/issues/55)).
> Nothing is published yet (`0.0.0`).

## Planned contents

- **Mixins** — `audit` (`created_at`/`updated_at`/`created_by`/`updated_by`),
  `soft_delete` (`deleted_at`), `timestamps`, `audit_log`.
- **Functions** — `audit_stamp`, `audit_diff`, `audit_skip_noop`.
- **Table** — `audit_log`.
- **Parameters** — `user_table` / `user_pk` (the FK target for
  `created_by`/`updated_by` and the audit-log actor columns) and `actor_guc`
  (the GUC the audit trigger stamps from), defaulting to
  `users` / `user_id` / `app.actor_id`.

## Usage (target)

```yaml
# schema-flow config
imports:
  - package: '@smplcty/schema-std'
    params: { user_table: users, user_pk: user_id, actor_guc: app.actor_id }
```

```yaml
# any table
mixins: [audit, soft_delete]
```

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
