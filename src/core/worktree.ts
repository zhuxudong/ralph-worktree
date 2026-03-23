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

export async function cleanup(root: string, taskName: string): Promise<void> {
  const wtPath = path.join(worktreesDir(root), taskName);
  const branch = `rw/${taskName}`;

  try {
    await gitWorktreeRemove(wtPath, root);
  } catch {
    // may already be removed
    if (fs.existsSync(wtPath)) {
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  }

  await gitBranchDelete(branch, root);
}

export async function cleanupAll(root: string): Promise<string[]> {
  const wtDir = worktreesDir(root);
  if (!fs.existsSync(wtDir)) return [];

  const entries = fs.readdirSync(wtDir);
  const cleaned: string[] = [];

  for (const entry of entries) {
    await cleanup(root, entry);
    cleaned.push(entry);
  }

  return cleaned;
}
