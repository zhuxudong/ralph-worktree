import path from "node:path";
import fs from "node:fs";
import { gitWorktreeAdd, gitWorktreeRemove, gitBranchDelete } from "../utils/git.js";
import { worktreesDir, memoryDir, logsDir } from "./config.js";
import type { Task } from "./todo-parser.js";

export interface CleanupResult {
  name: string;
  worktree: boolean;
  memory: boolean;
  log: boolean;
}

export async function provision(
  root: string,
  task: Task,
  base: string
): Promise<string> {
  const wtDir = worktreesDir(root);
  fs.mkdirSync(wtDir, { recursive: true });

  const wtPath = path.join(wtDir, task.name);
  const branch = `rw/${task.name}`;

  // Remove existing worktree if present
  if (fs.existsSync(wtPath)) {
    try {
      await gitWorktreeRemove(wtPath, root);
    } catch {
      // force remove directory
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
    // Also delete the branch so we can recreate
    await gitBranchDelete(branch, root);
  }

  await gitWorktreeAdd(wtPath, branch, base, root);
  return path.resolve(root, wtPath);
}

export async function cleanup(root: string, taskName: string): Promise<CleanupResult> {
  const result: CleanupResult = { name: taskName, worktree: false, memory: false, log: false };

  // Worktree + branch
  const wtPath = path.join(worktreesDir(root), taskName);
  if (fs.existsSync(wtPath)) {
    try {
      await gitWorktreeRemove(wtPath, root);
    } catch {
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
    result.worktree = true;
  }
  await gitBranchDelete(`rw/${taskName}`, root);

  // Memory
  const memFile = path.join(memoryDir(root), `${taskName}.md`);
  if (fs.existsSync(memFile)) {
    fs.unlinkSync(memFile);
    result.memory = true;
  }

  // Log
  const logFile = path.join(logsDir(root), `${taskName}.log`);
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
    result.log = true;
  }

  return result;
}

export async function cleanupAll(root: string): Promise<CleanupResult[]> {
  // Collect all task names from worktrees, memory, and logs
  const names = new Set<string>();

  const wtDir = worktreesDir(root);
  if (fs.existsSync(wtDir)) {
    for (const entry of fs.readdirSync(wtDir)) {
      names.add(entry);
    }
  }

  const mDir = memoryDir(root);
  if (fs.existsSync(mDir)) {
    for (const f of fs.readdirSync(mDir).filter((f) => f.endsWith(".md"))) {
      names.add(f.replace(".md", ""));
    }
  }

  const lDir = logsDir(root);
  if (fs.existsSync(lDir)) {
    for (const f of fs.readdirSync(lDir).filter((f) => f.endsWith(".log"))) {
      names.add(f.replace(".log", ""));
    }
  }

  const results: CleanupResult[] = [];
  for (const name of names) {
    results.push(await cleanup(root, name));
  }
  return results;
}
