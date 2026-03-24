# ralph-worktree

多任务并行自治开发工具，基于 git worktree 隔离 + Claude Code 自主执行。

用户只需关注几个文件（`PROMPT.md`、`TODO.md`、`RULES.md`、`specs/`），工具自动完成任务调度、worktree 管理和 agent 循环。

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

# 2. 编辑核心文件
#    .rw/PROMPT.md  — 项目目标与原则
#    .rw/TODO.md    — 任务列表
#    .rw/RULES.md   — 经验规则
#    .rw/specs/     — 复杂任务的详细需求（可选，同名文件自动关联）

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

| 标记 | 含义 | 可执行操作 |
|------|------|------------|
| `[ ]` | 待做 | `run`, `remove` |
| `[~]` | 进行中 | — |
| `[x]` | 已完成 | `merge` |
| `[✓]` | 已合并（worktree 已清理）| `remove` |
| `[!]` | 失败 | `remove` |
| `[-]` | 已删除（软删除）| — |

任务生命周期：`[ ] → [~] → [x] → [✓] → [-]`

### `.rw/RULES.md` — 经验沉淀

避免重蹈覆辙的规则。每个 agent 执行前都会读取。

```markdown
# Rules

- 修改 converter 后必须跑 pytest，上次忘了导致 CI 挂了
- 不要修改 shared/src/galacean-schema/ 下的类型定义，那是自动生成的
- FOV 转换要区分水平/垂直，Cocos 用水平 FOV，Galacean 用垂直 FOV
```

### `.rw/specs/` — 任务详细需求

TODO.md 中的描述只有一行，对于复杂任务，可以在 `specs/` 下创建同名 `.md` 文件，支持任意长度的图文描述。

```markdown
TODO.md:
- [ ] fix-camera-fov: 修复透视相机 FOV 转换

specs/fix-camera-fov.md:  ← 同名文件，自动关联
# 修复透视相机 FOV 转换

## 背景
Cocos 使用水平 FOV，Galacean 使用垂直 FOV，需要根据宽高比进行换算...

## 具体要求
1. 透视相机：horizontalFOV → verticalFOV
2. 正交相机：保持 size 不变
...
```

- `specs/<task-name>.md` 会作为**任务专属 spec** 注入到对应 agent
- `specs/` 下的其他文件会作为**全局 spec** 注入到所有 agent
- 不存在同名文件则跳过，不影响简单任务

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
├── specs/         # 任务详细需求（按需添加，同名文件自动关联任务）
├── memory/        # 已完成任务的摘要（自动生成，供后续任务感知）
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

软删除任务（标记为 `[-]`）。只允许对 `pending`/`merged`/`failed` 状态的任务操作，`done` 的任务需要先 `merge`。`rw list` 自动隐藏已删除任务。

```bash
rw remove fix-camera-fov
# 别名
rw rm fix-camera-fov
```

### `rw merge`

将已完成（`[x]`）任务的分支合并到目标分支。合并成功后自动清理 worktree 和分支，状态变为 `[✓]`。遇到冲突时自动调用 Claude agent 解决。

```bash
# 合并到当前分支
rw merge

# 合并到指定分支
rw merge --into dev
```

### `rw web`

启动 web 可视化看板，提供任务管理的 Web UI（类似 GitHub Projects 看板）。

```bash
# 启动 web 看板（默认端口 3700）
rw web

# 自定义端口
rw web --port 8080

# 启用 SSH 隧道（手机远程访问）
rw web --tunnel --tunnel-host user@server.com

# 启用 HTTP Basic Auth
rw web --tunnel --tunnel-host user@server.com --tunnel-auth mypassword
```

功能：
- 单列分组列表（运行中 → 待做 → 已完成 → 已合并 → 失败），按状态分组可折叠
- 任务卡片支持折叠/展开，运行中任务自动展开显示实时日志
- 右键上下文菜单，根据任务状态动态显示可用操作（运行、删除、合并、重试、查看日志/Diff/Memory）
- 智能添加任务：支持自然语言输入，后端调用 Claude 自动提取任务名和描述（也支持 `task-name: 描述` 快捷格式）
- SSE 实时推送任务状态变更和日志流
- Diff 查看器：查看任务分支相对基准的代码变更
- Memory 查看器：查看任务的上下文记忆
- SSH 反向隧道支持手机端远程访问
- 深色主题（GitHub Dark 风格）

API 端点：
```
GET    /api/tasks          — 任务列表
POST   /api/tasks          — 添加任务
POST   /api/tasks/smart    — AI 解析自然语言为任务
DELETE /api/tasks/:name    — 删除任务
POST   /api/tasks/:name/retry — 重试失败任务
POST   /api/run            — 执行所有待办任务
POST   /api/run/:name      — 执行指定任务
POST   /api/merge          — 合并已完成分支
GET    /api/state           — 运行状态
GET    /api/logs/:name     — 任务日志
GET    /api/diff/:name     — 任务分支 diff
GET    /api/memory/:name   — 任务 memory
GET    /api/events         — SSE 事件流
GET    /api/logs/:name/stream — SSE 日志流
```

开发模式：
```bash
# 终端 1: API server
rw web

# 终端 2: Vite dev server（前端热更新）
npm run dev:web
```

## 工作原理

```
rw run
  │
  ├── 解析 .rw/TODO.md → 提取所有 [ ] 待办任务
  ├── 读取 PROMPT.md + RULES.md + specs/ + memory/ → 构建 agent 上下文
  │   └── specs/<task-name>.md 自动关联为任务专属需求
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
  ├── 任务完成 → 写入 .rw/memory/<task-name>.md（供后续任务感知）
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
