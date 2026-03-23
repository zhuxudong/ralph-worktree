import fs from "node:fs";
import path from "node:path";
import { ensureRwDir, memoryDir } from "../core/config.js";
import { cleanupAll } from "../core/worktree.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function cleanCommand() {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const cleaned = await cleanupAll(root);

  if (cleaned.length === 0) {
    logger.info("没有需要清理的 worktree。");
  } else {
    for (const name of cleaned) {
      logger.success(`已清理: ${name}`);
    }
    logger.info(`已清理 ${cleaned.length} 个 worktree。`);
  }

  // Clean memory
  const mDir = memoryDir(root);
  if (fs.existsSync(mDir)) {
    const files = fs.readdirSync(mDir).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      fs.unlinkSync(path.join(mDir, f));
    }
    if (files.length > 0) {
      logger.success(`已清理 ${files.length} 条 memory。`);
    }
  }
}
