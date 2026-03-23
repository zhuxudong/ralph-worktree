import type { Task } from "./todo-parser.js";
import { updateTaskStatus } from "./todo-parser.js";
import { provision } from "./worktree.js";
import { runAgentLoop, type AgentLoopResult } from "./agent-loop.js";
import { updateTaskState } from "./state.js";
import { readPrompt, readRules, readSpecs, readMemory, memoryDir, todoPath } from "./config.js";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";

export interface SchedulerOptions {
  root: string;
  tasks: Task[];
  base: string;
  maxLoops: number;
  timeoutMs: number;
}

export interface TaskResult {
  task: Task;
  result: AgentLoopResult;
}

const SYSTEM_INSTRUCTIONS = `## System Instructions (ralph-worktree internal)

你是一个由 ralph-worktree 调度的自治 agent，在独立的 git worktree 中执行任务。

### Git 行为
- 你的代码变更会被自动 commit 到本地的 \`rw/<task-name>\` 分支
- 不会自动 push 到远程，所有工作都在本地完成
- 不需要关心远程分支、PR 或 push 操作

### Memory（已完成任务的上下文）
- 如果下方存在 "Completed Tasks" 部分，说明之前有其他 agent 完成了任务
- 当你的任务与之前的任务有关联时（如依赖其产出、修改相同模块），请关注这些上下文
- 如果你的任务是独立的，可以忽略

### 任务完成协议
每次完成工作后，必须在回复末尾输出状态块：
\`\`\`
---RW_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
EXIT_SIGNAL: true | false
SUMMARY: <一句话总结你做了什么，写清楚改了哪些文件>
---END_RW_STATUS---
\`\`\`
- EXIT_SIGNAL: true 表示任务已全部完成
- STATUS: BLOCKED 表示遇到无法解决的问题
`;

function buildPrompt(root: string, task: Task): string {
  const prompt = readPrompt(root);
  const rules = readRules(root);
  const specs = readSpecs(root);

  let text = SYSTEM_INSTRUCTIONS + "\n";

  if (prompt) {
    text += `## Project Goal & Principles\n${prompt}\n\n`;
  }

  if (rules) {
    text += `## Rules (MUST follow)\n${rules}\n\n`;
  }

  if (specs) {
    text += `## Supplementary Specs\n${specs}\n\n`;
  }

  const memory = readMemory(root);
  if (memory) {
    text += `## Completed Tasks (for context)\n${memory}\n\n`;
  }

  text += `## Current Task\n**${task.name}**: ${task.description}\n`;

  return text;
}

export async function runScheduler(
  opts: SchedulerOptions
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];

  const promises = opts.tasks.map((task) =>
    (async () => {
      const td = todoPath(opts.root);

      // Mark running
      updateTaskStatus(td, task.name, "running");
      updateTaskState(opts.root, task.name, {
        status: "running",
        branch: `rw/${task.name}`,
        startedAt: new Date().toISOString(),
      });

      logger.task(task.name, "正在创建 worktree...");

      let wtPath: string;
      try {
        wtPath = await provision(opts.root, task, opts.base);
      } catch (err: any) {
        logger.task(task.name, `创建 worktree 失败: ${err.message}`);
        updateTaskStatus(td, task.name, "failed");
        updateTaskState(opts.root, task.name, {
          status: "failed",
          finishedAt: new Date().toISOString(),
          summary: `worktree 创建失败: ${err.message}`,
        });
        results.push({
          task,
          result: { status: "failed", loops: 0, summary: err.message },
        });
        return;
      }

      updateTaskState(opts.root, task.name, { worktreePath: wtPath });
      logger.task(task.name, `worktree 就绪: ${wtPath}`);

      const prompt = buildPrompt(opts.root, task);
      const result = await runAgentLoop({
        cwd: wtPath,
        prompt,
        taskName: task.name,
        maxLoops: opts.maxLoops,
        timeoutMs: opts.timeoutMs,
      });

      // Update status
      const finalStatus = result.status === "done" ? "done" : "failed";
      updateTaskStatus(td, task.name, finalStatus);
      updateTaskState(opts.root, task.name, {
        status: result.status,
        loops: result.loops,
        finishedAt: new Date().toISOString(),
        summary: result.summary,
      });

      // Write memory for completed tasks
      if (result.status === "done" && result.summary) {
        const mDir = memoryDir(opts.root);
        fs.mkdirSync(mDir, { recursive: true });
        fs.writeFileSync(
          path.join(mDir, `${task.name}.md`),
          result.summary
        );
      }

      logger.task(
        task.name,
        `已完成: ${result.status}（${result.loops} 次循环）`
      );
      results.push({ task, result });
    })()
  );

  await Promise.all(promises);
  return results;
}
