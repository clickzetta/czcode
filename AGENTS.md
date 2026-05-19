# AGENTS.md

czcode is a fork of [kilocode](https://github.com/Kilo-Org/kilocode) (which forks opencode), specialized for ClickZetta Lakehouse data teams.

Fork chain: **opencode → kilocode → czcode**

- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `main`.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.
- You may be running in a git worktree. All changes must be made in your current working directory — never modify files in the main repo checkout.

## Build and Dev

<<<<<<< HEAD
- **Dev**: `~/.bun/bin/bun dev` (runs from root)
- **Dev with params**: `~/.bun/bin/bun dev -- help`
- **Typecheck**: `~/.bun/bin/bun turbo typecheck` (uses `tsgo`, not `tsc`)
- **Test**: `~/.bun/bin/bun test` from `packages/opencode/` (NOT from root — root blocks tests)
- **Single test**: `~/.bun/bin/bun test ./test/tool/tool-define.test.ts` from `packages/opencode/`
- **czcode_change check**: `~/.bun/bin/bun run script/check-opencode-annotations.ts` from repo root. CI runs this on PRs touching `packages/opencode/` — every czcode-specific change in shared files must be annotated with `czcode_change` markers. Note: this check may fail on upstream merge PRs (expected — upstream changes don't need czcode markers). Exempt paths (no markers needed): `packages/czcode-lakehouse/`, and czcode-only files (files with `czcode` in the name that don't exist in kilocode upstream).
- **Upstream sync**: `~/.bun/bin/bun run script/upstream/list-versions.ts` to see available kilocode versions; `~/.bun/bin/bun run script/upstream/merge.ts v7.x.y` to merge.
||||||| 12f7967ca4
- **Dev**: `bun run dev` (runs from root) or `bun run --cwd packages/opencode --conditions=browser src/index.ts`
- **Dev with params**: `bun dev -- help`
- **Extension**: `bun run extension` (build + launch VS Code with the extension in dev mode). Pass `--no-build` to skip the build.
- **Typecheck**: `bun turbo typecheck` (uses `tsgo`, not `tsc`)
- **Test**: `bun test` from `packages/opencode/` (NOT from root -- root blocks tests)
- **Single test**: `bun test ./test/tool/tool-define.test.ts` from `packages/opencode/`
- **CLI build artifact size check**: after `bun run script/build.ts --single --skip-install` in `packages/opencode/`, use `du -h dist/*/*/bin/kilo` (scoped package output lives under `dist/@kilocode/`)
- **SDK regen**: After changing server endpoints in `packages/opencode/src/server/`, run `./script/generate.ts` from root to regenerate `packages/sdk/js/`
- **Knip** (unused exports): `bun run knip` from `packages/kilo-vscode/`. CI runs this — all exported types/functions must be imported somewhere. Remove or unexport unused exports before pushing.
- **Source links**: After adding or changing URLs in `packages/kilo-vscode/`, `packages/kilo-vscode/webview-ui/`, or `packages/opencode/src/`, run `bun run script/extract-source-links.ts` from the repo root and commit the updated `packages/kilo-docs/source-links.md`. CI runs this check — the build fails if the file is stale.
- **kilocode_change check**: `bun run check-kilocode-change` from `packages/kilo-vscode/`. CI runs this — `kilocode_change` is a marker for upstream merge conflicts and must not appear in `packages/kilo-vscode/` or `packages/kilo-ui/` (these are entirely Kilo Code additions). Remove the markers before pushing.
- **opencode annotation check**: `bun run script/check-opencode-annotations.ts` from repo root. CI runs this on PRs touching `packages/opencode/` — every Kilo-specific change in shared opencode files must be annotated with `kilocode_change` markers. Exempt paths (no markers needed): `packages/opencode/src/kilocode/`, `packages/opencode/test/kilocode/`, and any path containing `kilocode` in the name.
- **Backend/SDK programmatic testing**: see [TESTING.md](./TESTING.md) for spawning the local main-branch backend (`bun dev serve`) and driving it via `curl` — use this instead of `kilo serve` (prod binary) when testing backend fixes.
=======
- **Dev**: `bun run dev` (runs from root) or `bun run --cwd packages/opencode --conditions=browser src/index.ts`
- **Dev with params**: `bun dev -- help`
- **Extension**: `bun run extension` (build + launch VS Code with the extension in dev mode). Pass `--no-build` to skip the build.
- **Typecheck**: `bun turbo typecheck` (uses `tsgo`, not `tsc`)
- **Test**: `bun test` from `packages/opencode/` (NOT from root -- root blocks tests)
- **Single test**: `bun test ./test/tool/tool-define.test.ts` from `packages/opencode/`
- **CLI build artifact size check**: after `bun run script/build.ts --single --skip-install` in `packages/opencode/`, use `du -h dist/*/*/bin/kilo` (scoped package output lives under `dist/@kilocode/`)
- **SDK regen**: After changing server endpoints in `packages/opencode/src/server/`, run `./script/generate.ts` from root to regenerate `packages/sdk/js/`
- **Knip** (unused exports): `bun run knip` from `packages/kilo-vscode/`. CI runs this — all exported types/functions must be imported somewhere. Remove or unexport unused exports before pushing.
- **Source links**: After adding or changing URLs in `packages/kilo-vscode/`, `packages/kilo-vscode/webview-ui/`, or `packages/opencode/src/`, run `bun run script/extract-source-links.ts` from the repo root and commit the updated `packages/kilo-docs/source-links.md`. CI runs this check — the build fails if the file is stale.
- **kilocode_change check**: `bun run check-kilocode-change` from `packages/kilo-vscode/`. CI runs this — `kilocode_change` is a marker for upstream merge conflicts and must not appear in `packages/kilo-vscode/` or `packages/kilo-ui/` (these are entirely Kilo Code additions). Remove the markers before pushing.
- **opencode annotation check**: `bun run script/check-opencode-annotations.ts` from repo root. CI runs this on PRs touching `packages/opencode/` — every Kilo-specific change in shared opencode files must be annotated with `kilocode_change` markers. Exempt paths (no markers needed): `packages/opencode/src/kilocode/`, `packages/opencode/test/kilocode/`, and any path containing `kilocode` in the name.
- **workflow allowlist**: `bun run script/check-workflows.ts` from repo root. CI runs this as part of the annotations workflow — any `.yml` / `.yaml` file added to or removed from `.github/workflows/` must be reflected in the hardcoded list in `script/check-workflows.ts`. Prevents upstream-merged workflows from silently starting to run in our CI.
- **Backend/SDK programmatic testing**: see [TESTING.md](./TESTING.md) for spawning the local main-branch backend (`bun dev serve`) and driving it via `curl` — use this instead of `kilo serve` (prod binary) when testing backend fixes.
>>>>>>> yunqiqiliang/opencode-v7.3.0

## Quality Checks

Before saying an implementation is ready, run the smallest relevant checks that can catch lint, typecheck, and test failures for the touched package.

| Area | Checks |
|---|---|
| Root / cross-package | `~/.bun/bin/bun run lint`, `~/.bun/bin/bun run typecheck` |
| CLI | From `packages/opencode/`: `~/.bun/bin/bun run typecheck`, `~/.bun/bin/bun test` |
| CI-only guards | `~/.bun/bin/bun run script/check-opencode-annotations.ts` |

Never run root `bun test`; the root script prints `do not run tests from root` and exits with code 1.

## Products

All products are clients of the **CLI** (`packages/opencode/`), which contains the AI agent runtime, HTTP server, and session management.

| Product | Package | Description |
|---|---|---|
<<<<<<< HEAD
| czcode CLI | `packages/opencode/` | Core engine. TUI, `czcode run`, `czcode serve`. Fork of kilocode. |
| czcode Lakehouse Plugin | `packages/czcode-lakehouse/` | ClickZetta Lakehouse tools: read_query, write_query, list_objects, describe_object, explain_query, get_context, switch_context. |
| czcode TUI Plugins | `packages/opencode/src/kilocode/plugins/czcode-*.tsx` | 10 TUI plugins: connection status, schema browser, VCluster dashboard, role switch, SQL history, sample, count, profile, SingClaw, dotenv loader. |
| SingClaw Integration | `packages/opencode/src/kilocode/singclaw/` | Full-screen SingClaw chat via WebSocket RPC. |
||||||| 12f7967ca4
| Kilo CLI | `packages/opencode/` | Core engine. TUI, `kilo run`, `kilo serve`, `kilo web`. Fork of upstream OpenCode. |
| Kilo VS Code Extension | `packages/kilo-vscode/` | VS Code extension. Bundles the CLI binary, spawns `kilo serve` as a child process. Includes the **Agent Manager** — a multi-session orchestration panel with git worktree isolation. |
| OpenCode Desktop | `packages/desktop/` | Standalone Tauri native app. Bundles CLI as sidecar. Single-session UI. Unrelated to the VS Code extension. Not actively maintained — synced from upstream fork. |
| OpenCode Web | `packages/app/` | Shared SolidJS frontend used by both the desktop app and `kilo web` CLI command. Not actively maintained — synced from upstream fork. |
=======
| Kilo CLI | `packages/opencode/` | Core engine. TUI, `kilo run`, `kilo serve`. Fork of upstream OpenCode. |
| Kilo VS Code Extension | `packages/kilo-vscode/` | VS Code extension. Bundles the CLI binary, spawns `kilo serve` as a child process. Includes the **Agent Manager** — a multi-session orchestration panel with git worktree isolation. |
>>>>>>> yunqiqiliang/opencode-v7.3.0

## Data Agent Roles

czcode has 5 data-specific agent roles (switch via Tab or `/cz_role`):

| Role | Agent ID | Permissions |
|------|----------|-------------|
| 数据分析师 (default) | `lh-analyst` | SELECT only (read_query, no write_query/bash) |
| 数据工程师 | `lh-engineer` | DDL + DML + SELECT (write_query with confirmation) |
| 数据科学家 | `lh-data-scientist` | DDL + DML + SELECT + bash (with confirmation) |
| 数据运维 | `lh-dba` | VCluster ops + DDL (with confirmation) |
| 数据治理 | `lh-governance` | GRANT/REVOKE/POLICY (with confirmation) |

Agent prompts: `packages/opencode/src/agent/prompt/lh-*.txt`
Shared base: `packages/opencode/src/agent/prompt/lh-base.txt`
Agent definitions: `packages/opencode/src/kilocode/agent/index.ts`

## czcode Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/cz_role` | `/cz_r` | Switch data agent role |
| `/cz_sample` | `/cz_s` | Quick table sampling |
| `/cz_count` | `/cz_c` | Table row count |
| `/cz_profile` | `/cz_p` | Data quality profiling |
| `/cz_vcluster` | `/cz_vc` | VCluster status |
| `/cz_sql_history` | `/cz_sh` | Browse/copy past SQL |
| `/cz_singclaw` | `/singclaw` | Open SingClaw chat |
| `/cz_skill-update` | — | Update skills |
| `/cz_skill-fix` | — | Fix skill locally |

## Package Instructions

- When a task primarily touches `packages/kilo-jetbrains/`, read `packages/kilo-jetbrains/AGENTS.md` before planning or editing.
- For JetBrains Kotlin/Swing UI work, also apply `packages/kilo-jetbrains/.kilo/skills/jetbrains-ui-style/SKILL.md`.

## Monorepo Structure

Turborepo + Bun workspaces. The packages you'll work with most:

| Package | Name | Purpose |
|---|---|---|
<<<<<<< HEAD
| `packages/opencode/` | `@kilocode/cli` | Core CLI — agents, tools, sessions, server, TUI. Most work happens here. |
| `packages/czcode-lakehouse/` | `@czcode/lakehouse` | Lakehouse plugin — czcode-specific, no annotation markers needed. |
| `packages/sdk/js/` | `@kilocode/sdk` | Auto-generated TypeScript SDK. Do not edit `src/gen/` by hand. |
| `packages/plugin/` | `@kilocode/plugin` | Plugin/tool interface definitions. |
| `packages/util/` | `@opencode-ai/util` | Shared utilities. |
||||||| 12f7967ca4
| `packages/opencode/` | `@kilocode/cli` | Core CLI -- agents, tools, sessions, server, TUI. This is where most work happens. |
| `packages/sdk/js/` | `@kilocode/sdk` | Auto-generated TypeScript SDK (client for the server API). Do not edit `src/gen/` by hand. |
| `packages/kilo-vscode/` | `kilo-code` | VS Code extension with sidebar chat + Agent Manager. See its own `AGENTS.md` for details. |
| `packages/kilo-gateway/` | `@kilocode/kilo-gateway` | Kilo auth, provider routing, API integration |
| `packages/kilo-telemetry/` | `@kilocode/kilo-telemetry` | PostHog analytics + OpenTelemetry |
| `packages/kilo-i18n/` | `@kilocode/kilo-i18n` | Internationalization / translations |
| `packages/kilo-ui/` | `@kilocode/kilo-ui` | SolidJS component library shared by the extension webview and `packages/app/` |
| `packages/app/` | `@opencode-ai/app` | Shared SolidJS web UI for desktop app and `kilo web` |
| `packages/desktop/` | `@opencode-ai/desktop` | Tauri desktop app shell |
| `packages/util/` | `@opencode-ai/util` | Shared utilities (error, path, retry, slug, etc.) |
| `packages/plugin/` | `@kilocode/plugin` | Plugin/tool interface definitions |
=======
| `packages/opencode/` | `@kilocode/cli` | Core CLI -- agents, tools, sessions, server, TUI. This is where most work happens. |
| `packages/sdk/js/` | `@kilocode/sdk` | Auto-generated TypeScript SDK (client for the server API). Do not edit `src/gen/` by hand. |
| `packages/kilo-vscode/` | `kilo-code` | VS Code extension with sidebar chat + Agent Manager. See its own `AGENTS.md` for details. |
| `packages/kilo-gateway/` | `@kilocode/kilo-gateway` | Kilo auth, provider routing, API integration |
| `packages/kilo-telemetry/` | `@kilocode/kilo-telemetry` | PostHog analytics + OpenTelemetry |
| `packages/kilo-i18n/` | `@kilocode/kilo-i18n` | Internationalization / translations |
| `packages/kilo-ui/` | `@kilocode/kilo-ui` | SolidJS component library shared by the extension webview and docs screenshot stories |
| `packages/util/` | `@opencode-ai/util` | Shared utilities (error, path, retry, slug, etc.) |
| `packages/plugin/` | `@kilocode/plugin` | Plugin/tool interface definitions |
>>>>>>> yunqiqiliang/opencode-v7.3.0

## Style Guide

- Keep things in one function unless composable or reusable
- Avoid unnecessary destructuring. Instead of `const { a, b } = obj`, use `obj.a` and `obj.b` to preserve context
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity

### Avoid let statements

Prefer `const`. Good: `const foo = condition ? 1 : 2`. Bad: `let foo; if (condition) foo = 1; else foo = 2`.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.

### Avoid else statements

Prefer early returns. Good: `if (condition) return 1; return 2`. Bad: `if (condition) return 1; else return 2`.

### No empty catch blocks

Never leave a `catch` block empty. Log it or rethrow.

## Testing

You MUST avoid using `mocks` as much as possible.
Tests MUST test actual implementation, do not duplicate logic into a test.

<<<<<<< HEAD
||||||| 12f7967ca4
## Markdown Tables

Do not pad markdown table cells for column alignment. Use the compact form with single-space-padded content cells and a minimal separator row:

```
| Command | What it runs |
|---|---|
| `kilo serve` | The prod CLI on `$PATH`. |
```

Do **not** right-pad cells to line up columns:

```
| Command                       | What it runs             |
| ----------------------------- | ------------------------ |
| `kilo serve`                  | The prod CLI on `$PATH`. |
```

Padding makes every content change rewrite the entire table, which blows up diffs on untouched rows. Markdown files are excluded from prettier (see `.prettierignore`) so running the formatter won't re-pad them, and `script/check-md-table-padding.ts` enforces the rule in CI. Run `bun run script/check-md-table-padding.ts --fix` to auto-rewrite padded tables.

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) with scopes matching packages: `vscode`, `cli`, `agent-manager`, `sdk`, `ui`, `i18n`, `kilo-docs`, `gateway`, `telemetry`, `desktop`. Omit scope when spanning multiple packages.

