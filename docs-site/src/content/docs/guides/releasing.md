---
title: Releasing
description: How a new version is cut and published — same tooling as @smplcty/schema-flow.
---

Releases use the same tooling as `@smplcty/schema-flow`: `release-it` with the
keep-a-changelog plugin cuts the tag + GitHub release from `main`, and CI
publishes from there. You never publish from your machine.

## Cut a release

From a clean `main`:

```bash
pnpm release            # derives the bump from the CHANGELOG, or:
pnpm release:patch      # 0.0.1 -> 0.0.2
pnpm release:minor      # 0.0.1 -> 0.1.0
pnpm release:major      # 0.0.1 -> 1.0.0
```

`release-it` bumps the version, updates `CHANGELOG.md`, commits, tags `v<version>`,
pushes, and creates the GitHub Release. It does **not** publish to npm itself
(`.release-it.json` sets `npm.publish: false`).

## What CI does

Creating the GitHub Release fires two workflows:

- **`publish.yml`** → `npm publish --provenance --access public` via OIDC trusted
  publishing. No tokens are stored; npm verifies the GitHub identity directly.
- **`deploy-docs.yml`** → builds this Astro + Starlight site and deploys it to
  GitHub Pages.

Both workflows **refuse to run for a tag that isn't reachable from `main`** — a
guard against an accidental release cut from a feature branch.

## First-time setup (already done)

For the record, getting a brand-new package onto this pipeline took:

1. A one-time bootstrap `npm publish` to claim the package name.
2. Configuring the npm **trusted publisher** for the package (repo
   `mabulu-inc/simplicity-schema-std`, workflow `publish.yml`, environment
   `npm`).
3. Creating the `npm` and `github-pages` GitHub environments and enabling Pages.

After that, `pnpm release:*` is the only command you ever run.
