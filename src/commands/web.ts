import http from "node:http";
import chalk from "chalk";
import {
  startSSHTunnel,
  printTunnelInfo,
  createAuthCheck,
} from "../server/tunnel.js";

export interface WebOptions {
  port: number;
  tunnel: boolean;
  tunnelHost?: string;
  tunnelAuth?: string;
}

export async function webCommand(options: WebOptions): Promise<void> {
  const { port, tunnel, tunnelHost, tunnelAuth } = options;

  // Resolve auth password from option or env
  const password = tunnelAuth || process.env.RW_WEB_PASSWORD;
  const authCheck = password ? createAuthCheck(password) : null;

  // Create HTTP server (placeholder — full routes come from web-api-server task)
  const server = http.createServer((req, res) => {
    // Apply Basic Auth if configured (tunnel auth protects all routes)
    if (authCheck) {
      const authorized = authCheck(req.headers.authorization);
      if (!authorized) {
        res.writeHead(401, {
          "WWW-Authenticate": 'Basic realm="rw web"',
          "Content-Type": "text/plain",
        });
        res.end("Unauthorized");
        return;
      }
    }

    // Placeholder response — the web-api-server task provides full routing
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", message: "rw web server running" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on("error", reject);
  });

  console.log(
    chalk.green(`✓ Web server listening on http://localhost:${port}`)
  );

  // Start SSH tunnel if requested
  if (tunnel) {
    const host = tunnelHost;
    if (!host) {
      console.error(
        chalk.red(
          "Error: --tunnel requires --tunnel-host (e.g. --tunnel-host user@server.com)"
        )
      );
      server.close();
      process.exit(1);
    }

    console.log(
      chalk.dim(`Establishing SSH tunnel via ${host}...`)
    );

    try {
      const tunnelResult = await startSSHTunnel({
        localPort: port,
        tunnelHost: host,
      });

      printTunnelInfo(tunnelResult.url);

      if (password) {
        console.log(
          chalk.yellow(`  Auth enabled — user: rw, password: ${password}`)
        );
        console.log();
      }

      // Clean up on exit
      const cleanup = () => {
        tunnelResult.close();
        server.close();
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      // Keep process alive; SSH process exiting means tunnel dropped
      tunnelResult.process.on("exit", (code) => {
        console.log(
          chalk.yellow(`\nSSH tunnel disconnected (exit code: ${code})`)
        );
        server.close();
        process.exit(0);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Failed to establish tunnel: ${msg}`));
      server.close();
      process.exit(1);
    }
  } else {
    // No tunnel — just keep server running
    const cleanup = () => {
      server.close();
      process.exit(0);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }
}
