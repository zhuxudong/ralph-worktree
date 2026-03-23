import fs from "node:fs";
import path from "node:path";
import { todoPath, memoryDir, ensureRwDir } from "../core/config.js";
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

  // Clean up worktree and branch
  try {
    await cleanup(root, name);
    logger.success(`已清理 worktree: ${name}`);
  } catch {
    // worktree may not exist
  }

  // Clean up memory
  const memFile = path.join(memoryDir(root), `${name}.md`);
  if (fs.existsSync(memFile)) {
    fs.unlinkSync(memFile);
    logger.success(`已清理 memory: ${name}`);
  }

  logger.success(`已移除任务: ${name}`);
}
