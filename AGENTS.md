# AGENTS.md

czcode is a fork of [kilocode](https://github.com/Kilo-Org/kilocode) (which forks opencode), specialized for ClickZetta Lakehouse data teams.

Fork chain: **opencode → kilocode → czcode**

- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `main`.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.
- You may be running in a git worktree. All changes must be made in your current working directory — never modify files in the main repo checkout.

## Build and Dev

- **Dev**: `~/.bun/bin/bun dev` (runs from root)
- **Dev with params**: `~/.bun/bin/bun dev -- help`
- **Typecheck**: `~/.bun/bin/bun turbo typecheck` (uses `tsgo`, not `tsc`)
- **Test**: `~/.bun/bin/bun test` from `packages/opencode/` (NOT from root — root blocks tests)
- **Single test**: `~/.bun/bin/bun test ./test/tool/tool-define.test.ts` from `packages/opencode/`
- **czcode_change check**: `~/.bun/bin/bun run script/check-opencode-annotations.ts` from repo root. CI runs this on PRs touching `packages/opencode/` — every czcode-specific change in shared opencode files must be annotated with `czcode_change` markers. Exempt paths (no markers needed): `packages/opencode/src/kilocode/`, `packages/czcode-lakehouse/`, `script/upstream/`, and any path containing `kilocode` or `czcode` in the name.
- **Upstream sync**: `~/.bun/bin/bun run script/upstream/list-versions.ts` to see available kilocode versions; `~/.bun/bin/bun run script/upstream/merge.ts v7.x.y` to merge.

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
| czcode CLI | `packages/opencode/` | Core engine. TUI, `czcode run`, `czcode serve`. Fork of kilocode. |
| czcode Lakehouse Plugin | `packages/czcode-lakehouse/` | ClickZetta Lakehouse tools: read_query, write_query, list_objects, describe_object, explain_query, get_context, switch_context. |
| czcode TUI Plugins | `packages/opencode/src/kilocode/plugins/czcode-*.tsx` | 10 TUI plugins: connection status, schema browser, VCluster dashboard, role switch, SQL history, sample, count, profile, SingClaw, dotenv loader. |
| SingClaw Integration | `packages/opencode/src/kilocode/singclaw/` | Full-screen SingClaw chat via WebSocket RPC. |

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

## Monorepo Structure

Turborepo + Bun workspaces. The packages you'll work with most:

| Package | Name | Purpose |
|---|---|---|
| `packages/opencode/` | `@kilocode/cli` | Core CLI — agents, tools, sessions, server, TUI. Most work happens here. |
| `packages/czcode-lakehouse/` | `@czcode/lakehouse` | Lakehouse plugin — czcode-specific, no annotation markers needed. |
| `packages/sdk/js/` | `@kilocode/sdk` | Auto-generated TypeScript SDK. Do not edit `src/gen/` by hand. |
| `packages/plugin/` | `@kilocode/plugin` | Plugin/tool interface definitions. |
| `packages/util/` | `@opencode-ai/util` | Shared utilities. |

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

Mark czcode-specific changes in shared code with `czcode_change` comments.

**Single line:**

```typescript
const value = 42 // czcode_change
```

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

- `packages/opencode/src/kilocode/` — kilocode-specific source
- `packages/czcode-lakehouse/` — czcode Lakehouse plugin
- `script/upstream/` — upstream sync tooling
- Any path containing `kilocode` or `czcode` in filename or directory name

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
