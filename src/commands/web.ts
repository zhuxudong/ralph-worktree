import { startServer } from "../server/index.js";
import { ensureRwDir } from "../core/config.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface WebOptions {
  port?: number;
}

export async function webCommand(opts: WebOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const port = opts.port ?? 3700;

  startServer({ port });
}
