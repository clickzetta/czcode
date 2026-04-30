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
