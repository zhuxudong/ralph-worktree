import fs from "node:fs";
import path from "node:path";
import { rwDir, specsDir, worktreesDir, logsDir } from "../core/config.js";
import { gitRootDir, addToGitExclude } from "../utils/git.js";
import { logger } from "../utils/logger.js";

const TEMPLATES: Record<string, string> = {
  "PROMPT.md": `# Project Goal

Describe your project's goal here.

# Principles

- Principle 1
- Principle 2
`,
  "TODO.md": `# Tasks

- [ ] example-task: Replace this with your first task description
`,
  "RULES.md": `# Rules

- Add rules and lessons learned here to prevent repeating mistakes
`,
};

export async function initCommand() {
  const root = await gitRootDir();
  const rw = rwDir(root);

  if (fs.existsSync(rw)) {
    logger.warn(".rw/ already exists. Skipping init.");
    return;
  }

  // Create directories
  fs.mkdirSync(rw, { recursive: true });
  fs.mkdirSync(specsDir(root), { recursive: true });
  fs.mkdirSync(worktreesDir(root), { recursive: true });
  fs.mkdirSync(logsDir(root), { recursive: true });

  // Write templates
  for (const [file, content] of Object.entries(TEMPLATES)) {
    fs.writeFileSync(path.join(rw, file), content);
  }

  // Initialize state.json
  fs.writeFileSync(
    path.join(rw, "state.json"),
    JSON.stringify({ startedAt: null, tasks: [] }, null, 2)
  );

  // Add .rw/ to git exclude
  await addToGitExclude(root, ".rw/");

  logger.success("Initialized .rw/ directory");
  logger.info("Edit these files to get started:");
  logger.info("  .rw/PROMPT.md  - Project goal & principles");
  logger.info("  .rw/TODO.md    - Task list");
  logger.info("  .rw/RULES.md   - Rules & lessons learned");
}
