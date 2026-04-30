# czcode — ClickZetta Lakehouse AI Agent

czcode 是面向云器（ClickZetta）Lakehouse 数据团队的专用 AI 编程助手，基于 [kilocode](https://github.com/Kilo-Org/kilocode) fork 构建。

Fork 链：**opencode → kilocode → czcode**

---

## 核心能力

- **SQL 生成与执行** — 自然语言转 SQL，直接在 Lakehouse 上执行
- **表结构查询** — 查看列名、类型、注释
- **对象浏览** — 列出数据库/Schema/表/视图/Pipe/Stream
- **执行计划分析** — EXPLAIN 查询优化
- **27 个 Lakehouse Skills** — 云器领域知识库，覆盖 DDL、ETL、数据质量等
- **3 个数据角色** — 数据工程师、数据分析师、DBA，权限隔离
- **500+ AI 模型** — 默认使用 DashScope/Qwen，兼容 OpenAI、Anthropic 等

## 快速开始

### 安装依赖

```bash
# 需要 Bun 1.3.13+
curl -fsSL https://bun.sh/install | bash
bun install
```

### 配置环境变量

在项目根目录创建 `.env`：

```env
# DashScope / Qwen（默认模型）
DASHSCOPE_API_KEY=sk-...

# ClickZetta Lakehouse 连接信息
CLICKZETTA_INSTANCE=cn-shanghai-alicloud.api.clickzetta.com
CLICKZETTA_WORKSPACE=your_workspace
CLICKZETTA_USERNAME=your_username
CLICKZETTA_PASSWORD=your_password
```

### 启动 TUI

```bash
~/.bun/bin/bun dev
```

### 配置文件

在项目目录或 `~/.czcode/` 创建 `czcode.jsonc`：

```jsonc
{
  "model": "alibaba-cn/qwen3.5-plus",
  "default_agent": "lh-engineer"
}
```

## 数据角色

| 角色 | 说明 | SQL 权限 |
|---|---|---|
| `lh-engineer` | 数据工程师（默认） | DDL + DML + SELECT（写操作需确认） |
| `lh-analyst` | 数据分析师 | 仅 SELECT |
| `lh-dba` | DBA | 全部（需确认） |

## 项目结构

```
czcode/
├── packages/
│   ├── opencode/          # 核心引擎（fork 自 kilocode）
│   ├── cli/               # CLI 入口
│   └── czcode-lakehouse/  # Lakehouse 插件（czcode 专属）
├── script/
│   └── upstream/          # 上游同步工具
└── CLAUDE.md              # 开发规范
```

## 上游同步

czcode 跟踪 kilocode 发布版本。查看可用版本：

```bash
~/.bun/bin/bun run script/upstream/list-versions.ts
```

合并新版本：

```bash
~/.bun/bin/bun run script/upstream/merge.ts v7.x.y
```

## 贡献

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发规范，以及 [CLAUDE.md](CLAUDE.md) 了解 `czcode_change` 标注规则。

## 许可证

MIT License — 基于 kilocode（MIT）和 opencode（MIT）。
