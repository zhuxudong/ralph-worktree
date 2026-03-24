import fs from "node:fs";
import path from "node:path";
import { rwDir, specsDir, worktreesDir, logsDir, memoryDir, employeesPath } from "../core/config.js";
import { gitRootDir, addToGitExclude } from "../utils/git.js";
import { logger } from "../utils/logger.js";
import PROJECT_CLAUDE_MD from "../prompts/project-claude.md";

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
  fs.mkdirSync(memoryDir(root), { recursive: true });

  for (const [file, content] of Object.entries(TEMPLATES)) {
    fs.writeFileSync(path.join(rw, file), content);
  }

  fs.writeFileSync(
    path.join(rw, "state.json"),
    JSON.stringify({ startedAt: null, tasks: [] }, null, 2)
  );

  fs.writeFileSync(employeesPath(root), JSON.stringify([], null, 2));

  await addToGitExclude(root, ".rw/");

  // Generate CLAUDE.md at project root (append if exists, create if not)
  const claudeMdPath = path.join(root, "CLAUDE.md");
  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, "utf-8");
    if (!existing.includes("多任务并发机制 (.rw/)")) {
      fs.appendFileSync(claudeMdPath, "\n" + PROJECT_CLAUDE_MD);
      logger.success("已在 CLAUDE.md 中追加 rw 工作流说明");
    }
  } else {
    fs.writeFileSync(claudeMdPath, PROJECT_CLAUDE_MD);
    logger.success("已生成 CLAUDE.md");
  }

  logger.success("已初始化 .rw/ 目录");
  logger.info("编辑以下文件开始使用：");
  logger.info("  .rw/PROMPT.md  — 项目目标与原则");
  logger.info("  .rw/TODO.md    — 任务列表");
  logger.info("  .rw/RULES.md   — 经验规则");
  logger.info("  .rw/specs/     — 复杂任务的详细需求（可选）");
}
