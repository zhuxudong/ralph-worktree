import fs from "node:fs";
import chalk from "chalk";
import Table from "cli-table3";
import { todoPath, ensureRwDir } from "../core/config.js";
import { parseTodo, type Task } from "../core/todo-parser.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

const STATUS_DISPLAY: Record<Task["status"], string> = {
  pending: chalk.gray("[ ] pending"),
  running: chalk.cyan("[~] running"),
  done: chalk.green("[x] done"),
  failed: chalk.red("[!] failed"),
};

export async function listCommand() {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  const tasks = parseTodo(content);

  if (tasks.length === 0) {
    logger.info("TODO.md 中没有任务。");
    return;
  }

  const table = new Table({
    head: [
      chalk.bold("任务"),
      chalk.bold("状态"),
      chalk.bold("描述"),
    ],
    colWidths: [25, 18, 50],
    wordWrap: true,
  });

  for (const task of tasks) {
    table.push([task.name, STATUS_DISPLAY[task.status], task.description]);
  }

  console.log(table.toString());

  const counts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    running: tasks.filter((t) => t.status === "running").length,
    done: tasks.filter((t) => t.status === "done").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  logger.info(
    `总计: ${tasks.length} | 待做: ${counts.pending} | 进行中: ${counts.running} | 完成: ${counts.done} | 失败: ${counts.failed}`
  );
}
