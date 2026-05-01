---
description: 修正 clickzetta-skills 中经实际验证发现的错误，实现 skill 自进化
subtask: true
---

用户发现了一个经过实际执行验证的 skill 错误，需要修正。

## 任务

1. **理解错误**：从对话上下文中提取：
   - 哪个 skill 文件有问题（skill 名称 + 具体文件路径）
   - 错误的内容是什么（字段名/语法/示例）
   - 经过实际验证的正确内容是什么

2. **定位文件**：在 `/Users/liangmo/Documents/GitHub/clickzetta-skills/` 目录下找到对应文件

3. **修正内容**：
   - 只修改有错误的部分，不改动其他内容
   - 如果是字段不存在：从字段列表中删除，并在字段表格下方加一条 `> ⚠️ 注意：xxx 字段不存在，实际验证于 YYYY-MM-DD` 的说明
   - 如果是语法错误：直接替换为正确语法，在旁边加注释说明差异
   - 如果是示例 SQL 有误：修正示例，不需要额外注释

4. **提交到 clickzetta-skills 仓库**：
   ```
   cd /Users/liangmo/Documents/GitHub/clickzetta-skills
   git add <修改的文件>
   git commit -m "fix(<skill-name>): <一句话描述修正内容>（经实际验证）"
   git push origin main
   ```

5. **报告结果**：说明修改了哪个文件的哪一行，以及修改前后的对比。

## 约束

- 只修改 `/Users/liangmo/Documents/GitHub/clickzetta-skills/` 下的文件
- 必须有实际执行验证作为依据，不能基于推测修改
- commit message 必须包含"经实际验证"字样，便于追溯

## 当前对话上下文

$ARGUMENTS
