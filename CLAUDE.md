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
| `lh-analyst` | 数据分析师 (default) — 查询/报表/数据质量探查/BI连接 | SELECT only |
| `lh-engineer` | 数据工程师 — 建表/建模/ETL/Pipeline/调度/指标管理 | DDL + DML + SELECT (with confirmation) |
| `lh-data-scientist` | 数据科学家 — Jupyter/EDA/特征工程/ZettaPark/模型推理 | DDL + DML + SELECT + bash (with confirmation) |
| `lh-dba` | 数据运维 — VCluster管理/查询调优/作业监控/费用分析 | DDL + VCluster ops (with confirmation) |
| `lh-governance` | 数据治理 — 权限/安全/生命周期/合规/共享 | GRANT/REVOKE/POLICY (with confirmation) |

Skills are bundled in the release zip and also loaded from `https://yunqiqiliang.github.io/clickzetta-skills/`.

---

## czcode TUI Plugins

All czcode TUI plugins live in `packages/opencode/src/kilocode/plugins/czcode-*.tsx` (protected directory).

| Plugin | Slot / Type | Order | Description |
|--------|-------------|-------|-------------|
| `czcode-dotenv.ts` | Module (side-effect import) | — | Loads `.env` from cwd for compiled binary |
| `czcode-connection-status.tsx` | `sidebar_content` | 350 | Lakehouse Workspace/Schema/VCluster/User |
| `czcode-schema-browser.tsx` | `sidebar_content` | 360 | Schema list from session history |
| `czcode-vcluster-dashboard.tsx` | `sidebar_content` + command | 370 | VCluster status + `/cz_vcluster` |
| `czcode-role-switch.tsx` | command | — | `/cz_role` role picker |
| `czcode-sql-history.tsx` | command | — | `/cz_sql_history` SQL browser |
| `czcode-sample.tsx` | command | — | `/cz_sample` table sampling |
| `czcode-count.tsx` | command | — | `/cz_count` row count |
| `czcode-profile.tsx` | command | — | `/cz_profile` data profiling |
| `czcode-singclaw.tsx` | command + route | — | `/cz_singclaw` SingClaw integration |
| `home-footer.tsx` (modified) | `home_footer` | 99 | Added Lakehouse connection status |

### TUI Plugin Development Rules

1. **Slot modes matter**: `home_footer` and `sidebar_footer` use `single_winner` mode (lowest order wins, replaces all others). `sidebar_content` is additive. Check the mode before registering a new slot.
2. **Use `czcode-dotenv.ts`**: Any plugin reading `process.env` must `import "@/kilocode/plugins/czcode-dotenv"` at the top. Compiled binaries don't auto-load `.env`.
3. **Use native `DialogSelect`**: Import from `@tui/ui/dialog-select`, not `api.ui.DialogSelect`. The native component handles Esc/close properly.
4. **Command naming**: All czcode commands must use `cz_` prefix (e.g., `cz_sample`, `cz_role`).
5. **Toast duration**: Always pass `duration: 2000` (or appropriate value) to `toast.show()`. Without it, toasts never auto-dismiss.
6. **Register in `internal.ts`**: Add import + array entry with `// czcode_change` markers.

---

## czcode Commands (Complete List)

| Command | Alias | Description |
|---------|-------|-------------|
| `/cz_role` | `/cz_r` | Switch data agent role |
| `/cz_sample` | `/cz_s` | Quick table sampling |
| `/cz_count` | `/cz_c` | Table row count |
| `/cz_profile` | `/cz_p` | Data quality profiling |
| `/cz_vcluster` | `/cz_vc` | VCluster status query |
| `/cz_sql_history` | `/cz_sh` | Browse/copy past SQL |
| `/cz_singclaw` | `/singclaw` | Open SingClaw chat |
| `/cz_skill-update` | — | Update ClickZetta skills |
| `/cz_skill-fix` | — | Fix skill content locally |

---

## Configuration Hierarchy

Priority from highest to lowest:

1. **Project config**: `./czcode.jsonc` or `./czcode.json` in working directory
2. **Global config**: `~/.config/czcode/config.json` (XDG path on macOS/Linux)
3. **Code defaults**: `default_agent: "lh-analyst"`, `model: "alibaba-cn/qwen3.5-plus"` (in `config.ts`)

Key: `czcode.jsonc` in the project directory is discovered via `ConfigPaths.files("czcode", ...)` — this was a bug fix (previously only `kilo`/`opencode` prefixes were searched).

---

## Release Process

```bash
# Push all changes to main
git push origin main

# Trigger release (patch/minor/major)
gh workflow run "Release" --ref main -f bump=patch

# NOTE: Use "Release" workflow, NOT "publish" (publish is kilocode's upstream workflow)
```

The release workflow: version → build (all platforms) → bundle clickzetta-skills → create archives → publish GitHub Release.

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

### 5. `bun dev` 和编译二进制行为不同

`bun dev` 自动加载 `.env`，编译二进制不会。`bun dev` 的 `process.env` 在启动时就填充，编译二进制需要手动加载。**所有读 `process.env` 的 TUI 插件必须 import `czcode-dotenv.ts`。**

### 6. Agent prompt 中不要用 `@lh-xxx` 引导用户

用户不知道 `@lh-engineer` 是什么。**引导切换角色时写"数据工程师（按 Tab 切换角色，或输入 /cz_role）"。**

### 7. 配置文件路径是 XDG 规范

macOS 上全局配置在 `~/.config/czcode/config.json`，不是 `~/.czcode/config.json`。**操作配置文件前先确认实际路径。**
