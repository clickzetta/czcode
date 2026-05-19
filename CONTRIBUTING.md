# Contributing to czcode

## TL;DR

There are lots of ways to contribute to the project:

- **Code Contributions:** Implement new features or fix bugs
- **Documentation:** Improve existing docs or create new guides
- **Bug Reports:** Report issues you encounter
- **Feature Requests:** Suggest new features or improvements

## Developing czcode

- **Requirements:** Bun 1.3.13+
- Install dependencies and start the dev server from the repo root:

  ```bash
  ~/.bun/bin/bun install
  ~/.bun/bin/bun dev
  ```

### Running against a different directory

By default, `bun dev` runs czcode in the `packages/opencode` directory. To run it against a different directory:

```bash
~/.bun/bin/bun dev <directory>
```

To run czcode in the root of the repo itself:

```bash
~/.bun/bin/bun dev .
```

### Building a "local" binary

To compile a standalone executable:

```bash
./packages/opencode/script/build.ts --single
```

### Understanding bun dev vs czcode

During development, `bun dev` is the local equivalent of the built `czcode` command:

```bash
# Development (from project root)
~/.bun/bin/bun dev --help
~/.bun/bin/bun dev serve

# Production
czcode --help
czcode serve
```

### Testing with a local backend

```bash
CZCODE_API_URL=http://localhost:3000 ~/.bun/bin/bun dev
```

<<<<<<< HEAD
||||||| 12f7967ca4
This redirects all gateway traffic (auth, model listing, provider routing, profile, etc.) to your local server. The default is `https://api.kilo.ai`.

There are also optional overrides for other services:

| Variable | Default | Purpose |
|---|---|---|
| `KILO_API_URL` | `https://api.kilo.ai` | Kilo API (gateway, auth, models, profile) |
| `KILO_SESSION_INGEST_URL` | `https://ingest.kilosessions.ai` | Session export / cloud sync |
| `KILO_MODELS_URL` | `https://models.dev` | Model metadata |

> **VS Code:** The repo includes a "VSCode - Run Extension (Local Backend)" launch config in `.vscode/launch.json` that sets `KILO_API_URL=http://localhost:3000` automatically.

## Issue Template Requirements

If you open an issue through the GitHub web UI, GitHub will guide you through the correct template automatically.

If you open an issue through `gh issue create`, the API, or another tool that bypasses the web UI, include the equivalent required fields yourself so the issue still matches the template.

Current required fields by issue type:

- **Bug report:** include a `Description`.
- **Feature request:** prefix the title with `[FEATURE]:`, include confirmation that the feature has not already been suggested, and add a description of the enhancement.
- **Question:** include the `Question`.

Recommended fields for bug reports, even when not strictly required by the template:

- Plugins
- Kilo version
- Steps to reproduce
- Screenshot and/or share link
- Operating System
- Terminal

## Pull Request Expectations

- **Issue First Policy:** All PRs must reference an existing issue.
- **UI Changes:** Include screenshots or videos (before/after).
- **Logic Changes:** Explain how you verified it works.
- **PR Titles:** Follow conventional commit standards (`feat:`, `fix:`, `docs:`, etc.).

## Issue First Policy

All pull requests must reference an existing issue.

This helps reviewers understand the problem statement, discussion, and intended scope before reviewing the code change.

## PR Titles

Use conventional commit style PR titles such as:

- `feat: add MCP settings tab`
- `fix: correct Windows path handling`
- `docs: clarify issue template requirements`
- `chore: bump TypeScript to 5.8`
- `refactor: extract diff renderer into a hook`
- `test: cover ServerManager orphan cleanup`

## Issue and PR Lifecycle

To keep our backlog manageable, we automatically close inactive issues and PRs after a period of inactivity. This isn't a judgment on quality — older items tend to lose context over time and we'd rather start fresh if they're still relevant. Feel free to reopen or create a new issue/PR if you're still working on something!

=======
This redirects all gateway traffic (auth, model listing, provider routing, profile, etc.) to your local server. The default is `https://api.kilo.ai`.

There are also optional overrides for other services:

| Variable | Default | Purpose |
|---|---|---|
| `KILO_API_URL` | `https://api.kilo.ai` | Kilo API (gateway, auth, models, profile) |
| `KILO_SESSION_INGEST_URL` | `https://ingest.kilosessions.ai` | Session export / cloud sync |
| `KILO_MODELS_URL` | `https://models.dev` | Model metadata |

> **VS Code:** The repo includes a "VSCode - Run Extension (Local Backend)" launch config in `.vscode/launch.json` that sets `KILO_API_URL=http://localhost:3000` automatically.

## Issue Template Requirements

If you open an issue through the GitHub web UI, GitHub will guide you through the correct template automatically.

If you open an issue through `gh issue create`, the API, or another tool that bypasses the web UI, include the equivalent required fields yourself so the issue still matches the template. Issues that skip required fields may be auto-closed by the compliance bot.

Current required fields by issue type:

- **Bug report:** include a `Description`. When you can, also add Plugins, Kilo version, Steps to reproduce, Screenshot and/or share link, Operating System, and Terminal so the report matches the full bug template.
- **Feature request:** use a title prefixed with `[FEATURE]:`, complete the required checkbox confirming you have searched for duplicates, and fill in `Describe the enhancement you want to request`.
- **Question:** include the `Question` field.

## Pull Request Expectations

- **UI Changes:** Include screenshots or videos (before/after).
- **Logic Changes:** Explain how you verified it works.

## Issue First Policy

All pull requests must reference an existing issue.

This helps reviewers understand the problem statement, discussion, and intended scope before reviewing the code change.

## PR Titles

Use conventional commit style PR titles such as:

- `feat: add MCP settings tab`
- `fix: correct Windows path handling`
- `docs: clarify issue template requirements`
- `chore: bump TypeScript to 5.8`
- `refactor: extract diff renderer into a hook`
- `test: cover ServerManager orphan cleanup`

## Issue and PR Lifecycle

To keep our backlog manageable, we automatically close inactive issues and PRs after a period of inactivity. This isn't a judgment on quality — older items tend to lose context over time and we'd rather start fresh if they're still relevant. Feel free to reopen or create a new issue/PR if you're still working on something!

>>>>>>> yunqiqiliang/opencode-v7.3.0
## Style Preferences

- **Functions:** Keep logic within a single function unless breaking it out adds clear reuse.
- **Destructuring:** Avoid unnecessary destructuring.
- **Control flow:** Avoid `else` statements; prefer early returns.
- **Types:** Avoid `any`.
- **Variables:** Prefer `const`.
- **Naming:** Concise single-word identifiers when descriptive.
- **Runtime APIs:** Use Bun helpers (e.g., `Bun.file()`).

## czcode_change Annotation Rules

When modifying files shared with the upstream (kilocode), annotate every change with a `czcode_change` marker. See [CLAUDE.md](CLAUDE.md) for the full annotation guide.

## Pull Request Expectations

- **UI Changes:** Include screenshots or videos (before/after).
- **Logic Changes:** Explain how you verified it works.
- **PR Titles:** Follow conventional commit standards (`feat:`, `fix:`, `docs:`, etc.).

## PR Titles

Use conventional commit style PR titles such as:

- `feat: add execute_sql tool`
- `fix: correct Lakehouse connection timeout`
- `docs: update upstream sync instructions`
- `chore: bump kilocode to v7.x.y`
- `refactor: extract SQL classifier`
