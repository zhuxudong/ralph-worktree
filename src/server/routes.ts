import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { todoPath, logsDir, memoryDir, worktreesDir, ensureRwDir } from "../core/config.js";
import { parseTodo, addTask, removeTask, updateTaskStatus } from "../core/todo-parser.js";
import { loadEmployees, addEmployee as saveEmployee, removeEmployee as deleteEmployee, autoAssign } from "../core/employee.js";
import { loadState } from "../core/state.js";
import { gitRootDir, gitCurrentBranch } from "../utils/git.js";
import { runScheduler } from "../core/scheduler.js";
import { saveState, type RunState } from "../core/state.js";
import { logger } from "../utils/logger.js";

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
      const tasks = parseTodo(content).filter((t) => t.status !== "deleted");
      json(res, tasks);
      return true;
    }

    // POST /api/tasks
    if (method === "POST" && pathname === "/api/tasks") {
      const body = JSON.parse(await readBody(req));
      const { name, description, assignee } = body;
      if (!name || !description) {
        error(res, "name 和 description 必填");
        return true;
      }
      addTask(todoPath(root), name, description, assignee);
      json(res, { ok: true }, 201);
      return true;
    }

    // POST /api/tasks/smart — AI parse natural language into task
    if (method === "POST" && pathname === "/api/tasks/smart") {
      const body = JSON.parse(await readBody(req));
      const { input } = body;
      if (!input || typeof input !== "string" || !input.trim()) {
        error(res, "input 必填");
        return true;
      }
      // Try manual format first: task-name: description
      const colonIdx = input.indexOf(":");
      if (colonIdx > 0) {
        const namePart = input.slice(0, colonIdx).trim();
        // If it looks like a valid task name (no spaces, kebab-case)
        if (/^[a-z0-9][a-z0-9-]*$/.test(namePart)) {
          const desc = input.slice(colonIdx + 1).trim();
          if (desc) {
            json(res, { name: namePart, description: desc });
            return true;
          }
        }
      }
      // AI parsing: use claude to extract task name and description
      try {
        const result = await parseTaskWithAI(input);
        json(res, result);
      } catch (err: any) {
        error(res, `AI 解析失败: ${err.message}`, 500);
      }
      return true;
    }

    // POST /api/tasks/:name/retry — reset failed task to pending and re-run
    const retryMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);
    if (method === "POST" && retryMatch) {
      const taskName = decodeURIComponent(retryMatch[1]);
      const content = fs.readFileSync(todoPath(root), "utf-8");
      const tasks = parseTodo(content);
      const task = tasks.find((t) => t.name === taskName);
      if (!task) {
        error(res, `任务 "${taskName}" 未找到`, 404);
        return true;
      }
      if (task.status !== "failed") {
        error(res, `任务 "${taskName}" 状态为 ${task.status}，只有失败任务可以重试`);
        return true;
      }
      // Reset to pending
      updateTaskStatus(todoPath(root), taskName, "pending");
      // Run it
      const base = await gitCurrentBranch();
      const logDir = logsDir(root);
      logger.setTask(logDir, "scheduler");
      const runState: RunState = {
        startedAt: new Date().toISOString(),
        tasks: [],
      };
      saveState(root, runState);
      json(res, { message: `正在重试任务: ${taskName}` });
      runScheduler({
        root,
        tasks: [{ ...task, status: "pending" }],
        base,
        maxLoops: 20,
        timeoutMs: 15 * 60 * 1000,
      }).catch((err) => logger.error(`调度器错误: ${err.message}`));
      return true;
    }

    // DELETE /api/tasks/:name (soft delete)
    const deleteMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const name = decodeURIComponent(deleteMatch[1]);
      removeTask(todoPath(root), name);
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
      json(res, { message: "正在合并已完成分支" });
      mergeCommand({}).catch((err) => logger.error(`合并错误: ${err.message}`));
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

    // GET /api/diff/:name — git diff for task branch vs base
    const diffMatch = pathname.match(/^\/api\/diff\/([^/]+)$/);
    if (method === "GET" && diffMatch) {
      const taskName = decodeURIComponent(diffMatch[1]);
      const branch = `rw/${taskName}`;
      try {
        const { execaCommand } = await import("execa");
        const base = await gitCurrentBranch();
        const result = await execaCommand(`git diff ${base}...${branch}`, { cwd: root });
        json(res, { diff: result.stdout });
      } catch (err: any) {
        error(res, `无法获取 diff: ${err.message}`, 500);
      }
      return true;
    }

    // GET /api/memory/:name — memory content for a task
    const memoryMatch = pathname.match(/^\/api\/memory\/([^/]+)$/);
    if (method === "GET" && memoryMatch) {
      const taskName = decodeURIComponent(memoryMatch[1]);
      const memDir = memoryDir(root);
      const taskMemDir = path.join(memDir, taskName);
      const memories: Record<string, string> = {};

      if (fs.existsSync(taskMemDir) && fs.statSync(taskMemDir).isDirectory()) {
        for (const file of fs.readdirSync(taskMemDir)) {
          if (file.endsWith(".md")) {
            memories[file] = fs.readFileSync(path.join(taskMemDir, file), "utf-8");
          }
        }
      }

      // Also check CLAUDE.md in the worktree for context
      const wtDir = path.join(worktreesDir(root), taskName);
      const claudeMd = path.join(wtDir, "CLAUDE.md");
      if (fs.existsSync(claudeMd)) {
        memories["CLAUDE.md"] = fs.readFileSync(claudeMd, "utf-8");
      }

      json(res, { memories });
      return true;
    }

    // GET /api/employees
    if (method === "GET" && pathname === "/api/employees") {
      const employees = loadEmployees(root);
      json(res, employees);
      return true;
    }

    // POST /api/employees
    if (method === "POST" && pathname === "/api/employees") {
      const body = JSON.parse(await readBody(req));
      const { id, name, role, description, systemPrompt } = body;
      if (!id || !name || !role || !description) {
        error(res, "id, name, role, description 必填");
        return true;
      }
      saveEmployee(root, { id, name, role, description, systemPrompt });
      json(res, { ok: true }, 201);
      return true;
    }

    // DELETE /api/employees/:id
    const employeeDeleteMatch = pathname.match(/^\/api\/employees\/([^/]+)$/);
    if (method === "DELETE" && employeeDeleteMatch) {
      const id = decodeURIComponent(employeeDeleteMatch[1]);
      const removed = deleteEmployee(root, id);
      if (!removed) {
        error(res, `员工 "${id}" 未找到`, 404);
        return true;
      }
      json(res, { ok: true });
      return true;
    }

    // POST /api/employees/auto-assign — suggest employee for a task description
    if (method === "POST" && pathname === "/api/employees/auto-assign") {
      const body = JSON.parse(await readBody(req));
      const { description } = body;
      if (!description) {
        error(res, "description 必填");
        return true;
      }
      const employee = autoAssign(root, description);
      json(res, { employee: employee ?? null });
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

// AI task parsing using claude CLI
async function parseTaskWithAI(input: string): Promise<{ name: string; description: string }> {
  const { execa } = await import("execa");
  const prompt = `You are a task name generator. Given a natural language description of a task, extract a short kebab-case task name and a concise description. Respond ONLY in JSON format: {"name": "task-name", "description": "description text"}. No other text.

User input: ${input}`;

  const result = await execa("claude", ["--print", prompt, "--output-format", "text", "--max-turns", "1"], {
    timeout: 30_000,
    stdin: "ignore",
  });

  const output = result.stdout.trim();
  // Extract JSON from the output
  const jsonMatch = output.match(/\{[^}]+\}/);
  if (!jsonMatch) {
    throw new Error("AI 返回格式错误");
  }
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.name || !parsed.description) {
    throw new Error("AI 返回缺少 name 或 description");
  }
  return { name: parsed.name, description: parsed.description };
}
