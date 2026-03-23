import { ensureRwDir } from "../core/config.js";
import { cleanupAll } from "../core/worktree.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function cleanCommand() {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error(".rw/ not found. Run `rw init` first.");
    process.exit(1);
  }

  const cleaned = await cleanupAll(root);

  if (cleaned.length === 0) {
    logger.info("No worktrees to clean.");
  } else {
    for (const name of cleaned) {
      logger.success(`Cleaned: ${name}`);
    }
    logger.info(`Cleaned ${cleaned.length} worktree(s).`);
  }
}
