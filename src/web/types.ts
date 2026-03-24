export interface Employee {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt?: string;
}

export interface Task {
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed" | "merged" | "deleted";
  assignee?: string;
}

export interface TaskState {
  name: string;
  status: "pending" | "running" | "done" | "failed" | "deleted" | "breaker";
  branch: string;
  worktreePath: string;
  loops: number;
  maxLoops?: number;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
  assignee?: string;
}

export interface RunState {
  startedAt: string;
  finishedAt?: string;
  tasks: TaskState[];
}

export interface SmartTaskResult {
  name: string;
  description: string;
}

export type TaskStatus = Task["status"];

// Status groups for display ordering
export const STATUS_ORDER: TaskStatus[] = ["running", "pending", "done", "merged", "failed"];

export const STATUS_LABELS: Record<string, string> = {
  running: "运行中",
  pending: "待做",
  done: "已完成",
  merged: "已合并",
  failed: "失败",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#8b949e",
  running: "#58a6ff",
  done: "#3fb950",
  merged: "#a371f7",
  failed: "#f85149",
};
