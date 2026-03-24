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