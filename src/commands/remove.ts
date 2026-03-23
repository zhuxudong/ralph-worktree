import { todoPath, ensureRwDir } from "../core/config.js";
import { removeTask } from "../core/todo-parser.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function removeCommand(name: string) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error(".rw/ not found. Run `rw init` first.");
    process.exit(1);
  }

  removeTask(todoPath(root), name);
  logger.success(`Removed task: ${name}`);
}
