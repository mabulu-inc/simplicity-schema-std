# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The documentation site now shows the released version as a badge in its
  header, linking to the matching GitHub release. The version is derived from
  the package version at build time, so it always reflects the current release.

## [0.0.1] - 2026-06-10

### Added

- **Standard schema building blocks.** Parameterized mixins — `audit`
  (created/updated timestamps + actor attribution), `audit_log` (field-level
  change history), `timestamps` (actor-free created/updated), and `soft_delete`
  — plus the `audit_stamp` / `audit_diff` / `audit_skip_noop` /
  `timestamps_stamp` trigger functions and the append-only `audit_log` table.
  Each app supplies its own identity table and actor GUC via schema-flow
  `imports` params (`user_table` / `user_pk` / `actor_guc`, defaulting to
  `users` / `user_id` / `app.actor_id`), so the package depends on no app's
  data model.
- **Bootstrap back-fill helper.** `audit_backfill_by(p_actor)` fills NULL
  `created_by` / `updated_by` left by actor-less seeds (so the post-seed
  `NOT NULL` tighten passes), attributing them to a fallback identity the app
  supplies. Call it from a `post/` script — or avoid it entirely by pre-setting
  a sentinel actor for the bootstrap.
- **End-to-end test suite.** Applies the real shipped schema through
  schema-flow `imports` + `params` against a throwaway Postgres (docker
  compose), asserting both structure and audit/timestamp/soft-delete behavior.

[Unreleased]: https://github.com/mabulu-inc/simplicity-schema-std/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/mabulu-inc/simplicity-schema-std/releases/tag/v0.0.1
