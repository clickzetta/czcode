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

> 也支持 OpenAI、Anthropic 等其他 AI 模型，在配置文件中设置 `model` 字段即可。

### 第三步（b）：配置 AI 模型

在同一目录创建 `czcode.jsonc` 文件，设置默认模型：

```jsonc
{
  // AI 模型（必须配置，否则无法对话）
  "model": "alibaba-cn/qwen3.5-plus"
}
```

> czcode 不内置默认模型，必须在 `czcode.jsonc` 中指定。推荐使用 `alibaba-cn/qwen3.5-plus`（需要 `.env` 中的 `DASHSCOPE_API_KEY`）。也支持 `anthropic/claude-sonnet-4`、`openai/gpt-4o` 等 500+ 模型。

### 第四步：启动

```bash
# 在解压后的目录里启动（macOS Apple Silicon 示例）
cd ~/Downloads/czcode-darwin-arm64
./czcode
```

czcode 会自动读取当前目录下的 `.env` 文件加载 Lakehouse 连接配置。

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
/cz_skill-update
```

> **国内用户注意**：Skills 托管在 GitHub，国内网络可能无法直接访问。请先配置代理（如 `export https_proxy=http://127.0.0.1:7890`），再运行 skill 更新命令。

### 报告 Skill 问题
发现 skill 内容有误，可以：
- 在对话中运行 `/cz_skill-fix` 写入本地修正
- 或到 GitHub 提交 Issue：[报告问题](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-bug.yml) | [提改进建议](https://github.com/yunqiqiliang/clickzetta-skills/issues/new?template=skill-enhancement.yml)

---

## 更多配置

`czcode.jsonc` 支持更多选项：

```jsonc
{
  // AI 模型（必须配置）
  "model": "alibaba-cn/qwen3.5-plus",

  // 默认角色（可选，默认 lh-analyst）
  "default_agent": "lh-analyst"

  // 更多模型选择：
  // "model": "anthropic/claude-sonnet-4",
  // "model": "openai/gpt-4o",
}
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

czcode 是 [KiloCode](https://github.com/Kilo-Org/kilocode) 的 fork，KiloCode 是 [OpenCode](https://github.com/anomalyco/opencode) 的 fork。感谢两个上游项目的开源贡献。
