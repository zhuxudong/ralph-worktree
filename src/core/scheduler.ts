import pLimit from "p-limit";
import type { Task } from "./todo-parser.js";
import { updateTaskStatus } from "./todo-parser.js";
import { provision, cleanup } from "./worktree.js";
import { runAgentLoop, type AgentLoopResult } from "./agent-loop.js";
import { updateTaskState } from "./state.js";
import { readPrompt, readRules, readSpecs, todoPath } from "./config.js";
import { logger } from "../utils/logger.js";

export interface SchedulerOptions {
  root: string;
  tasks: Task[];
  base: string;
  concurrency: number;
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
  const specs = readSpecs(root);

  let text = "";

  if (prompt) {
    text += `## Project Goal & Principles\n${prompt}\n\n`;
  }

  if (rules) {
    text += `## Rules (MUST follow)\n${rules}\n\n`;
  }

  if (specs) {
    text += `## Supplementary Specs\n${specs}\n\n`;
  }

  text += `## Current Task\n**${task.name}**: ${task.description}\n\n`;

  text += `## Requirements
1. Complete the task described above.
2. When finished, output a status block at the END of your response:
\`\`\`
---RW_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
EXIT_SIGNAL: true | false
SUMMARY: <one-line summary of what you did>
---END_RW_STATUS---
\`\`\`
3. Set EXIT_SIGNAL: true when all work is complete.
4. Set STATUS: BLOCKED if you encounter an unsolvable issue.
`;

  return text;
}

export async function runScheduler(
  opts: SchedulerOptions
): Promise<TaskResult[]> {
  const limit = pLimit(opts.concurrency);
  const results: TaskResult[] = [];

  const promises = opts.tasks.map((task) =>
    limit(async () => {
      const td = todoPath(opts.root);

      // Mark running
      updateTaskStatus(td, task.name, "running");
      updateTaskState(opts.root, task.name, {
        status: "running",
        branch: `rw/${task.name}`,
        startedAt: new Date().toISOString(),
      });

      logger.task(task.name, "Provisioning worktree...");

      let wtPath: string;
      try {
        wtPath = await provision(opts.root, task, opts.base);
      } catch (err: any) {
        logger.task(task.name, `Failed to provision worktree: ${err.message}`);
        updateTaskStatus(td, task.name, "failed");
        updateTaskState(opts.root, task.name, {
          status: "failed",
          finishedAt: new Date().toISOString(),
          summary: `Worktree provision failed: ${err.message}`,
        });
        results.push({
          task,
          result: { status: "failed", loops: 0, summary: err.message },
        });
        return;
      }

      updateTaskState(opts.root, task.name, { worktreePath: wtPath });
      logger.task(task.name, `Worktree ready at ${wtPath}`);

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

      logger.task(
        task.name,
        `Finished: ${result.status} (${result.loops} loops)`
      );
      results.push({ task, result });
    })
  );

  await Promise.all(promises);
  return results;
}
