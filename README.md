# czcode — ClickZetta Lakehouse AI Agent

czcode 是面向云器（ClickZetta）Lakehouse 数据团队的专用 AI 编程助手，基于 [kilocode](https://github.com/Kilo-Org/kilocode) fork 构建。

Fork 链：**opencode → kilocode → czcode**

---

## 核心能力

- **自然语言转 SQL** — 直接在 Lakehouse 上执行，SELECT 免确认，写操作弹窗审批
- **数仓建模向导** — 探索现有数据后给出分层方案建议，支持传统分层/Medallion/混合模式
- **33 个 Lakehouse Skills** — 覆盖 DDL、ETL、数据管道、数仓建模、治理、费用分析等领域
- **5 个数据角色** — 数据分析师（默认）、数仓工程师、数据工程师、平台运维、数据治理
- **Human-in-loop 写操作审批** — DDL/DML 弹窗确认，危险操作（DROP/TRUNCATE）显示完整 SQL
- **Skills 自动更新** — 从 GitHub 拉取最新 skills，`/skill-update` 命令手动刷新
- **500+ AI 模型** — 默认使用 DashScope/Qwen，兼容 OpenAI、Anthropic 等

---

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
CLICKZETTA_SERVICE=<your-service-endpoint>
CLICKZETTA_INSTANCE=<your-instance>
CLICKZETTA_WORKSPACE=<your-workspace>
CLICKZETTA_USERNAME=<your-username>
CLICKZETTA_PASSWORD=<your-password>
```

### 启动 TUI

```bash
~/.bun/bin/bun dev
```

启动后 czcode 会自动从 GitHub 拉取最新的 ClickZetta Lakehouse Skills，无需手动配置。

### 配置文件（可选）

在项目目录或 `~/.czcode/` 创建 `czcode.jsonc` 覆盖默认配置：

```jsonc
{
  "model": "alibaba-cn/qwen3.5-plus",
  "default_agent": "lh-analyst"
}
```

---

## 数据角色

| 角色 | 说明 | SQL 权限 |
|---|---|---|
| `lh-analyst` | 数据分析师（**默认**）| 仅 SELECT，工具层强制只读 |
| `lh-dw-engineer` | 数仓工程师 — 建模/ETL/调度/数据质量 | DDL + DML（写操作需确认） |
| `lh-engineer` | 数据工程师 — 建表/Pipeline/ETL | DDL + DML（写操作需确认） |
| `lh-dba` | 平台运维 — VCluster/查询调优/监控 | DDL + VCluster 操作（需确认） |
| `lh-governance` | 数据治理 — 权限/安全/生命周期/费用 | GRANT/REVOKE/POLICY（需确认） |

切换角色：在对话框输入 `@lh-dw-engineer` 或在配置中设置 `default_agent`。

---

## Skills 管理

### 自动安装

czcode 启动时自动从以下地址拉取 ClickZetta Lakehouse Skills：

```
https://yunqiqiliang.github.io/clickzetta-skills/.well-known/skills/
```

首次启动需要网络连接，之后缓存在本地。

### 手动更新

Skills 有更新时，在 czcode 中运行：

```
/skill-update
```

这会清除本地缓存，下次启动时重新拉取最新版本。

### 报告问题 / 提建议

发现 skill 内容有误或希望新增内容，请到 GitHub Issues 提交：

👉 **[提交 Skill 问题报告](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-bug.yml)**

👉 **[提交改进建议](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-enhancement.yml)**

也可以在 czcode 对话中运行 `/skill-fix` 将本次对话中发现的错误写入本地 override，并生成修正日志供维护者参考。

---

## 项目结构

```
czcode/
├── packages/
│   ├── opencode/          # 核心引擎（fork 自 kilocode）
│   ├── cli/               # CLI 入口
│   └── czcode-lakehouse/  # Lakehouse 插件（czcode 专属）
│       ├── src/connector.ts      # Lakehouse 连接器
│       ├── src/index.ts          # execute_sql 工具（含 human-in-loop）
│       └── src/sql-classifier.ts # SQL 风险分级
├── .opencode/command/     # 自定义命令（/skill-fix, /skill-update）
├── script/
│   └── upstream/          # 上游同步工具
└── CLAUDE.md              # 开发规范
```

---

## 上游同步

czcode 跟踪 kilocode 发布版本。查看可用版本：

```bash
~/.bun/bin/bun run script/upstream/list-versions.ts
```

合并新版本：

```bash
~/.bun/bin/bun run script/upstream/merge.ts v7.x.y
```

---

## 贡献

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发规范，以及 [CLAUDE.md](CLAUDE.md) 了解 `czcode_change` 标注规则。

## 许可证

MIT License — 基于 kilocode（MIT）和 opencode（MIT）。
