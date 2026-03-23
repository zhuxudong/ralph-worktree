import { ensureRwDir } from "../core/config.js";
import { cleanupAll, type CleanupResult } from "../core/worktree.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

function logResult(r: CleanupResult): void {
  const parts: string[] = [];
  if (r.worktree) parts.push("worktree + 分支");
  if (r.memory) parts.push("memory");
  if (r.log) parts.push("log");
  if (parts.length > 0) {
    logger.success(`已清理 ${r.name}: ${parts.join(", ")}`);
  }
}

export async function cleanCommand() {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const results = await cleanupAll(root);
  const hasContent = results.some((r) => r.worktree || r.memory || r.log);

  if (!hasContent) {
    logger.info("没有需要清理的内容。");
    return;
  }

  for (const r of results) {
    logResult(r);
  }
}
