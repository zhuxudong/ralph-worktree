import fs from "node:fs";

export interface Task {
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed" | "merged" | "deleted";
  assignee?: string;
}

const STATUS_MAP: Record<string, Task["status"]> = {
  " ": "pending",
  "~": "running",
  x: "done",
  "!": "failed",
  "✓": "merged",
  "-": "deleted",
};

const REVERSE_STATUS: Record<Task["status"], string> = {
  pending: " ",
  running: "~",
  done: "x",
  failed: "!",
  merged: "✓",
  deleted: "-",
};

const TASK_RE = /^- \[([x ~!\-✓])\] (\S+?):\s*(.+)$/;

export function parseTodo(content: string): Task[] {
  const tasks: Task[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(TASK_RE);
    if (match) {
      const [, marker, name, rawDesc] = match;
      let description = rawDesc.trim();
      let assignee: string | undefined;

      // Extract @assignee from end of description
      const assigneeMatch = description.match(/\s+@(\S+)$/);
      if (assigneeMatch) {
        assignee = assigneeMatch[1];
        description = description.slice(0, -assigneeMatch[0].length).trim();
      }

      tasks.push({
        name,
        description,
        status: STATUS_MAP[marker] ?? "pending",
        assignee,
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
      // Preserve the full original description (including @assignee)
      return `- [${marker}] ${match[2]}: ${match[3]}`;
    }
    return line;
  });
  fs.writeFileSync(todoPath, updated.join("\n"));
}

export function addTask(
  todoPath: string,
  name: string,
  description: string,
  assignee?: string
): void {
  const content = fs.readFileSync(todoPath, "utf-8");
  const suffix = assignee ? ` @${assignee}` : "";
  const line = `- [ ] ${name}: ${description}${suffix}`;
  const trimmed = content.trimEnd();
  fs.writeFileSync(todoPath, `${trimmed}\n${line}\n`);
}

export function removeTask(todoPath: string, name: string): void {
  updateTaskStatus(todoPath, name, "deleted");
}
