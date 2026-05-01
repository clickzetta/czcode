---
description: 修正经实际执行验证的 skill 错误，写入本地 override，实现 skill 自进化
subtask: true
---

用户发现了一个经过实际执行验证的 skill 错误，需要修正。

## 任务

### 第一步：理解错误

从对话上下文中提取：
- 哪个 skill 有问题（skill 名称）
- 错误的内容是什么（字段名/语法/示例 SQL）
- 经过实际执行验证的正确内容是什么

### 第二步：定位原始 skill 文件

在 `skills.paths` 配置的目录（如 `/Users/liangmo/Documents/GitHub/clickzetta-skills/`）中找到对应的 skill 目录，读取需要修正的文件。

### 第三步：写入本地 override

**如果错误在 SKILL.md 主文件中**：
将修正后的 SKILL.md 写入 `.opencode/skills/<skill-name>/SKILL.md`。
skill 加载时，项目本地的同名 skill 会覆盖 `skills.paths` 中的版本（后加载覆盖先加载）。

**如果错误在 references/*.md 引用文件中**：
引用文件由 agent 通过 read 工具直接读取，不走 skill 覆盖机制。
需要直接修改原始文件（需要仓库权限），或者在 SKILL.md 的 override 版本中内联正确内容，替代对引用文件的链接。

### 第四步：追加修正日志

在 `.opencode/skills/FIXLOG.md` 中追加一条记录（文件不存在则创建）：

```markdown
## YYYY-MM-DD：<skill-name> — <一句话描述>

- **错误**：`<原始错误内容>`
- **正确**：`<验证后的正确内容>`
- **验证**：实际执行报错 `<error message>`，修正后成功
- **文件**：`<skill-name>/references/<file>.md` 或 `SKILL.md`
```

这个日志可以提交给 skill 维护者，作为官方修正的依据。

### 第五步：告知用户

说明：
1. override 已写入 `.opencode/skills/<skill-name>/SKILL.md`
2. 需要重启 czcode 会话才能加载修正后的 skill
3. 如果有 clickzetta-skills 仓库写权限，建议同步修正原始文件（路径：`/Users/liangmo/Documents/GitHub/clickzetta-skills/<skill-name>/...`）

## 约束

- 只写入项目 `.opencode/skills/` 目录，不修改其他位置的文件（除非用户明确授权）
- 必须有实际执行验证作为依据，不能基于推测修改

## 当前对话上下文

$ARGUMENTS
