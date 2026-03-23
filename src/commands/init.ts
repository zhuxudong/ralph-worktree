import fs from "node:fs";
import path from "node:path";
import { rwDir, specsDir, worktreesDir, logsDir } from "../core/config.js";
import { gitRootDir, addToGitExclude } from "../utils/git.js";
import { logger } from "../utils/logger.js";

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname;

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

  // Copy templates
  for (const file of ["PROMPT.md", "TODO.md", "RULES.md"]) {
    const src = path.join(TEMPLATES_DIR, file);
    const dest = path.join(rw, file);
    fs.copyFileSync(src, dest);
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
