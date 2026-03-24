import { todoPath, ensureRwDir } from "../core/config.js";
import { removeTask } from "../core/todo-parser.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function removeCommand(name: string) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  removeTask(todoPath(root), name);

  logger.success(`已删除任务: ${name}（软删除，标记为 [-]）`);
}