## Changesets

User-facing changes (features, fixes, breaking changes) require a changeset file for release notes. Run `bunx changeset add` or manually create `.changeset/<slug>.md`. Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. See `.changeset/README.md` for details.

Changeset descriptions appear directly in release notes and are read by end users. Keep them concise and feature-oriented — describe **what changed from the user's perspective**, not implementation details. Write in imperative mood (e.g. "Support exporting conversations as markdown" not "Add a new export handler that serializes session messages to .md files").

## Pull Requests

PR descriptions should be 2-3 lines covering **what** changed and **why**. Focus on intent and context a reviewer can't get from the diff — skip file-by-file inventories, test result summaries, and anything obvious from the code itself.

## GitHub Issues

- When creating a GitHub issue for the VS Code extension or JetBrains plugin, use the repo's existing issue templates in `.github/ISSUE_TEMPLATE/`. Pick the matching template (`Bug report`, `Feature Request`, or `Question`) instead of opening a blank issue.
- Do not add platform-specific title prefixes such as `[JetBrains]`, `[Jetbrains]`, `[JB]`, `[VS Code]`, `[VSCode]`, or similar. Use a plain, descriptive title.
- Always add VS Code extension issues to the GitHub project `VS Code Extension`: https://github.com/orgs/Kilo-Org/projects/25
- Always add JetBrains plugin issues to the GitHub project `Jetbrains Plugin`: https://github.com/orgs/Kilo-Org/projects/39
- When using `gh`, prefer `gh issue create --template "..." --project "..."` with the matching project title.
- If project assignment fails because `gh` is missing the required scope, run `gh auth refresh -s project` and retry.

