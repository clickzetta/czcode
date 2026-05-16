---
description: 收集用户反馈并修正 skill，支持 SQL 错误、流程问题、方案不符合预期等多种反馈类型，实现 ALHF 闭环
subtask: true
---

用户发现了 skill 或 agent 行为的问题，需要收集结构化反馈并修正。

## 第一步：收集结构化反馈

从对话上下文提取以下信息，缺失的主动向用户询问：

**反馈类型**（判断属于哪类，影响后续路由）：
- `sql_error`：SQL 语法错误或执行失败
- `wrong_output`：输出内容不符合预期（方案错误、建议不合理）
- `missing_step`：缺少必要步骤（如没有弹出确认菜单、没有检查 VCluster）
- `wrong_routing`：触发了错误的 skill，或没有触发应该触发的 skill
- `incomplete_guidance`：skill 内容不完整，缺少关键场景的指导
- `other`：其他问题

**必须提取的字段**：
- `skill_name`：哪个 skill 有问题（如 `clickzetta-dynamic-table`）
- `user_input`：用户说了什么（触发问题的原始输入）
- `actual_output`：AI 实际输出了什么（错误的内容）
- `expected_output`：用户期望的正确输出是什么
- `component`：问题出在哪个组件（见下方路由规则）

**组件路由规则**（判断需要改哪里）：

| 问题现象 | 组件 | 需要改的文件 |
|---|---|---|
| SQL 语法错误、示例代码错误 | `skill_content` | `<skill>/SKILL.md` 或 `references/*.md` |
| AI 没有遵守某条规则（如 DDL 配了 Cron） | `agent_prompt` | `lh-engineer.txt` 等 prompt 文件 |
| 触发了错误的 skill | `routing` | `eval_cases.jsonl` 或 skill description |
| 向导没有弹出菜单 | `agent_prompt` | `lh-engineer.txt` 或 skill 向导部分 |
| 缺少某个场景的指导 | `skill_content` | `<skill>/SKILL.md` |
| 多个组件都有问题 | `multiple` | 分别记录 |

## 第二步：写入结构化反馈日志

在 `.opencode/skills/FEEDBACK.jsonl` 中追加一条记录（文件不存在则创建）：

```json
{
  "timestamp": "YYYY-MM-DDTHH:mm:ss",
  "type": "<反馈类型>",
  "skill_name": "<skill名称>",
  "component": "<skill_content|agent_prompt|routing|multiple>",
  "user_input": "<触发问题的用户输入>",
  "actual_output": "<AI实际输出的错误内容>",
  "expected_output": "<用户期望的正确输出>",
  "verified": <true|false>,
  "fix_applied": false,
  "notes": "<补充说明>"
}
```

> `verified: true` 表示有实际执行结果作为依据（如 SQL 报错截图、执行失败日志）；`false` 表示基于用户判断。两种都有价值，都要记录。

## 第三步：定位并修正

根据 `component` 字段路由到对应文件：

**`skill_content`** → 在 `skills.paths` 目录找到对应 skill，读取并修正：
- 写入本地 override：`.opencode/skills/<skill-name>/SKILL.md`
- 如有 clickzetta-skills 仓库写权限，同步修正原始文件

**`agent_prompt`** → 修正对应的 prompt 文件：
- `lh-engineer.txt`、`lh-analyst.txt`、`lh-dba.txt` 等
- 需要仓库写权限，提示用户在 czcode 仓库提交修改

**`routing`** → 修正触发词或 eval_cases：
- 更新 skill 的 `description` 中的触发词
- 在 `eval_cases.jsonl` 中添加新的测试案例

## 第四步：更新反馈日志

修正完成后，将 `FEEDBACK.jsonl` 中对应记录的 `fix_applied` 更新为 `true`，并补充：

```json
{
  "fix_applied": true,
  "fix_description": "<一句话描述做了什么修改>",
  "fix_file": "<修改的文件路径>"
}
```

## 第五步：告知用户

说明：
1. 反馈已记录到 `.opencode/skills/FEEDBACK.jsonl`（可提交给 skill 维护者）
2. 如果做了本地 override，需要重启 czcode 会话才能加载
3. 如果是 `agent_prompt` 问题，需要在 czcode 仓库提交 PR 才能生效

## 约束

- `skill_content` 类型：只写入 `.opencode/skills/` 目录，不修改其他位置（除非用户明确授权）
- `agent_prompt` 类型：提示用户需要仓库写权限，不自动修改
- `verified: false` 的反馈同样记录，但修正时需要更谨慎，建议先验证

## 当前对话上下文

$ARGUMENTS
