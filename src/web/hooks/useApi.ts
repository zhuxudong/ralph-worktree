import { useState, useEffect, useCallback } from "react";
import type { Task, RunState } from "../types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await request<Task[]>("/tasks");
      setTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, loading, refresh };
}

export function useRunState() {
  const [state, setState] = useState<RunState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await request<RunState>("/state");
      setState(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, refresh };
}

export async function addTask(name: string, description: string): Promise<void> {
  await request("/tasks", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function removeTask(name: string): Promise<void> {
  await request(`/tasks/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function runAll(): Promise<void> {
  await request("/run", { method: "POST" });
}

export async function runTask(name: string): Promise<void> {
  await request(`/run/${encodeURIComponent(name)}`, { method: "POST" });
}

export async function mergeAll(): Promise<void> {
  await request("/merge", { method: "POST" });
}

