import { useState, useCallback, useEffect } from "react";
import { TaskBoard } from "./components/TaskBoard";
import { AddTask } from "./components/AddTask";
import { ContextMenu, type MenuItem } from "./components/ContextMenu";
import { LogPanel } from "./components/LogPanel";
import { DiffPanel } from "./components/DiffPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import {
  useTasks,
  useRunState,
  runAll,
  mergeAll,
  removeTask,
  runTask,
  retryTask,
} from "./hooks/useApi";
import { useEvents } from "./hooks/useEvents";
import type { Task } from "./types";
import styles from "./App.module.less";

export function App() {
  const { tasks, setTasks, loading, refresh: refreshTasks } = useTasks();
  const { state, setState, refresh: refreshState } = useRunState();
  const { tasks: liveTasks, state: liveState, connected } = useEvents();
  const [acting, setActing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: Task;
  } | null>(null);

  // Panel states
  const [logTask, setLogTask] = useState<string | null>(null);
  const [diffTask, setDiffTask] = useState<string | null>(null);
  const [memoryTask, setMemoryTask] = useState<string | null>(null);

  // Use SSE live data when available
  useEffect(() => {
    if (liveTasks.length > 0) setTasks(liveTasks);
  }, [liveTasks, setTasks]);

  useEffect(() => {
    if (liveState) setState(liveState);
  }, [liveState, setState]);

  // Auto-expand running tasks
  useEffect(() => {
    const running = tasks.filter((t) => t.status === "running").map((t) => t.name);
    if (running.length > 0) {
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        running.forEach((n) => next.add(n));
        return next;
      });
    }
  }, [tasks]);

  const refreshAll = useCallback(() => {
    refreshTasks();
    refreshState();
  }, [refreshTasks, refreshState]);

  const handleAction = async (action: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    try {
      await action();
      refreshAll();
    } finally {
      setActing(false);
    }
  };

  const toggleExpand = (name: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const closeContextMenu = () => setContextMenu(null);

  const getContextMenuItems = (task: Task): MenuItem[] => {
    const items: MenuItem[] = [];

    switch (task.status) {
      case "pending":
        items.push({
          label: "运行",
          action: () => handleAction(() => runTask(task.name)),
        });
        items.push({
          label: "删除",
          action: () => handleAction(() => removeTask(task.name)),
          danger: true,
        });
        break;
      case "running":
        items.push({
          label: "查看日志",
          action: () => setLogTask(task.name),
        });
        break;
      case "done":
        items.push({
          label: "合并",
          action: () => handleAction(mergeAll),
        });
        items.push({
          label: "查看日志",
          action: () => setLogTask(task.name),
        });
        items.push({
          label: "查看 Diff",
          action: () => setDiffTask(task.name),
        });
        break;
      case "merged":
        items.push({
          label: "查看 Memory",
          action: () => setMemoryTask(task.name),
        });
        items.push({
          label: "删除",
          action: () => handleAction(() => removeTask(task.name)),
          danger: true,
        });
        break;
      case "failed":
        items.push({
          label: "重试",
          action: () => handleAction(() => retryTask(task.name)),
        });
        items.push({
          label: "查看日志",
          action: () => setLogTask(task.name),
        });
        items.push({
          label: "删除",
          action: () => handleAction(() => removeTask(task.name)),
          danger: true,
        });
        break;
    }

    return items;
  };

  // Status summary
  const counts = {
    running: tasks.filter((t) => t.status === "running").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
    merged: tasks.filter((t) => t.status === "merged").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  const statusParts: string[] = [];
  if (counts.running) statusParts.push(`${counts.running} 运行中`);
  if (counts.pending) statusParts.push(`${counts.pending} 待做`);
  if (counts.done) statusParts.push(`${counts.done} 已完成`);
  if (counts.merged) statusParts.push(`${counts.merged} 已合并`);
  if (counts.failed) statusParts.push(`${counts.failed} 失败`);

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.app} onClick={closeContextMenu}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>ralph-worktree</h1>
          {connected && <span className={styles.liveDot} />}
          <span className={styles.statusSummary}>
            {statusParts.join(" · ")}
          </span>
        </div>
        <div className={styles.headerRight}>
          {counts.done > 0 && (
            <button
              className={styles.btn}
              onClick={() => handleAction(mergeAll)}
              disabled={acting}
            >
              合并全部
            </button>
          )}
          {counts.pending > 0 && (
            <button
              className={styles.primaryBtn}
              onClick={() => handleAction(runAll)}
              disabled={acting}
            >
              运行全部
            </button>
          )}
          <button
            className={styles.addBtn}
            onClick={() => setShowAddTask(true)}
          >
            + 新任务
          </button>
        </div>
      </header>

      <TaskBoard
        tasks={tasks}
        state={state}
        expandedTasks={expandedTasks}
        onToggleExpand={toggleExpand}
        onContextMenu={handleContextMenu}
        onAction={refreshAll}
      />

      {showAddTask && (
        <AddTask
          onAdded={() => {
            refreshAll();
            setShowAddTask(false);
          }}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.task)}
          onClose={closeContextMenu}
        />
      )}

      {logTask && (
        <LogPanel
          taskName={logTask}
          visible={true}
          onClose={() => setLogTask(null)}
        />
      )}

      {diffTask && (
        <DiffPanel
          taskName={diffTask}
          onClose={() => setDiffTask(null)}
        />
      )}

      {memoryTask && (
        <MemoryPanel
          taskName={memoryTask}
          onClose={() => setMemoryTask(null)}
        />
      )}
    </div>
  );
}
