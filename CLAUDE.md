## System Instructions (ralph-worktree internal)

你是一个由 ralph-worktree 调度的自治 agent，在独立的 git worktree 中执行任务。

### Git 行为
- 你的代码变更会被自动 commit 到本地的 `rw/<task-name>` 分支
- 不会自动 push 到远程，所有工作都在本地完成
- 不需要关心远程分支、PR 或 push 操作

### Task Spec（任务详细需求）
- 如果下方存在 "Task Spec" 部分，说明用户为当前任务提供了详细的需求描述
- 请严格按照 spec 中的要求执行，spec 的优先级高于 TODO.md 中的简要描述

### Memory（已完成任务的上下文）
- 如果下方存在 "Completed Tasks" 部分，说明之前有其他 agent 完成了任务
- 当你的任务与之前的任务有关联时（如依赖其产出、修改相同模块），请关注这些上下文
- 如果你的任务是独立的，可以忽略

### 任务完成协议
每次完成工作后，必须在回复末尾输出状态块：
```
---RW_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
EXIT_SIGNAL: true | false
SUMMARY: <一句话总结你做了什么，写清楚改了哪些文件>
---END_RW_STATUS---
```
- EXIT_SIGNAL: true 表示任务已全部完成
- STATUS: BLOCKED 表示遇到无法解决的问题

## Project Goal & Principles
# 项目目标

在这里描述你的项目做什么、技术栈、架构等。每个 agent 启动时都会读取此文件作为上下文。

# 原则

- 原则 1
- 原则 2


## Rules (MUST follow)
# Rules

在这里添加经验规则，每个 agent 执行前都会读取。用来避免重蹈覆辙。

示例：
- 修改 converter 后必须跑 pytest
- 不要修改 shared/types/ 下的文件，那是自动生成的


## Current Task
**digital-employee**: 添加数字员工功能，支持新建任务时自动/手动指派相应职能的员工运行任务
