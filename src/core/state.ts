import fs from "node:fs";
import { statePath } from "./config.js";
import type { Task } from "./todo-parser.js";

export interface TaskState {
  name: string;
  status: Task["status"];
  branch: string;
  worktreePath: string;
  loops: number;
  maxLoops?: number;
  startedAt?: string;
  finishedAt?: string;
  mergedAt?: string;
  deletedAt?: string;
  summary?: string;
}

export interface RunState {
  startedAt: string;
  finishedAt?: string;
  tasks: TaskState[];
}

export function loadState(root: string): RunState {
  const p = statePath(root);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  return { startedAt: new Date().toISOString(), tasks: [] };
}

export function saveState(root: string, state: RunState): void {
  const p = statePath(root);
  fs.writeFileSync(p, JSON.stringify(state, null, 2));
}

export function updateTaskState(
  root: string,
  taskName: string,
  update: Partial<TaskState>
): void {
  const state = loadState(root);
  const idx = state.tasks.findIndex((t) => t.name === taskName);
  if (idx >= 0) {
    state.tasks[idx] = { ...state.tasks[idx], ...update };
  } else {
    state.tasks.push({
      name: taskName,
      status: "pending",
      branch: "",
      worktreePath: "",
      loops: 0,
      ...update,
    });
  }
  saveState(root, state);
}
