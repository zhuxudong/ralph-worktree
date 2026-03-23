import { todoPath, ensureRwDir } from "../core/config.js";
import { removeTask } from "../core/todo-parser.js";
import { cleanup } from "../core/worktree.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function removeCommand(name: string) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  removeTask(todoPath(root), name);

  const result = await cleanup(root, name);

  const parts: string[] = [];
  if (result.worktree) parts.push("worktree + 分支");
  if (result.memory) parts.push("memory");
  if (result.log) parts.push("log");

  if (parts.length > 0) {
    logger.success(`已清理: ${parts.join(", ")}`);
  }

  logger.success(`已移除任务: ${name}`);
}
