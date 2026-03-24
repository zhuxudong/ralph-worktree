import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handleRequest } from "./routes.js";
import { handleEvents, handleLogStream } from "./sse.js";
import { Watcher } from "./watcher.js";
import { logger } from "../utils/logger.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(
  res: http.ServerResponse,
  staticDir: string,
  pathname: string
): void {
  // Default to index.html for SPA routing
  let filePath = path.join(staticDir, pathname === "/" ? "index.html" : pathname);

  // Security: prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(staticDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    // SPA fallback: serve index.html for non-file routes
    filePath = path.join(staticDir, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

export interface ServerOptions {
  port: number;
  root: string;
}

export function startServer(opts: ServerOptions): http.Server {
  const { port, root } = opts;
  const staticDir = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "web"
  );

  const watcher = new Watcher(root);
  watcher.start(2000);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // SSE endpoints
    if (req.method === "GET" && pathname === "/api/events") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      handleEvents(req, res, watcher);
      return;
    }

    const logStreamMatch = pathname.match(/^\/api\/logs\/([^/]+)\/stream$/);
    if (req.method === "GET" && logStreamMatch) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      handleLogStream(req, res, watcher, decodeURIComponent(logStreamMatch[1]));
      return;
    }

    // Try API routes
    const handled = await handleRequest(req, res);
    if (handled) return;

    // Serve static files
    serveStatic(res, staticDir, url.pathname);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    logger.success(`Web 看板已启动: ${url}`);

    // Auto open browser
    import("child_process").then(({ exec }) => {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      exec(`${cmd} ${url}`);
    });
  });

  return server;
}