=======
## Markdown Tables

Do not pad markdown table cells for column alignment. Use the compact form with single-space-padded content cells and a minimal separator row:

```
| Command | What it runs |
|---|---|
| `kilo serve` | The prod CLI on `$PATH`. |
```

Do **not** right-pad cells to line up columns:

```
| Command                       | What it runs             |
| ----------------------------- | ------------------------ |
| `kilo serve`                  | The prod CLI on `$PATH`. |
```

Padding makes every content change rewrite the entire table, which blows up diffs on untouched rows. Markdown files are excluded from prettier (see `.prettierignore`) so running the formatter won't re-pad them, and `script/check-md-table-padding.ts` enforces the rule in CI. Run `bun run script/check-md-table-padding.ts --fix` to auto-rewrite padded tables.

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) with scopes matching packages: `vscode`, `cli`, `agent-manager`, `sdk`, `ui`, `i18n`, `kilo-docs`, `gateway`, `telemetry`, `desktop`. Omit scope when spanning multiple packages.

## Changesets

User-facing changes (features, fixes, breaking changes) require a changeset file for release notes. Run `bunx changeset add` or manually create `.changeset/<slug>.md`. Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. See `.changeset/README.md` for details.

Changeset descriptions appear directly in release notes and are read by end users. Keep them concise and feature-oriented — describe **what changed from the user's perspective**, not implementation details. Write in imperative mood (e.g. "Support exporting conversations as markdown" not "Add a new export handler that serializes session messages to .md files").

