import { useEffect, useRef, useState, useCallback } from "react";

interface Task {
  name: string;
  description: string;
  status: "pending" | "running" | "done" | "failed";
}

interface TaskState {
  name: string;
  status: "pending" | "running" | "done" | "failed" | "breaker";
  branch: string;
  worktreePath: string;
  loops: number;
  maxLoops?: number;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
}

interface RunState {
  startedAt: string;
  finishedAt?: string;
  tasks: TaskState[];
}

/** Map of taskName → last log line (for preview in task cards). */
export type LogPreviewMap = Record<string, string>;

interface UseEventsReturn {
  tasks: Task[];
  state: RunState | null;
  connected: boolean;
  logPreviews: LogPreviewMap;
}

/**
 * Subscribe to SSE events from /api/events.
 * Returns live tasks, run state, and connection status.
 * Auto-reconnects on disconnect (EventSource built-in behavior).
 */
export function useEvents(): UseEventsReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<RunState | null>(null);
  const [connected, setConnected] = useState(false);
  const [logPreviews, setLogPreviews] = useState<LogPreviewMap>({});

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("tasks", (e) => {
      try {
        setTasks(JSON.parse(e.data));
      } catch {
        // ignore malformed data
      }
    });

    es.addEventListener("state", (e) => {
      try {
        setState(JSON.parse(e.data));
      } catch {
        // ignore
      }
    });

    es.addEventListener("log", (e) => {
      try {
        const data = JSON.parse(e.data) as { taskName: string; lines: string[] };
        if (data.lines.length > 0) {
          const lastLine = data.lines[data.lines.length - 1];
          setLogPreviews((prev) => ({ ...prev, [data.taskName]: lastLine }));
        }
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { tasks, state, connected, logPreviews };
}

interface UseLogStreamReturn {
  lines: string[];
  done: boolean;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Subscribe to SSE log stream for a specific task.
 * Call `connect()` to start, `disconnect()` to stop.
 */
export function useLogStream(taskName: string): UseLogStreamReturn {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const doneRef = useRef(false);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    disconnect();
    setLines([]);
    setDone(false);
    doneRef.current = false;

    const es = new EventSource(`/api/logs/${encodeURIComponent(taskName)}/stream`);
    esRef.current = es;

    es.addEventListener("log", (e) => {
      try {
        const data = JSON.parse(e.data) as { taskName: string; lines: string[] };
        setLines((prev) => [...prev, ...data.lines]);
      } catch {
        // ignore
      }
    });

    es.addEventListener("done", () => {
      doneRef.current = true;
      setDone(true);
    });

    es.onerror = () => {
      // EventSource will auto-reconnect, but if task is done we close
      if (doneRef.current) {
        es.close();
        esRef.current = null;
      }
    };
  }, [taskName, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { lines, done, connect, disconnect };
}
