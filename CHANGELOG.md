# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **End-to-end test suite.** Applies the real shipped schema through
  schema-flow `imports` + `params` against a throwaway Postgres (docker
  compose), asserting both structure and audit/timestamp/soft-delete behavior.
