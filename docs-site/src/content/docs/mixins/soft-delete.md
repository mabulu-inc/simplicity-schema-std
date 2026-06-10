---
title: soft_delete
description: A nullable deleted_at timestamp for archive semantics.
---

File: `schema/mixins/soft_delete.yaml`

Adds a `deleted_at` nullable timestamp for soft-delete.

**No parameters** — `deleted_at` references nothing app-specific.

## Column

| Column       | Type          | Null | Notes                              |
| ------------ | ------------- | ---- | ---------------------------------- |
| `deleted_at` | `timestamptz` | NULL | NULL = active, non-NULL = archived |

## Semantics

App-layer reads add `WHERE deleted_at IS NULL` to exclude archived rows by
default; an explicit opt-in (e.g. `?include_archived=true`) bypasses the filter.

- **RLS is unchanged** — soft-delete is a visibility concern, not an
  authorization one.
- **Unique indexes** that must permit reuse of a value after archive should be
  partial: `where: "deleted_at IS NULL"`.

## Interaction with the audit log

When a table also carries [`audit_log`](/simplicity-schema-std/mixins/audit-log/),
transitions on `deleted_at` produce lifecycle markers in the `audit_log` table
(in addition to the per-column diff row for `deleted_at` itself being skipped —
it's one of the stamp columns `audit_diff` ignores):

| Transition              | `audit_log` `__row__` marker |
| ----------------------- | ---------------------------- |
| `deleted_at` NULL → set | `active → archived`          |
| `deleted_at` set → NULL | `archived → restored`        |

## Usage

```yaml
mixins: [audit, audit_log, soft_delete]
```
