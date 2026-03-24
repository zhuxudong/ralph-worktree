import fs from "node:fs";
import { todoPath, ensureRwDir } from "../core/config.js";
import { parseTodo, removeTask } from "../core/todo-parser.js";
import { updateTaskState } from "../core/state.js";
import { cleanup } from "../core/worktree.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function removeCommand(name: string) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  // Check task exists and status
  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  const tasks = parseTodo(content);
  const task = tasks.find((t) => t.name === name);

  if (!task) {
    logger.error(`任务 "${name}" 未找到`);
    process.exit(1);
  }

  if (task.status === "deleted") {
    logger.warn(`任务 "${name}" 已经被删除`);
    return;
  }

  if (task.status === "running") {
    logger.error(`任务 "${name}" 正在运行中，无法删除`);
    process.exit(1);
  }

  if (task.status === "done") {
    logger.error(`任务 "${name}" 已完成但未合并，请先运行 \`rw merge\``);
    process.exit(1);
  }

  // Allow: pending, merged, failed
  removeTask(td, name);
  updateTaskState(root, name, { status: "deleted", deletedAt: new Date().toISOString() });

  // Clean worktree + branch if still exists (e.g. failed tasks)
  const cleaned = await cleanup(root, name);
  if (cleaned.worktree) {
    logger.info(`  已清理 worktree + 分支`);
  }

  logger.success(`已删除任务: ${name}（软删除 [-]）`);
}
