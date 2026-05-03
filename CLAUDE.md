# czcode — Development Guidelines

czcode is a fork of [kilocode](https://github.com/Kilo-Org/kilocode), which is itself a fork of opencode.
Fork chain: **opencode → kilocode → czcode**

---

## czcode_change Annotation Rules

Every change to a file that also exists in the upstream (kilocode) repo **must** be annotated with a `czcode_change` marker. This lets the upstream sync tooling identify which lines are czcode-specific so they can be preserved during future merges.

### Inline annotation (single line)

```typescript
export const APP_NAME = "ClickZetta" // czcode_change
```

### Block annotation (multiple lines)

```typescript
// czcode_change start
export const KILO_CONFIG_FILES = ["czcode.jsonc", "czcode.json", "kilo.jsonc", "kilo.json"] as const
export const KILO_DIR_SUFFIXES = [".czcode", ".kilo", ".kilocode"] as const
// czcode_change end
```

### YAML / shell files

```yaml
# czcode_change start
- name: czcode-specific step
# czcode_change end
```

### New file (entire file is czcode-specific)

Add this as the first non-shebang line:

```typescript
// czcode_change - new file
```

### Rules

- Both `czcode_change` and `kilocode_change` markers are accepted by the CI checker.
- Files in czcode-specific directories are **exempt** from annotation requirements (see below).
- The CI workflow `check-opencode-annotations.yml` enforces annotations on every PR.

---

## czcode-Specific Directories (Exempt from Annotation)

Changes in these directories do not need `czcode_change` markers:

- `packages/czcode-lakehouse/` — Lakehouse plugin (ClickZetta-specific)
- `script/upstream/` — upstream sync tooling
- `docs/` — documentation

---

## Upstream Sync

czcode tracks kilocode releases. The sync tooling lives in `script/upstream/`.

### Setup (one-time)

```bash
git remote add upstream git@github.com:Kilo-Org/kilocode.git
git fetch upstream --tags
```

### List available upstream versions

```bash
bun run script/upstream/list-versions.ts
```

### Merge a new upstream release

```bash
bun run script/upstream/merge.ts v7.x.y
```

The merge script applies brand transforms (kilo→czcode) to the upstream branch before merging, minimizing conflicts.

### Analyze conflicts after merge

```bash
bun run script/upstream/analyze.ts
```

### Rebuild czcode_change markers for a file

After resolving a merge conflict in a shared file, rebuild its markers:

```bash
bun run script/upstream/fix-kilocode-markers.ts packages/opencode/src/some/file.ts
# dry-run first:
bun run script/upstream/fix-kilocode-markers.ts packages/opencode/src/some/file.ts --dry-run
```

---

## Project Structure

```
czcode/
├── packages/
│   ├── opencode/          # Core — forked from kilocode (annotate all changes)
│   ├── cli/               # CLI entry point — forked from kilocode
│   ├── czcode-lakehouse/  # Lakehouse plugin — czcode-specific, no annotation needed
│   └── ...                # Other kilocode packages (inherit unchanged)
├── script/
│   └── upstream/          # Upstream sync tooling — czcode-specific
├── .github/
│   └── workflows/
│       └── check-opencode-annotations.yml  # CI: enforces czcode_change markers
└── CLAUDE.md              # This file
```

---

## Running Locally

```bash
# Install dependencies
~/.bun/bin/bun install

# Start TUI dev server (from source, auto-loads .env)
~/.bun/bin/bun dev

# Test compiled binary locally (builds + runs from dist/, loads .env from cwd)
~/.bun/bin/bun test:local

# Run annotation check
~/.bun/bin/bun run script/check-opencode-annotations.ts --base HEAD~1
```

> **`bun dev` vs `bun test:local`**：`bun dev` 直接从源码运行，适合开发调试。`bun test:local` 先编译成二进制再运行，模拟用户实际使用的方式，适合发布前验证。

### Environment variables

Copy `.env.example` to `.env` at the repo root and fill in:

```
DASHSCOPE_API_KEY=sk-...          # Alibaba DashScope (Qwen models)
CLICKZETTA_INSTANCE=...           # ClickZetta Lakehouse instance
CLICKZETTA_WORKSPACE=...
CLICKZETTA_USERNAME=...
CLICKZETTA_PASSWORD=...
```

The `packages/opencode/.env` symlink points to `../../.env` so Bun picks it up automatically.

---

## Agent Roles

| Agent | Role | SQL Permissions |
|-------|------|-----------------|
| `lh-engineer` | 数据工程师 (default) — 建表/建模/ETL/Pipeline/调度/指标管理 | DDL + DML + SELECT (with confirmation) |
| `lh-analyst` | 数据分析师 — 查询/报表/数据质量探查/BI连接 | SELECT only |
| `lh-dba` | 数据运维 — VCluster管理/查询调优/作业监控/费用分析 | DDL + VCluster ops (with confirmation) |
| `lh-governance` | 数据治理 — 权限/安全/生命周期/合规/共享 | GRANT/REVOKE/POLICY (with confirmation) |

Skills are loaded from `/Users/liangmo/Documents/GitHub/clickzetta-skills` (27 Lakehouse domain skills).

---

## Brand Mapping

| Upstream (kilocode) | czcode |
|---------------------|--------|
| `kilo.jsonc` / `kilo.json` | `czcode.jsonc` / `czcode.json` (kilo.* still works) |
| `~/.kilo` / `~/.kilocode` | `~/.czcode` (others still scanned) |
| `kilo.db` | `czcode.db` |
| `Kilo` / `KiloCode` | `ClickZetta` / `czcode` |
| `https://kilo.ai/docs` | `https://yunqi.tech/documents` |

---

## Debugging Best Practices (Lessons Learned)

### 1. 修 bug 前先全局搜索所有调用点

修 "Copied to clipboard" toast 不消失时，只改了 `app.tsx` 一处，但实际有 3 处调用（`app.tsx`、`selection.ts`、`dialog-provider.tsx`）。**修任何 UI 行为前，先 `grep -rn` 搜索所有相关调用点，一次性全部修完。**

### 2. 不要猜，先确认执行顺序

修 "Lakehouse 未配置" 显示问题时，猜测是 TUI 插件先于 server 插件渲染。实际上是 `process.env` 在编译后的二进制里不会自动加载 `.env`。**遇到"有时工作有时不工作"的问题，先确认 `bun dev` vs 编译二进制的行为差异。**

### 3. 正则解析结构化数据容易出错

用正则从 `get_context` 的表格输出里提取 workspace，结果匹配到了 `workspace_id` 列名。**解析表格数据用列索引（split + indexOf），不用正则。**

### 4. 上游合并后做冒烟测试

合并 v7.2.33 后没有测试 toast 行为变化。**每次上游合并后，至少测试：基本对话、复制粘贴、角色切换、工具执行。**
