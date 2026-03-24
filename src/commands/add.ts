import { todoPath, ensureRwDir } from "../core/config.js";
import { addTask } from "../core/todo-parser.js";
import { autoAssign } from "../core/employee.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function addCommand(
  input: string,
  opts: { assignee?: string; autoAssign?: boolean }
) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const colonIdx = input.indexOf(":");
  if (colonIdx === -1) {
    logger.error('格式：rw add "task-name: 描述"');
    process.exit(1);
  }

  const name = input.slice(0, colonIdx).trim();
  const description = input.slice(colonIdx + 1).trim();

  if (!name || !description) {
    logger.error('格式：rw add "task-name: 描述"');
    process.exit(1);
  }

  let assignee = opts.assignee;
  if (!assignee && opts.autoAssign !== false) {
    const matched = autoAssign(root, description);
    if (matched) {
      assignee = matched.id;
      logger.info(`自动指派: ${matched.name}（${matched.role}）`);
    }
  }

  addTask(todoPath(root), name, description, assignee);
  logger.success(`已添加任务: ${name}${assignee ? ` @${assignee}` : ""}`);
}
