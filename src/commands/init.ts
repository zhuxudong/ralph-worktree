import fs from "node:fs";
import path from "node:path";
import { rwDir, specsDir, worktreesDir, logsDir } from "../core/config.js";
import { gitRootDir, addToGitExclude } from "../utils/git.js";
import { logger } from "../utils/logger.js";

const TEMPLATES: Record<string, string> = {
  "PROMPT.md": `# 项目目标

在这里描述你的项目目标。

# 原则

- 原则 1
- 原则 2
`,
  "TODO.md": `# Tasks

- [ ] example-task: 用你的第一个任务替换这里的描述
`,
  "RULES.md": `# Rules

- 在这里添加经验规则，避免重蹈覆辙
`,
};

export async function initCommand() {
  const root = await gitRootDir();
  const rw = rwDir(root);

  if (fs.existsSync(rw)) {
    logger.warn(".rw/ 目录已存在，跳过初始化。");
    return;
  }

  fs.mkdirSync(rw, { recursive: true });
  fs.mkdirSync(specsDir(root), { recursive: true });
  fs.mkdirSync(worktreesDir(root), { recursive: true });
  fs.mkdirSync(logsDir(root), { recursive: true });

  for (const [file, content] of Object.entries(TEMPLATES)) {
    fs.writeFileSync(path.join(rw, file), content);
  }

  fs.writeFileSync(
    path.join(rw, "state.json"),
    JSON.stringify({ startedAt: null, tasks: [] }, null, 2)
  );

  await addToGitExclude(root, ".rw/");

  logger.success("已初始化 .rw/ 目录");
  logger.info("编辑以下文件开始使用：");
  logger.info("  .rw/PROMPT.md  — 项目目标与原则");
  logger.info("  .rw/TODO.md    — 任务列表");
  logger.info("  .rw/RULES.md   — 经验规则");
}
