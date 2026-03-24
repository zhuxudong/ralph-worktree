# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 多任务并发机制 (.rw/)

本项目使用 [ralph-worktree](https://github.com/zhuxudong/ralph-worktree) (`rw`) 进行多任务并行管理。`.rw/` 目录包含任务定义、规则和状态。

### 核心文件

- `.rw/PROMPT.md` — 项目目标与原则（所有 agent 共享的上下文）
- `.rw/TODO.md` — 任务列表，状态标记：`[ ]` 待做、`[~]` 进行中、`[x]` 已完成、`[✓]` 已合并、`[!]` 失败、`[-]` 已删除
- `.rw/RULES.md` — 经验规则（避免重蹈覆辙）
- `.rw/specs/<task-name>.md` — 任务详细需求（同名文件自动关联任务）
- `.rw/memory/<task-name>.md` — 已完成任务的摘要（供后续任务感知上下文）
- `.rw/state.json` — 运行状态（任务进度、循环次数、时间戳等）

### 领取任务流程

当用户说 **"领任务"** 或 **"pick task"** 时，按以下流程执行：

1. **读取上下文**：依次读取 `.rw/PROMPT.md`（项目背景）、`.rw/RULES.md`（经验规则）、`.rw/TODO.md`（任务列表）、`.rw/state.json`（运行状态）
2. **领取任务**：从 `TODO.md` 中选取一个 `[ ]` 状态的任务，将其标记为 `[~]`（进行中）
3. **判断是否需要隔离**：检查 `state.json` 中正在运行的其他任务，评估文件冲突风险。以下情况使用 worktree 隔离：
   - 改动量大、涉及多个模块
   - 与其他进行中任务可能修改相同文件
   - 否则直接在主仓库工作即可
4. **如果使用 worktree**：创建到 `.rw/worktrees/<task-name>/`，分支名 `rw/<task-name>`
5. **更新状态**：在 `state.json` 中注册任务（name, status, branch, worktreePath）
6. **执行任务**：完成开发、测试
7. **完成收尾**：
   - 提交代码（如果用了 worktree：merge 回开发分支，清理 worktree 和分支）
   - 将 `.rw/TODO.md` 中任务标记为 `[x]`
   - 更新 `.rw/state.json`：status 改为 `"done"`，记录 `finishedAt`
   - 如果发现了通用经验规则，追加到 `.rw/RULES.md`
   - 如果有需要其他任务知道的上下文，写入 `.rw/memory/<task-name>.md`
   - 将完成摘要追加到 `.rw/logs/<task-name>.log`

### 任务生命周期

```
[ ] pending → [~] running → [x] done → [✓] merged → [-] deleted
                   ↓                        ↑
              [!] failed ──────────────────┘
```
