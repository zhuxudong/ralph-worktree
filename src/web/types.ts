export interface Task {
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed" | "deleted";
}

export interface TaskState {
  name: string;
  status: "pending" | "running" | "done" | "failed" | "deleted" | "breaker";
  branch: string;
  worktreePath: string;
  loops: number;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
}

export interface RunState {
  startedAt: string;
  finishedAt?: string;
  tasks: TaskState[];
}