## Pull Requests

PR descriptions should be 2-3 lines covering **what** changed and **why**. Focus on intent and context a reviewer can't get from the diff — skip file-by-file inventories, test result summaries, and anything obvious from the code itself.

## GitHub Issues

When creating or managing GitHub issues for the VS Code extension or JetBrains plugin via `gh`, load `.kilo/skills/gh-issues/SKILL.md`. It covers templates, project boards (`VS Code Extension`, `Jetbrains Plugin`), title conventions, and the `gh auth refresh -s project` recovery path.

>>>>>>> yunqiqiliang/opencode-v7.3.0
## Fork Merge Process

czcode is a fork of [kilocode](https://github.com/Kilo-Org/kilocode).

**Very important**: when planning or coding, update shared files with kilocode as last resort. Everything in `packages/opencode/` is shared code from kilocode, except folders that contain `kilocode` in the name. Always look for ways to implement features in `packages/czcode-lakehouse/` or `packages/opencode/src/kilocode/` to minimize changes to shared code.

### Minimizing Merge Conflicts

We regularly merge upstream changes from kilocode. To minimize merge conflicts:

1. **Prefer `kilocode` and `czcode` directories** — place czcode-specific code in:
   - `packages/opencode/src/kilocode/` — kilocode-specific source (inherited)
   - `packages/czcode-lakehouse/` — czcode Lakehouse plugin

2. **Minimize changes to shared files** — keep changes small and isolated.

3. **Use `czcode_change` markers** — when modifying shared code, mark changes with `czcode_change` comments.

4. **Avoid restructuring upstream code** — don't refactor opencode/kilocode code unless absolutely necessary.

### czcode_change Markers

czcode uses **two layers** of change markers corresponding to the fork chain:

<<<<<<< HEAD
| Marker | Purpose | Used when |
|---|---|---|
| `kilocode_change` | Marks kilocode changes relative to opencode | Merging opencode → kilocode (upstream of us) |
| `czcode_change` | Marks czcode changes relative to kilocode | Merging kilocode → czcode (our direct upstream) |
||||||| 12f7967ca4
### Kilocode Change Markers
=======
### Git conflict style

`bun install` sets `merge.conflictStyle=zdiff3` repo-locally via `script/setup-git.ts` (wired into `postinstall`). Conflicts include the common ancestor between `|||||||` and `=======`, which is what `script/upstream/` and `mergiraf` rely on for structural resolution and what makes manual resolution on shared opencode files tractable. If you've overridden it in your user config, the repo-local setting takes precedence — don't override it back.

### Kilocode Change Markers
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
**Rule: any code czcode modifies or adds that kilocode might also change needs a `czcode_change` marker.** This includes files inside `packages/opencode/src/kilocode/` — that directory is shared with kilocode upstream and will be overwritten during merges.

Mark czcode-specific changes with `czcode_change` comments.
||||||| 12f7967ca4
To minimize merge conflicts when syncing with upstream, mark Kilo Code-specific changes in shared code with `kilocode_change` comments.
=======
When editing shared upstream files, mark Kilo-specific lines with `kilocode_change` comments so future merges can find them. The basic forms are:
>>>>>>> yunqiqiliang/opencode-v7.3.0

- Single line: `const value = 42 // kilocode_change`
- Multi-line block: wrap with `// kilocode_change start` / `// kilocode_change end`
- New file in a shared path: `// kilocode_change - new file` at the top
- JSX/TSX: use `{/* kilocode_change */}` (and `{/* kilocode_change start */}` / `end`)

<<<<<<< HEAD
```typescript
const value = 42 // czcode_change
```
||||||| 12f7967ca4
```typescript
const value = 42 // kilocode_change
```
=======
Markers are NOT needed in paths that contain `kilocode` in the name (e.g. `packages/opencode/src/kilocode/`, `packages/opencode/test/kilocode/`) — these are entirely Kilo Code additions and won't conflict with upstream.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
**Multi-line:**

```typescript
// czcode_change start
const foo = 1
const bar = 2
// czcode_change end
```

**New files:**

```typescript
// czcode_change - new file
```

**JSX/TSX:**

```tsx
{/* czcode_change start */}
<MyComponent />
{/* czcode_change end */}
```

#### When markers are NOT needed

Files in these paths are **entirely czcode additions** that do not exist in kilocode upstream, so they will never conflict during merges:

- `packages/czcode-lakehouse/` — czcode Lakehouse plugin (czcode-only package)
- `packages/opencode/src/kilocode/plugins/czcode-*.tsx` — czcode TUI plugins (czcode-only files)
- `packages/opencode/src/kilocode/singclaw/` — SingClaw integration (czcode-only directory)
- `packages/opencode/src/agent/prompt/lh-*.txt` — Lakehouse agent prompts (czcode-only files)
- Any file with `czcode` in its filename

#### When markers ARE needed (even in kilocode directories)

- `packages/opencode/src/kilocode/agent/index.ts` — shared with kilocode, czcode adds lh-* agents
- `packages/opencode/src/kilocode/config/config.ts` — shared with kilocode, czcode adds .czcode paths
- Any other file in `packages/opencode/src/kilocode/` that **already exists in kilocode upstream**
- `script/upstream/` files that czcode modifies (e.g. `transform-package-json.ts`)

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) with scopes matching packages: `cli`, `lakehouse`, `sdk`, `upstream`, `tui`, `agents`, `config`, `singclaw`. Omit scope when spanning multiple packages.

