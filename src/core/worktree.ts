import path from "node:path";
import fs from "node:fs";
import { gitWorktreeAdd, gitWorktreeRemove, gitBranchDelete } from "../utils/git.js";
import { worktreesDir } from "./config.js";
import type { Task } from "./todo-parser.js";

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

export interface CleanupResult {
  name: string;
  worktree: boolean;
  log: boolean;
}

/**
 * Clean up worktree + branch + log for a task.
 * Memory is preserved (it's the task's historical record).
 */
export async function cleanup(root: string, taskName: string): Promise<CleanupResult> {
  const result: CleanupResult = { name: taskName, worktree: false, log: false };

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

  const { logsDir } = await import("./config.js");
  const logFile = path.join(logsDir(root), `${taskName}.log`);
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
    result.log = true;
  }

  return result;
}