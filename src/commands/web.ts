import { startServer } from "../server/index.js";
import { ensureRwDir } from "../core/config.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";
import {
  startSSHTunnel,
  printTunnelInfo,
} from "../server/tunnel.js";

export interface WebOptions {
  port?: number;
  tunnel?: boolean;
  tunnelHost?: string;
  tunnelAuth?: string;
}

export async function webCommand(opts: WebOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const port = opts.port ?? 3700;
  const server = startServer({ port, root });

  // Start SSH tunnel if requested
  if (opts.tunnel) {
    const host = opts.tunnelHost;
    if (!host) {
      logger.error("--tunnel 需要 --tunnel-host（如 --tunnel-host user@server.com）");
      server.close();
      process.exit(1);
    }

    logger.info(`正在建立 SSH 隧道（${host}）...`);

    try {
      const tunnelResult = await startSSHTunnel({
        localPort: port,
        tunnelHost: host,
      });

      printTunnelInfo(tunnelResult.url);

      const password = opts.tunnelAuth || process.env.RW_WEB_PASSWORD;
      if (password) {
        logger.info(`  Auth 已启用 — user: rw, password: ${password}`);
      }

      const cleanup = () => {
        tunnelResult.close();
        server.close();
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      tunnelResult.process.on("exit", (code) => {
        logger.warn(`SSH 隧道已断开（exit code: ${code}）`);
        server.close();
        process.exit(0);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`隧道建立失败: ${msg}`);
      server.close();
      process.exit(1);
    }
  } else {
    const cleanup = () => {
      server.close();
      process.exit(0);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }
}
