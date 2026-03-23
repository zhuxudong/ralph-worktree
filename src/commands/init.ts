import fs from "node:fs";
import path from "node:path";
import { rwDir, specsDir, worktreesDir, logsDir, memoryDir } from "../core/config.js";
import { gitRootDir, addToGitExclude } from "../utils/git.js";
import { logger } from "../utils/logger.js";

const TEMPLATES: Record<string, string> = {
  "PROMPT.md": `# 项目目标

在这里描述你的项目做什么、技术栈、架构等。每个 agent 启动时都会读取此文件作为上下文。

# 原则

- 原则 1
- 原则 2
`,
  "TODO.md": `# Tasks

- [ ] example-task: 用你的第一个任务替换这里的描述
`,
  "RULES.md": `# Rules

在这里添加经验规则，每个 agent 执行前都会读取。用来避免重蹈覆辙。

示例：
- 修改 converter 后必须跑 pytest
- 不要修改 shared/types/ 下的文件，那是自动生成的
`,
};

export async function initCommand(opts: { force?: boolean } = {}) {
  const root = await gitRootDir();
  const rw = rwDir(root);

  if (fs.existsSync(rw) && !opts.force) {
    logger.warn(".rw/ 目录已存在，跳过初始化。使用 --force 可重置模板文件。");
    return;
  }

  // Ensure directories
  fs.mkdirSync(rw, { recursive: true });
  fs.mkdirSync(specsDir(root), { recursive: true });
  fs.mkdirSync(worktreesDir(root), { recursive: true });
  fs.mkdirSync(logsDir(root), { recursive: true });
  fs.mkdirSync(memoryDir(root), { recursive: true });

  // Write templates (--force overwrites existing)
  for (const [file, content] of Object.entries(TEMPLATES)) {
    const filePath = path.join(rw, file);
    if (opts.force || !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  }

  const statePath = path.join(rw, "state.json");
  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(
      statePath,
      JSON.stringify({ startedAt: null, tasks: [] }, null, 2)
    );
  }

  await addToGitExclude(root, ".rw/");

  if (opts.force) {
    logger.success("已重置 .rw/ 模板文件（PROMPT.md、TODO.md、RULES.md）");
    logger.info("state.json、memory/、logs/ 已保留。");
  } else {
    logger.success("已初始化 .rw/ 目录");
    logger.info("编辑以下文件开始使用：");
    logger.info("  .rw/PROMPT.md  — 项目目标与原则");
    logger.info("  .rw/TODO.md    — 任务列表");
    logger.info("  .rw/RULES.md   — 经验规则");
  }
}
