import type { IncomingMessage, ServerResponse } from "node:http";
import type { Watcher, WatcherEvent } from "./watcher.js";

/** Write a single SSE event to the response stream. */
function sendEvent(
  res: ServerResponse,
  event: string,
  data: unknown
): boolean {
  if (res.writableEnded) return false;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  return true;
}

/**
 * Handle GET /api/events — SSE stream for task and state changes.
 * Pushes initial snapshot immediately, then diffs on every watcher tick.
 */
export function handleEvents(
  _req: IncomingMessage,
  res: ServerResponse,
  watcher: Watcher
): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial snapshot so client has data immediately
  const snap = watcher.snapshot();
  sendEvent(res, "tasks", snap.tasks);
  sendEvent(res, "state", snap.state);

  const unsubscribe = watcher.subscribe((event: WatcherEvent) => {
    const ok = sendEvent(res, event.type, event.data);
    if (!ok) unsubscribe();
  });

  // Keep-alive ping every 30s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepAlive);
      return;
    }
    res.write(": ping\n\n");
  }, 30_000);

  _req.on("close", () => {
    unsubscribe();
    clearInterval(keepAlive);
  });
}

/**
 * Handle GET /api/logs/:name/stream — SSE stream for a single task's log.
 * Sends existing log content first, then streams increments.
 */
export function handleLogStream(
  req: IncomingMessage,
  res: ServerResponse,
  watcher: Watcher,
  taskName: string
): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send existing log content as initial payload before streaming new lines
  const existingLines = watcher.getLogLines(taskName);
  if (existingLines.length > 0) {
    sendEvent(res, "log", { taskName, lines: existingLines });
  }

  // Start watching this task's log file (offset set to current size)
  watcher.watchLog(taskName);

  const snap = watcher.snapshot();
  const taskState = snap.state.tasks.find((t) => t.name === taskName);

  const unsubscribe = watcher.subscribe((event: WatcherEvent) => {
    if (event.type !== "log") return;
    if (event.data.taskName !== taskName) return;
    const ok = sendEvent(res, "log", event.data);
    if (!ok) unsubscribe();
  });

  // If the task is already done/failed, notify and let client decide
  if (taskState && (taskState.status === "done" || taskState.status === "failed")) {
    sendEvent(res, "done", { taskName, status: taskState.status });
  }

  // Also watch for state changes to detect task completion
  const unsubState = watcher.subscribe((event: WatcherEvent) => {
    if (event.type !== "state") return;
    const t = event.data.tasks.find(
      (ts: { name: string }) => ts.name === taskName
    );
    if (t && (t.status === "done" || t.status === "failed")) {
      sendEvent(res, "done", { taskName, status: t.status });
    }
  });

  const keepAlive = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepAlive);
      return;
    }
    res.write(": ping\n\n");
  }, 30_000);

  req.on("close", () => {
    unsubscribe();
    unsubState();
    watcher.unwatchLog(taskName);
    clearInterval(keepAlive);
  });
}
