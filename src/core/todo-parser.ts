import fs from "node:fs";

export interface Task {
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed" | "merged";
}

const STATUS_MAP: Record<string, Task["status"]> = {
  " ": "pending",
  "~": "running",
  x: "done",
  "!": "failed",
  "✓": "merged",
};

const REVERSE_STATUS: Record<Task["status"], string> = {
  pending: " ",
  running: "~",
  done: "x",
  failed: "!",
  merged: "✓",
};

const TASK_RE = /^- \[([x ~!✓])\] (\S+?):\s*(.+)$/;

export function parseTodo(content: string): Task[] {
  const tasks: Task[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(TASK_RE);
    if (match) {
      const [, marker, name, description] = match;
      tasks.push({
        name,
        description: description.trim(),
        status: STATUS_MAP[marker] ?? "pending",
      });
    }
  }
  return tasks;
}

export function updateTaskStatus(
  todoPath: string,
  taskName: string,
  status: Task["status"]
): void {
  const content = fs.readFileSync(todoPath, "utf-8");
  const marker = REVERSE_STATUS[status];
  const lines = content.split("\n");
  const updated = lines.map((line) => {
    const match = line.match(TASK_RE);
    if (match && match[2] === taskName) {
      return `- [${marker}] ${match[2]}: ${match[3]}`;
    }
    return line;
  });
  fs.writeFileSync(todoPath, updated.join("\n"));
}

export function addTask(
  todoPath: string,
  name: string,
  description: string
): void {
  const content = fs.readFileSync(todoPath, "utf-8");
  const line = `- [ ] ${name}: ${description}`;
  const trimmed = content.trimEnd();
  fs.writeFileSync(todoPath, `${trimmed}\n${line}\n`);
}

export function removeTask(todoPath: string, name: string): void {
  const content = fs.readFileSync(todoPath, "utf-8");
  const lines = content.split("\n");
  const filtered = lines.filter((line) => {
    const match = line.match(TASK_RE);
    return !(match && match[2] === name);
  });
  fs.writeFileSync(todoPath, filtered.join("\n"));
}
