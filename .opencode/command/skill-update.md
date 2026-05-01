---
description: 更新 ClickZetta Lakehouse Skills — 清除缓存并从 GitHub 重新拉取最新版本
subtask: true
---

更新 czcode 的 ClickZetta Lakehouse Skills 到最新版本。

## 任务

### 第一步：清除 skills 缓存

Skills 通过 URL 拉取后缓存在本地，缓存不会自动更新。需要删除缓存目录强制重新下载。

执行以下 bash 命令清除缓存：

```bash
# 找到 skills 缓存目录并清除
rm -rf ~/.cache/opencode/skills/ 2>/dev/null
rm -rf ~/.cache/kilocode/skills/ 2>/dev/null
rm -rf ~/.cache/czcode/skills/ 2>/dev/null
# 也尝试 XDG_CACHE_HOME
rm -rf "${XDG_CACHE_HOME:-$HOME/.cache}/opencode/skills/" 2>/dev/null
echo "Skills cache cleared."
```

### 第二步：告知用户重启生效

缓存清除后，下次启动 czcode 时会自动从以下地址重新拉取最新 skills：

```
https://yunqiqiliang.github.io/clickzetta-skills/.well-known/skills/
```

告知用户：
1. 缓存已清除
2. **重启 czcode** 后将自动下载最新版本的所有 skills
3. 如果想查看当前已加载的 skills，可以使用 `/debug skill` 命令

### 第三步：如果用户想报告 skill 问题

引导用户到 GitHub Issues 提交反馈：

```
https://github.com/yunqiqiliang/clickzetta-skills/issues/new/choose
```

提供两种模板：
- **Skill 问题报告**（Bug）：语法错误、字段不存在、内容过时
- **Skill 改进建议**（Enhancement）：新增内容、补充场景

## 约束

- 只清除 skills 缓存，不删除其他配置文件
- 不修改任何 skill 文件内容
