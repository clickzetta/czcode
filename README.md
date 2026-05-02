# czcode — ClickZetta Lakehouse AI Agent

czcode 是面向云器（ClickZetta）Lakehouse 数据团队的 AI 助手，支持自然语言查询、数仓建模向导、数据治理等场景。

---

## 安装

### 第一步：下载安装包

前往 [Releases 页面](https://github.com/yunqiqiliang/czcode/releases/latest) 下载对应平台的安装包：

| 平台 | 文件名 |
|---|---|
| macOS (Apple Silicon) | `czcode-darwin-arm64.zip` |
| macOS (Intel) | `czcode-darwin-x64.zip` |
| Linux (x64) | `czcode-linux-x64.tar.gz` |
| Linux (ARM64) | `czcode-linux-arm64.tar.gz` |
| Windows (x64) | `czcode-windows-x64.zip` |

### 第二步：解压并安装

**macOS / Linux：**

```bash
# macOS (Apple Silicon 示例)
unzip czcode-darwin-arm64.zip
sudo mv czcode /usr/local/bin/czcode
chmod +x /usr/local/bin/czcode
```

> **macOS 提示"已损坏，无法打开"**：这是 macOS Gatekeeper 的安全限制，因为二进制未经 Apple 签名。运行以下命令解除限制：
> ```bash
> xattr -d com.apple.quarantine /usr/local/bin/czcode
> ```

```bash
# Linux
tar -xzf czcode-linux-x64.tar.gz
sudo mv czcode /usr/local/bin/czcode
chmod +x /usr/local/bin/czcode
```

**Windows：**

解压 `czcode-windows-x64.zip`，将 `czcode.exe` 放入 PATH 目录。

### 第三步：配置 Lakehouse 连接

在任意目录创建 `.env` 文件（或设置环境变量）：

```env
# AI 模型（默认使用阿里云 DashScope/Qwen）
DASHSCOPE_API_KEY=sk-...

# ClickZetta Lakehouse 连接信息（必填）
CLICKZETTA_SERVICE=<your-service-endpoint>
CLICKZETTA_INSTANCE=<your-instance>
CLICKZETTA_WORKSPACE=<your-workspace>
CLICKZETTA_USERNAME=<your-username>
CLICKZETTA_PASSWORD=<your-password>

# ClickZetta Lakehouse 连接信息（可选，有默认值）
CLICKZETTA_SCHEMA=<your-schema>      # 默认 public
CLICKZETTA_VCLUSTER=<your-vcluster>  # 默认 default
```

> 也支持 OpenAI、Anthropic 等其他 AI 模型，在配置文件中设置 `model` 字段即可。

### 第四步：启动

```bash
source .env && czcode
```

> **提示**：czcode 不会自动读取 `.env` 文件，每次启动前需要先执行 `source .env`。
> 如果不想每次都手动执行，可以把环境变量直接写入 `~/.zshrc`（macOS/Linux）或系统环境变量（Windows），重启终端后永久生效。

---

## 数据角色

启动后默认进入**数据分析师**模式（只读）。在对话框输入 `@角色名` 切换：

| 角色 | 说明 | 权限 |
|---|---|---|
| `@lh-analyst` | 数据分析师（默认） | 仅 SELECT，工具层强制只读 |
| `@lh-engineer` | 数据工程师 | 建表/建模/ETL/Pipeline/调度，写操作需确认 |
| `@lh-dba` | 数据运维 | VCluster/查询调优/监控/费用分析，写操作需确认 |
| `@lh-governance` | 数据治理 | 权限/安全/生命周期/合规/共享，写操作需确认 |

---

## 主要功能

### 自然语言查询
直接用中文描述需求，czcode 生成 SQL 并执行：
- SELECT 查询直接执行
- DDL/DML 操作弹窗确认，危险操作（DROP/TRUNCATE）显示完整 SQL

### 数仓建模向导（`@lh-engineer`）
输入"帮我设计数仓分层"，czcode 会：
1. 自动探索你的数据（SHOW SCHEMAS/TABLES，查表大小）
2. 给出具体的分层方案选项（传统分层 / Medallion / 混合）
3. 生成 DDL 模板和数据管道配置

### Skills 更新
Skills 有更新时，在对话中运行：
```
/skill-update
```

### 报告 Skill 问题
发现 skill 内容有误，可以：
- 在对话中运行 `/skill-fix` 写入本地修正
- 或到 GitHub 提交 Issue：[报告问题](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-bug.yml) | [提改进建议](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-enhancement.yml)

---

## 可选配置

在工作目录创建 `czcode.jsonc` 自定义配置：

```jsonc
{
  // 默认角色
  "default_agent": "lh-analyst",

  // AI 模型（支持 500+ 模型）
  "model": "alibaba-cn/qwen3.5-plus",
  // "model": "anthropic/claude-opus-4-7",
  // "model": "openai/gpt-4o",
}
```

---

## 开发者文档

如需从源码构建或参与开发，请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [CLAUDE.md](CLAUDE.md)。

---

## 许可证

MIT License
