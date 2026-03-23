import fs from "node:fs";
import { todoPath, ensureRwDir } from "../core/config.js";
import { parseTodo } from "../core/todo-parser.js";
import { gitRootDir, gitMerge, gitCurrentBranch } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface MergeOptions {
  into?: string;
}

export async function mergeCommand(opts: MergeOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error(".rw/ not found. Run `rw init` first.");
    process.exit(1);
  }

  const into = opts.into ?? (await gitCurrentBranch());
  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  const tasks = parseTodo(content);

  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === 0) {
    logger.info("No completed tasks to merge.");
    return;
  }

  logger.info(`Merging ${doneTasks.length} completed branch(es) into ${into}`);

  for (const task of doneTasks) {
    const branch = `rw/${task.name}`;
    logger.info(`Merging ${branch}...`);

    const result = await gitMerge(branch, into, root);
    if (result.success) {
      logger.success(`Merged ${branch} into ${into}`);
    } else {
      logger.error(`Failed to merge ${branch}: ${result.error}`);
    }
  }
}
