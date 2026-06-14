---
title: Bootstrap & seeding
description: How to seed audit tables at bootstrap without tripping the NOT NULL _by columns.
---

In production, every write goes through the app with the actor GUC set, so
`created_by` / `updated_by` are always populated. **Bootstrap is the one window
where no actor is set** — rows seeded during a schema-flow run would otherwise
have no actor.

Because [`audit_stamp`](/simplicity-schema-std/functions/audit-stamp/) **refuses
actor-less writes** (it raises rather than silently landing a NULL `_by`), a seed
transaction must either set an actor or opt into lenient mode. Then the `_by`
columns land NULL — and since they're still nullable at seed time (schema-flow
enforces `NOT NULL` only in a tighten phase that runs _after_ seeds) — you
resolve the NULLs before tighten. Two ways to handle it.

## Option 1 — Pre-set a sentinel actor (simplest)

Seed a fixed-id system identity in a `pre/` script, then set the actor for the
whole bootstrap via schema-flow's `bootstrapSession`:

```yaml
# schema-flow config
bootstrapSession:
  app.actor_id: '1' # the seeded system identity's id
```

Seeds stamp the sentinel — the actor is set, so nothing raises and there are no
NULLs to back-fill. Use this when you can fix the system identity's id ahead of
time.

## Option 2 — Back-fill before tighten

Run the bootstrap in **lenient mode** so actor-less seeds land NULL instead of
raising, then back-fill. Set the lenient GUC via `bootstrapSession`:

```yaml
# schema-flow config
bootstrapSession:
  app.audit_lenient: 'true'
```

Then call the shipped
[`audit_backfill_by(p_actor)`](/simplicity-schema-std/functions/audit-backfill-by/)
from a `post/` script (post-scripts run **before** tighten). It fills NULL
`created_by` / `updated_by` on every audit-mixin table in the schema, attributes
them to `p_actor`, and returns the row count:

```sql
-- schema/post/0001-backfill-audit-by.sql
SELECT audit_backfill_by((SELECT user_id FROM users WHERE name = 'system'));
```

Use this when the sentinel's id isn't known or fixed ahead of time. You supply
the fallback identity lookup; the package owns the back-fill itself.

## If you don't seed audit tables at bootstrap

If all writes go through the app with the actor set, you need neither option —
there are no NULL `_by` rows to resolve.

## What about the audit log during bootstrap?

[`audit_diff`](/simplicity-schema-std/functions/audit-diff/) writes **no**
history row when the actor is unset, so bootstrap seeding doesn't pollute the
`audit_log` table. With Option 1's sentinel actor set, seed activity _would_ be
logged against the sentinel — set `bootstrapSession` only if you want that.
