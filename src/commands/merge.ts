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
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const into = opts.into ?? (await gitCurrentBranch());
  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  const tasks = parseTodo(content);

  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === 0) {
    logger.info("没有已完成的任务可合并。");
    return;
  }

  logger.info(`正在将 ${doneTasks.length} 个已完成分支合并到 ${into}`);

  for (const task of doneTasks) {
    const branch = `rw/${task.name}`;
    logger.info(`正在合并 ${branch}...`);

    const result = await gitMerge(branch, into, root);
    if (result.success) {
      logger.success(`已合并 ${branch} 到 ${into}`);
    } else {
      logger.error(`合并 ${branch} 失败: ${result.error}`);
    }
  }
}
