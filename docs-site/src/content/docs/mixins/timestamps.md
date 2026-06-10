---
title: timestamps
description: created_at / updated_at and a trigger — the actor-free subset of audit.
---

File: `schema/mixins/timestamps.yaml`

Adds `created_at` / `updated_at` and the trigger that maintains them — the
actor-free subset of [`audit`](/simplicity-schema-std/mixins/audit/). Use on
tables that want creation/update times but carry no change-attribution (no
`created_by` / `updated_by`, so no dependency on an identity table).

**No parameters.**

## Columns

| Column       | Type          | Null     | Notes                    |
| ------------ | ------------- | -------- | ------------------------ |
| `created_at` | `timestamptz` | NOT NULL | stamped on INSERT        |
| `updated_at` | `timestamptz` | NOT NULL | refreshed on every write |

## Trigger

- **`10_timestamps_stamp`** (BEFORE INSERT/UPDATE) — stamps `created_at` on
  INSERT and `updated_at` on every write. See
  [`timestamps_stamp`](/simplicity-schema-std/functions/timestamps-stamp/).

## Why a trigger, not column defaults

Maintenance is trigger-based, not column defaults. A `BEFORE` trigger has to
fire anyway to keep `updated_at` fresh on UPDATE (a `DEFAULT` only fires on
INSERT), so `created_at` is stamped in the same trigger at no extra cost — and
can't be overridden by a client-supplied value. Both are set to the same
`CURRENT_TIMESTAMP` (transaction start) on INSERT.

## Usage

```yaml
# tables that want times but no actor attribution
mixins: [timestamps]
```

Pair with [`audit`](/simplicity-schema-std/mixins/audit/) instead when you need
actor columns.
