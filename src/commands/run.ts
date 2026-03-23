import fs from "node:fs";
import { todoPath, logsDir, ensureRwDir } from "../core/config.js";
import { parseTodo } from "../core/todo-parser.js";
import { runScheduler } from "../core/scheduler.js";
import { saveState, type RunState } from "../core/state.js";
import { gitRootDir, gitCurrentBranch } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface RunOptions {
  base?: string;
  concurrency?: number;
  maxLoops?: number;
  timeout?: number;
  task?: string;
}

export async function runCommand(taskName?: string, opts: RunOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error(".rw/ not found. Run `rw init` first.");
    process.exit(1);
  }

  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  let tasks = parseTodo(content);

  // Filter by task name if specified
  if (taskName) {
    tasks = tasks.filter((t) => t.name === taskName);
    if (tasks.length === 0) {
      logger.error(`Task "${taskName}" not found in TODO.md`);
      process.exit(1);
    }
  }

  // Only run pending tasks
  const pending = tasks.filter((t) => t.status === "pending");
  if (pending.length === 0) {
    logger.info("No pending tasks to run.");
    return;
  }

  const base = opts.base ?? (await gitCurrentBranch());
  const concurrency = opts.concurrency ?? 3;
  const maxLoops = opts.maxLoops ?? 20;
  const timeoutMs = (opts.timeout ?? 15) * 60 * 1000;

  logger.info(
    `Running ${pending.length} task(s) with concurrency=${concurrency}, base=${base}`
  );

  // Setup logs
  const logDir = logsDir(root);
  logger.setTask(logDir, "scheduler");

  // Initialize run state
  const runState: RunState = {
    startedAt: new Date().toISOString(),
    tasks: [],
  };
  saveState(root, runState);

  const results = await runScheduler({
    root,
    tasks: pending,
    base,
    concurrency,
    maxLoops,
    timeoutMs,
  });

  // Summary
  const done = results.filter((r) => r.result.status === "done").length;
  const failed = results.filter((r) => r.result.status !== "done").length;

  logger.info("");
  logger.info("--- Run Summary ---");
  logger.success(`Done: ${done}`);
  if (failed > 0) logger.error(`Failed: ${failed}`);

  for (const r of results) {
    const icon = r.result.status === "done" ? "+" : "-";
    logger.info(
      `  [${icon}] ${r.task.name}: ${r.result.status} (${r.result.loops} loops) ${r.result.summary ?? ""}`
    );
  }
}
