import { useState, useEffect, useCallback } from "react";
import type { Task, RunState, SmartTaskResult, Employee } from "../types";

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

  return { tasks, setTasks, loading, refresh };
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

  return { state, setState, refresh };
}

export async function addTask(name: string, description: string, assignee?: string): Promise<void> {
  await request("/tasks", {
    method: "POST",
    body: JSON.stringify({ name, description, assignee }),
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

export async function smartParseTask(input: string): Promise<SmartTaskResult> {
  return request<SmartTaskResult>("/tasks/smart", {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export async function retryTask(name: string): Promise<void> {
  await request(`/tasks/${encodeURIComponent(name)}/retry`, { method: "POST" });
}

export async function getDiff(name: string): Promise<string> {
  const data = await request<{ diff: string }>(`/diff/${encodeURIComponent(name)}`);
  return data.diff;
}

export async function getMemory(name: string): Promise<Record<string, string>> {
  const data = await request<{ memories: Record<string, string> }>(`/memory/${encodeURIComponent(name)}`);
  return data.memories;
}

export async function getLogs(name: string): Promise<string> {
  const data = await request<{ logs: string }>(`/logs/${encodeURIComponent(name)}`);
  return data.logs;
}

// Employee API
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await request<Employee[]>("/employees");
      setEmployees(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { employees, loading, refresh };
}

export async function createEmployee(employee: Employee): Promise<void> {
  await request("/employees", {
    method: "POST",
    body: JSON.stringify(employee),
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  await request(`/employees/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function autoAssignEmployee(description: string): Promise<Employee | null> {
  const data = await request<{ employee: Employee | null }>("/employees/auto-assign", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
  return data.employee;
}
