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

### 第二步：解压

**macOS / Linux：**

```bash
# macOS (Apple Silicon 示例)
cd ~/Downloads
unzip czcode-darwin-arm64.zip
cd czcode-darwin-arm64
chmod +x czcode
```

> **macOS 提示"已损坏，无法打开"**：这是 macOS Gatekeeper 的安全限制，因为二进制未经 Apple 签名。运行以下命令解除限制：
> ```bash
> xattr -d com.apple.quarantine ~/Downloads/czcode-darwin-arm64/czcode
> ```

```bash
# Linux
cd ~/Downloads
tar -xzf czcode-linux-x64.tar.gz
cd czcode-linux-x64
chmod +x czcode
```

**Windows：**

解压 `czcode-windows-x64.zip` 即可使用。

### 第三步：配置 Lakehouse 连接

在解压后的目录里创建 `.env` 文件，填入你的 Lakehouse 连接信息：

```bash
# 进入解压后的目录（macOS Apple Silicon 示例）
cd ~/Downloads/czcode-darwin-arm64
```

用文本编辑器创建 `.env` 文件，内容如下：

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

> 也支持 OpenAI、Anthropic 等其他 AI 模型，详见下方"配置说明"。

### 第四步：启动

```bash
# 在解压后的目录里启动（macOS Apple Silicon 示例）
cd ~/Downloads/czcode-darwin-arm64
./czcode
```

czcode 会自动读取当前目录下的 `.env` 文件加载 Lakehouse 连接配置。

---

## 数据角色

czcode 内置 5 个数据角色，通过 **Tab 键**循环切换，或输入 `/cz_role` 命令选择：

| 角色 | 说明 | 权限 |
|---|---|---|
| 数据分析师（默认） | 查询/报表/数据质量探查/BI 连接 | 仅 SELECT，工具层强制只读 |
| 数据工程师 | 建表/建模/ETL/Pipeline/调度/指标管理 | DDL + DML + SELECT，写操作需确认 |
| 数据科学家 | Python/Jupyter/EDA/特征工程/模型推理 | 写操作需确认 |
| 数据运维 | VCluster 管理/查询调优/作业监控/费用分析 | DDL + VCluster ops，写操作需确认 |
| 数据治理 | 权限/安全/生命周期/合规/共享 | GRANT/REVOKE/POLICY，写操作需确认 |

> 除了数据角色，czcode 也保留了 kilocode 原有的 Code/Plan 等代码开发角色。

---

## 主要功能

### 自然语言查询
直接用中文描述需求，czcode 生成 SQL 并执行：
- SELECT 查询直接执行，结果以表格展示，附带执行耗时（⏱ 1.2s）
- DDL/DML 操作弹窗确认，危险操作（DROP/TRUNCATE）显示目标表大小、行数、最后修改时间

### 快捷命令

| 命令 | 别名 | 功能 |
|------|------|------|
| `/cz_sample` | `/cz_s` | 快速采样：输入表名，自动执行 `SELECT * FROM table LIMIT 5` |
| `/cz_count` | `/cz_c` | 行数统计：一键查看表的总行数 |
| `/cz_profile` | `/cz_p` | 数据画像：自动分析每列的 NULL 比例、唯一值、最大最小值 |
| `/cz_role` | `/cz_r` | 角色切换：弹出选择框切换数据角色 |
| `/cz_vcluster` | `/cz_vc` | VCluster 状态：查看所有 VCluster 的运行状态和规格 |
| `/cz_sql_history` | `/cz_sh` | SQL 历史：浏览当前会话的 SQL 执行记录，选中即复制到剪贴板 |
| `/cz_singclaw` | — | SingClaw：连接本地 SingClaw 服务进行对话 |
| `/cz_skill-update` | — | 更新 ClickZetta 领域知识（Skills） |
| `/cz_skill-fix` | — | 修正 Skill 内容错误 |

### 侧边栏信息

session 页面右侧边栏实时显示：
- **Lakehouse 连接状态**：Workspace / Schema / VCluster / User（跟随 `switch_context` 自动更新）
- **Schemas**：对话中使用 `list_objects` 后自动填充
- **VClusters**：对话中查询 VCluster 后自动填充

### 数仓建模向导

切换到数据工程师角色后，输入"帮我设计数仓分层"，czcode 会：
1. 自动探索你的数据（SHOW SCHEMAS/TABLES，查表大小）
2. 给出具体的分层方案选项（传统分层 / Medallion / 混合）
3. 生成 DDL 模板和数据管道配置

### DDL 确认增强

执行危险操作（DROP/TRUNCATE/ALTER/DELETE）时，确认弹窗会额外显示：
- 目标表大小（MB）
- 行数
- 最后修改时间
- 支持 UNDROP 的对象会提示恢复命令

### Skills（领域知识）

czcode 内置 27 个 ClickZetta Lakehouse 领域 Skill，覆盖 SQL 语法、数据导入、索引管理、VCluster 运维等场景。Skills 随安装包一起分发，无需网络即可使用。

更新 Skills：
```
/cz_skill-update
```

> **国内用户注意**：Skills 更新需要访问 GitHub。如无法访问，请配置代理（如 `export https_proxy=http://127.0.0.1:7890`）后再运行。

报告 Skill 问题：
- 在对话中运行 `/cz_skill-fix` 写入本地修正
- 或到 GitHub 提交 Issue：[报告问题](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-bug.yml) | [提改进建议](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-enhancement.yml)

---

## 配置说明

czcode 有两层配置，优先级从高到低：

### 1. 项目配置（当前目录）

在 czcode 运行目录创建 `czcode.jsonc`，只影响当前项目：

```jsonc
{
  "model": "alibaba-cn/qwen3.5-plus",
  "default_agent": "lh-analyst"
}
```

### 2. 全局配置（用户目录）

全局配置在 `~/.czcode/config.json`，影响所有项目：

```json
{
  "model": "alibaba-cn/qwen3.5-plus",
  "default_agent": "lh-analyst",
  "skills": {
    "paths": ["/path/to/local/clickzetta-skills"]
  }
}
```

> **macOS 路径**：`~/.config/czcode/config.json`
> **Linux 路径**：`~/.config/czcode/config.json`（遵循 XDG 规范）

### 默认值

不创建任何配置文件时，czcode 使用以下默认值：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `model` | `alibaba-cn/qwen3.5-plus` | 需要 `.env` 中的 `DASHSCOPE_API_KEY` |
| `default_agent` | `lh-analyst` | 数据分析师（只读） |

### 更多模型选择

```jsonc
{
  // 阿里云 DashScope（默认，需要 DASHSCOPE_API_KEY）
  "model": "alibaba-cn/qwen3.5-plus",

  // Anthropic（需要 ANTHROPIC_API_KEY）
  // "model": "anthropic/claude-sonnet-4-6",

  // OpenAI（需要 OPENAI_API_KEY）
  // "model": "openai/gpt-4o",
}
```

---

## 开发者文档

如需从源码构建或参与开发，请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [CLAUDE.md](CLAUDE.md)。

---

## 许可证

MIT License

czcode 是 [KiloCode](https://github.com/Kilo-Org/kilocode) 的 fork，KiloCode 是 [OpenCode](https://github.com/anomalyco/opencode) 的 fork。感谢两个上游项目的开源贡献。
