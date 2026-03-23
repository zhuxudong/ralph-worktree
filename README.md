# ralph-worktree

多任务并行自治开发工具，基于 git worktree 隔离 + Claude Code 自主执行。

用户只需关注 3 个文件（`PROMPT.md`、`TODO.md`、`RULES.md`），工具自动完成任务调度、worktree 管理和 agent 循环。

## 安装

```bash
# 克隆并构建
git clone https://github.com/zhuxudong/ralph-worktree.git
cd ralph-worktree
npm install
npm run build

# 全局链接
npm link
```

## 快速开始

```bash
# 1. 在任意 git 仓库中初始化
cd your-project
rw init

# 2. 编辑 3 个核心文件
#    .rw/PROMPT.md  — 项目目标与原则
#    .rw/TODO.md    — 任务列表
#    .rw/RULES.md   — 经验规则

# 3. 执行所有待办任务
rw run

# 4. 查看任务状态
rw list
```

## 核心文件

### `.rw/PROMPT.md` — 项目目标与原则

描述项目做什么、怎么做。每个 agent 启动时都会读取此文件作为上下文。

```markdown
# 项目目标
将 Cocos Creator 项目迁移到 Galacean Engine。

# 原则
- 保持与原项目视觉效果一致
- 优先使用 Galacean 原生 API
- 每个转换器独立可测试
```

### `.rw/TODO.md` — 任务列表

每个未完成项 = 一个独立的 worktree 任务。状态标记自动更新。

```markdown
# Tasks

- [ ] fix-camera-fov: 修复透视相机 FOV 转换，确保正交相机也能正确处理
- [ ] add-physics: 新增 RigidBody 和 Collider 的转换器
- [~] refactor-utils: 提取公共工具函数到 shared/utils.py
- [x] fix-shadow: 修复阴影类型映射错误
- [!] broken-task: 这个任务失败了
```

| 标记 | 含义 |
|------|------|
| `[ ]` | 待做 |
| `[~]` | 进行中 |
| `[x]` | 已完成 |
| `[!]` | 失败 |

### `.rw/RULES.md` — 经验沉淀

避免重蹈覆辙的规则。每个 agent 执行前都会读取。

```markdown
# Rules

- 修改 converter 后必须跑 pytest，上次忘了导致 CI 挂了
- 不要修改 shared/src/galacean-schema/ 下的类型定义，那是自动生成的
- FOV 转换要区分水平/垂直，Cocos 用水平 FOV，Galacean 用垂直 FOV
```

## 命令

### `rw init`

在当前 git 仓库初始化 `.rw/` 目录，自动添加到 `.git/info/exclude` 不被跟踪。

```bash
rw init
```

生成结构：
```
.rw/
├── PROMPT.md      # 项目目标与原则
├── TODO.md        # 任务列表
├── RULES.md       # 经验规则
├── specs/         # 补充规格（按需添加）
├── worktrees/     # worktree 工作目录（自动管理）
├── logs/          # 任务日志（自动生成）
└── state.json     # 运行状态（自动管理）
```

### `rw run [task]`

执行待办任务。每个任务在独立的 git worktree 中并行运行 Claude agent。

```bash
# 执行所有待办任务
rw run

# 只执行指定任务
rw run fix-camera-fov

# 指定基础分支（默认为当前分支）
rw run --base dev

# 调整最大循环次数（默认 20）和超时（默认 15 分钟）
rw run --max-loops 10 --timeout 30
```

### `rw list`

查看所有任务的状态表格。

```bash
rw list
# 别名
rw ls
```

### `rw add`

添加任务到 `TODO.md`。

```bash
rw add "fix-camera-fov: 修复透视相机 FOV 转换"
```

### `rw remove`

从 `TODO.md` 移除任务。

```bash
rw remove fix-camera-fov
# 别名
rw rm fix-camera-fov
```

### `rw clean`

清理所有 worktree 及其分支。

```bash
rw clean
```

### `rw merge`

将已完成任务的分支合并到目标分支。

```bash
# 合并到当前分支
rw merge

# 合并到指定分支
rw merge --into dev
```

## 工作原理

```
rw run
  │
  ├── 解析 .rw/TODO.md → 提取所有 [ ] 待办任务
  ├── 读取 .rw/PROMPT.md + .rw/RULES.md → 构建 agent 上下文
  │
  ├── 所有任务并行执行
  │   ├── task-a → git worktree add → Claude agent 循环
  │   ├── task-b → （并行）
  │   └── task-c → （并行）
  │
  ├── 每次 agent 循环：
  │   ├── 调用 claude --print 执行任务
  │   ├── 检测输出中的 RW_STATUS 状态块
  │   ├── 有变更时自动 git commit
  │   ├── 熔断器检测（3 次无进展 或 5 次相同错误 → 中断）
  │   └── 退出检测（COMPLETE / BLOCKED → 结束循环）
  │
  ├── 更新 TODO.md 状态标记
  └── 写入 .rw/logs/ 和 .rw/state.json
```

### 熔断机制

防止 agent 陷入死循环：

- **无进展熔断**：连续 3 次循环没有产生 git diff → 自动中断
- **重复错误熔断**：连续 5 次出现相同错误 → 自动中断
- **最大循环限制**：默认 20 次循环上限
- **单次超时**：默认 15 分钟

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 类型检查
npm run lint
```

## 许可证

MIT
