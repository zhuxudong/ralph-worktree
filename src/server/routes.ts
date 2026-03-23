import fs from "node:fs";
import http from "node:http";
import { todoPath, logsDir, ensureRwDir } from "../core/config.js";
import { parseTodo, addTask, removeTask } from "../core/todo-parser.js";
import { loadState } from "../core/state.js";
import { gitRootDir, gitCurrentBranch } from "../utils/git.js";
import { runScheduler } from "../core/scheduler.js";
import { saveState, type RunState } from "../core/state.js";
import { cleanupAll } from "../core/worktree.js";
import { logger } from "../utils/logger.js";
import path from "node:path";

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function error(res: http.ServerResponse, message: string, status = 400) {
  json(res, { error: message }, status);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const method = req.method ?? "GET";
  const pathname = url.pathname;

  // Only handle /api/* routes
  if (!pathname.startsWith("/api/")) return false;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  const root = await gitRootDir();
  if (!ensureRwDir(root)) {
    error(res, "未找到 .rw/ 目录，请先运行 `rw init`。", 500);
    return true;
  }

  try {
    // GET /api/tasks
    if (method === "GET" && pathname === "/api/tasks") {
      const content = fs.readFileSync(todoPath(root), "utf-8");
      const tasks = parseTodo(content);
      json(res, tasks);
      return true;
    }

    // POST /api/tasks
    if (method === "POST" && pathname === "/api/tasks") {
      const body = JSON.parse(await readBody(req));
      const { name, description } = body;
      if (!name || !description) {
        error(res, "name 和 description 必填");
        return true;
      }
      addTask(todoPath(root), name, description);
      json(res, { ok: true }, 201);
      return true;
    }

    // DELETE /api/tasks/:name
    const deleteMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const name = decodeURIComponent(deleteMatch[1]);
      removeTask(todoPath(root), name);
      // Also try to clean up worktree (same as removeCommand)
      try {
        const { cleanup } = await import("../core/worktree.js");
        await cleanup(root, name);
      } catch {
        // worktree may not exist
      }
      // Clean up memory
      const { memoryDir } = await import("../core/config.js");
      const memFile = path.join(memoryDir(root), `${name}.md`);
      if (fs.existsSync(memFile)) fs.unlinkSync(memFile);
      json(res, { ok: true });
      return true;
    }

    // POST /api/run
    if (method === "POST" && pathname === "/api/run") {
      const content = fs.readFileSync(todoPath(root), "utf-8");
      const tasks = parseTodo(content);
      const pending = tasks.filter((t) => t.status === "pending");
      if (pending.length === 0) {
        json(res, { message: "没有待执行的任务" });
        return true;
      }
      const base = await gitCurrentBranch();
      const logDir = logsDir(root);
      logger.setTask(logDir, "scheduler");
      const runState: RunState = {
        startedAt: new Date().toISOString(),
        tasks: [],
      };
      saveState(root, runState);
      // Run async, respond immediately
      json(res, { message: `正在执行 ${pending.length} 个任务`, count: pending.length });
      runScheduler({ root, tasks: pending, base, maxLoops: 20, timeoutMs: 15 * 60 * 1000 }).catch(
        (err) => logger.error(`调度器错误: ${err.message}`)
      );
      return true;
    }

    // POST /api/run/:name
    const runMatch = pathname.match(/^\/api\/run\/([^/]+)$/);
    if (method === "POST" && runMatch) {
      const taskName = decodeURIComponent(runMatch[1]);
      const content = fs.readFileSync(todoPath(root), "utf-8");
      const tasks = parseTodo(content);
      const task = tasks.find((t) => t.name === taskName);
      if (!task) {
        error(res, `任务 "${taskName}" 未找到`, 404);
        return true;
      }
      if (task.status !== "pending") {
        error(res, `任务 "${taskName}" 状态为 ${task.status}，无法运行`);
        return true;
      }
      const base = await gitCurrentBranch();
      const logDir = logsDir(root);
      logger.setTask(logDir, "scheduler");
      const runState: RunState = {
        startedAt: new Date().toISOString(),
        tasks: [],
      };
      saveState(root, runState);
      // Run async, respond immediately
      json(res, { message: `正在执行任务: ${taskName}` });
      runScheduler({ root, tasks: [task], base, maxLoops: 20, timeoutMs: 15 * 60 * 1000 }).catch(
        (err) => logger.error(`调度器错误: ${err.message}`)
      );
      return true;
    }

    // POST /api/merge
    if (method === "POST" && pathname === "/api/merge") {
      const { mergeCommand } = await import("../commands/merge.js");
      // mergeCommand calls process.exit on errors, so we run it best-effort
      json(res, { message: "正在合并已完成分支" });
      mergeCommand({}).catch((err) => logger.error(`合并错误: ${err.message}`));
      return true;
    }

    // POST /api/clean
    if (method === "POST" && pathname === "/api/clean") {
      const cleaned = await cleanupAll(root);
      // Clean memory (same as cleanCommand)
      const { memoryDir } = await import("../core/config.js");
      const mDir = memoryDir(root);
      let memoryCount = 0;
      if (fs.existsSync(mDir)) {
        const files = fs.readdirSync(mDir).filter((f) => f.endsWith(".md"));
        for (const f of files) {
          fs.unlinkSync(path.join(mDir, f));
        }
        memoryCount = files.length;
      }
      json(res, { cleaned, memoryCleared: memoryCount });
      return true;
    }

    // GET /api/state
    if (method === "GET" && pathname === "/api/state") {
      const state = loadState(root);
      json(res, state);
      return true;
    }

    // GET /api/logs/:name
    const logsMatch = pathname.match(/^\/api\/logs\/([^/]+)$/);
    if (method === "GET" && logsMatch) {
      const name = decodeURIComponent(logsMatch[1]);
      const logFile = path.join(logsDir(root), `${name}.log`);
      if (!fs.existsSync(logFile)) {
        json(res, { logs: "" });
        return true;
      }
      const logs = fs.readFileSync(logFile, "utf-8");
      json(res, { logs });
      return true;
    }

    // 404 for unmatched /api/ routes
    error(res, "Not found", 404);
    return true;
  } catch (err: any) {
    error(res, err.message ?? "Internal server error", 500);
    return true;
  }
}
