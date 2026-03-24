import type { Task } from "./todo-parser.js";
import { updateTaskStatus } from "./todo-parser.js";
import { provision } from "./worktree.js";
import { runAgentLoop, type AgentLoopResult } from "./agent-loop.js";
import { updateTaskState } from "./state.js";
import { readPrompt, readRules, readSpecs, readTaskSpec, readMemory, memoryDir, todoPath } from "./config.js";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import SYSTEM_INSTRUCTIONS from "../prompts/system.md";

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

function buildPrompt(root: string, task: Task): string {
  const prompt = readPrompt(root);
  const rules = readRules(root);
  const taskSpec = readTaskSpec(root, task.name);
  const globalSpecs = readSpecs(root, task.name);

  let text = SYSTEM_INSTRUCTIONS + "\n";

  if (prompt) {
    text += `## Project Goal & Principles\n${prompt}\n\n`;
  }

  if (rules) {
    text += `## Rules (MUST follow)\n${rules}\n\n`;
  }

  if (globalSpecs) {
    text += `## Supplementary Specs\n${globalSpecs}\n\n`;
  }

  const memory = readMemory(root);
  if (memory) {
    text += `## Completed Tasks (for context)\n${memory}\n\n`;
  }

  text += `## Current Task\n**${task.name}**: ${task.description}\n`;

  if (taskSpec) {
    text += `\n## Task Spec (详细需求)\n${taskSpec}\n`;
  }

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
        status: finalStatus,
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
