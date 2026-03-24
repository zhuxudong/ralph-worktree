import fs from "node:fs";
import { todoPath, logsDir, ensureRwDir } from "../core/config.js";
import { parseTodo } from "../core/todo-parser.js";
import { runScheduler } from "../core/scheduler.js";
import { saveState, type RunState } from "../core/state.js";
import { gitRootDir, gitCurrentBranch } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface RunOptions {
  base?: string;
  maxLoops?: number;
  timeout?: number;
  task?: string;
}

export async function runCommand(taskName?: string, opts: RunOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  let tasks = parseTodo(content);

  if (taskName) {
    const task = tasks.find((t) => t.name === taskName);
    if (!task) {
      logger.error(`任务 "${taskName}" 未在 TODO.md 中找到`);
      process.exit(1);
    }
    if (task.status === "merged" || task.status === "deleted") {
      logger.error(`任务 "${taskName}" 状态为 ${task.status}，无法运行`);
      process.exit(1);
    }
    tasks = [task];
  }

  // Execute pending + running (interrupted) tasks; specific task also allows failed (retry)
  const runnable = tasks.filter((t) =>
    taskName
      ? ["pending", "running", "failed"].includes(t.status)
      : ["pending", "running"].includes(t.status)
  );
  if (runnable.length === 0) {
    logger.info("没有待执行的任务。");
    return;
  }

  const base = opts.base ?? (await gitCurrentBranch());
  const maxLoops = opts.maxLoops ?? 20;
  const timeoutMs = (opts.timeout ?? 15) * 60 * 1000;

  logger.info(
    `正在执行 ${runnable.length} 个任务，基础分支=${base}`
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
    tasks: runnable,
    base,
    maxLoops,
    timeoutMs,
  });

  const done = results.filter((r) => r.result.status === "done").length;
  const failed = results.filter((r) => r.result.status !== "done").length;

  logger.info("");
  logger.info("--- 执行摘要 ---");
  logger.success(`完成: ${done}`);
  if (failed > 0) logger.error(`失败: ${failed}`);

  for (const r of results) {
    const icon = r.result.status === "done" ? "+" : "-";
    logger.info(
      `  [${icon}] ${r.task.name}: ${r.result.status} (${r.result.loops} loops) ${r.result.summary ?? ""}`
    );
  }
}
