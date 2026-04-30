# Releasing czcode

czcode uses a semi-automated release process. Releases are tagged from `main` and published to GitHub Releases.

## How to Trigger a Release

1. Go to the [`publish` workflow](https://github.com/yunqiqiliang/czcode/actions/workflows/publish.yml) in GitHub Actions.
2. Click **"Run workflow"**.
3. Select the branch (typically `main`).
4. Fill in the inputs:
   - **`bump`** (choice): `patch`, `minor`, or `major`.
   - **`version`** (string, optional): Override the version explicitly.

## What Happens During a Release

The `publish.yml` workflow:

### 1. Version

- Runs `script/version.ts` to compute the next version.
- Generates release notes from commit history since the last release.
- Creates a **draft** GitHub Release with the computed tag (e.g. `v7.x.y`).

### 2. Build CLI

- Runs `packages/opencode/script/build.ts` to compile the czcode CLI binary.
- Builds native binaries for supported platforms:
  - Linux: x64, arm64
  - macOS: x64, arm64
  - Windows: x64
- Creates platform archives and uploads them to the draft GitHub Release.

### 3. Publish

- Updates `version` in all `package.json` files.
- Commits the version bump, tags the commit, and pushes to the repo.
- Promotes the draft GitHub Release to published.

## Upstream Sync Before Release

Before releasing, check if there are new kilocode versions to merge:

```bash
~/.bun/bin/bun run script/upstream/list-versions.ts
```

If there are unmerged versions, consider merging them first:

```bash
~/.bun/bin/bun run script/upstream/merge.ts v7.x.y
```

## Prerequisites

- Write access to `yunqiqiliang/czcode`.
- Required secrets configured in the repository (see `.github/workflows/publish.yml`).