## Release Process

```bash
git push origin main
gh workflow run "Release" --ref main -f bump=patch  # or minor/major
```

Use the **"Release"** workflow, NOT "publish" (that's kilocode's upstream workflow).

## Post-Merge Smoke Test Checklist

After merging upstream kilocode changes, test these before releasing:

- [ ] `bun dev` starts without errors
- [ ] `bun test:local` builds and runs the compiled binary
- [ ] Default agent is `lh-analyst`, default model is `qwen3.5-plus`
- [ ] Basic conversation works (ask a question, get SQL response)
- [ ] `/cz_role` opens role picker, Tab cycles agents
- [ ] `/cz_sample` prompts for table name
- [ ] Copy to clipboard toast auto-dismisses (2 seconds)
- [ ] Sidebar shows Lakehouse connection info
- [ ] `czcode_change` annotation check passes
||||||| 12f7967ca4
**Multi-line:**

```typescript
// kilocode_change start
const foo = 1
const bar = 2
// kilocode_change end
```

**New files:**

```typescript
// kilocode_change - new file
```

<!-- prettier-ignore -->
**JSX/TSX (inside JSX templates):**

<!-- prettier-ignore -->
```tsx
{/* kilocode_change */}
```

<!-- prettier-ignore -->
```tsx
{/* kilocode_change start */}
<MyComponent />
{/* kilocode_change end */}
```

#### When markers are NOT needed

Code in these paths is Kilo Code-specific and does NOT need `kilocode_change` markers:

- `packages/opencode/src/kilocode/` - All files in this directory
- `packages/opencode/test/kilocode/` - All test files for kilocode
- Any other path containing `kilocode` in filename or directory name

These paths are entirely Kilo Code additions and won't conflict with upstream.
=======
For decision rules on when to keep changes inline vs. extract Kilo logic, marker placement guidance, and verification commands, load `.kilo/skills/kilocode-merge-minimizer/SKILL.md`.
>>>>>>> yunqiqiliang/opencode-v7.3.0
