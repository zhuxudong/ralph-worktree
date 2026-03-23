import fs from "node:fs";
import path from "node:path";
import { statePath, todoPath, logsDir } from "../core/config.js";
import { loadState, type RunState } from "../core/state.js";
import { parseTodo, type Task } from "../core/todo-parser.js";

export interface WatcherSnapshot {
  tasks: Task[];
  state: RunState;
}

export type WatcherEvent =
  | { type: "tasks"; data: Task[] }
  | { type: "state"; data: RunState }
  | { type: "log"; data: { taskName: string; lines: string[] } };

type EventListener = (event: WatcherEvent) => void;

export class Watcher {
  private root: string;
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<EventListener>();
  private lastTasksJson = "";
  private lastStateJson = "";
  private logOffsets = new Map<string, number>();

  constructor(root: string) {
    this.root = root;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Start polling every `intervalMs` (default 2000). */
  start(intervalMs = 2000): void {
    if (this.interval) return;
    // Capture initial snapshot without emitting
    this.captureBaseline();
    this.interval = setInterval(() => this.poll(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.listeners.clear();
    this.logOffsets.clear();
  }

  /** Get current snapshot (useful for initial SSE payload). */
  snapshot(): WatcherSnapshot {
    const todo = todoPath(this.root);
    const tasks = fs.existsSync(todo)
      ? parseTodo(fs.readFileSync(todo, "utf-8"))
      : [];
    const state = loadState(this.root);
    return { tasks, state };
  }

  /** Subscribe to log increments for a specific task. Returns unsubscribe fn. */
  watchLog(taskName: string): void {
    const logFile = path.join(logsDir(this.root), `${taskName}.log`);
    if (!this.logOffsets.has(taskName)) {
      const size = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
      this.logOffsets.set(taskName, size);
    }
  }

  unwatchLog(taskName: string): void {
    this.logOffsets.delete(taskName);
  }

  // ---- internal ----

  private captureBaseline(): void {
    const todo = todoPath(this.root);
    if (fs.existsSync(todo)) {
      const tasks = parseTodo(fs.readFileSync(todo, "utf-8"));
      this.lastTasksJson = JSON.stringify(tasks);
    }
    const sp = statePath(this.root);
    if (fs.existsSync(sp)) {
      this.lastStateJson = fs.readFileSync(sp, "utf-8");
    }
  }

  private poll(): void {
    this.checkTasks();
    this.checkState();
    this.checkLogs();
  }

  private checkTasks(): void {
    const todo = todoPath(this.root);
    if (!fs.existsSync(todo)) return;
    const tasks = parseTodo(fs.readFileSync(todo, "utf-8"));
    const json = JSON.stringify(tasks);
    if (json !== this.lastTasksJson) {
      this.lastTasksJson = json;
      this.emit({ type: "tasks", data: tasks });
    }
  }

  private checkState(): void {
    const sp = statePath(this.root);
    if (!fs.existsSync(sp)) return;
    const raw = fs.readFileSync(sp, "utf-8");
    if (raw !== this.lastStateJson) {
      this.lastStateJson = raw;
      try {
        const state: RunState = JSON.parse(raw);
        this.emit({ type: "state", data: state });
      } catch {
        // ignore parse errors from partial writes
      }
    }
  }

  private checkLogs(): void {
    for (const [taskName, offset] of this.logOffsets) {
      const logFile = path.join(logsDir(this.root), `${taskName}.log`);
      if (!fs.existsSync(logFile)) continue;
      const stat = fs.statSync(logFile);
      if (stat.size <= offset) continue;

      const fd = fs.openSync(logFile, "r");
      const buf = Buffer.alloc(stat.size - offset);
      fs.readSync(fd, buf, 0, buf.length, offset);
      fs.closeSync(fd);

      this.logOffsets.set(taskName, stat.size);
      const newContent = buf.toString("utf-8");
      const lines = newContent.split("\n").filter((l) => l.length > 0);
      if (lines.length > 0) {
        this.emit({ type: "log", data: { taskName, lines } });
      }
    }
  }

  private emit(event: WatcherEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // don't let one broken listener kill others
      }
    }
  }
}
