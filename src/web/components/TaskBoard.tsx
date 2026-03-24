import { useState } from "react";
import type { Task, RunState, TaskStatus } from "../types";
import { STATUS_ORDER, STATUS_LABELS, STATUS_COLORS } from "../types";
import { TaskCard } from "./TaskCard";
import styles from "./TaskBoard.module.less";

interface TaskBoardProps {
  tasks: Task[];
  state: RunState | null;
  expandedTasks: Set<string>;
  onToggleExpand: (name: string) => void;
  onContextMenu: (e: React.MouseEvent, task: Task) => void;
  onAction: () => void;
}

export function TaskBoard({
  tasks,
  state,
  expandedTasks,
  onToggleExpand,
  onContextMenu,
  onAction,
}: TaskBoardProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const grouped = new Map<TaskStatus, Task[]>();
  for (const status of STATUS_ORDER) {
    const items = tasks.filter((t) => t.status === status);
    if (items.length > 0) {
      grouped.set(status, items);
    }
  }

  const getTaskState = (name: string) =>
    state?.tasks.find((t) => t.name === name);

  const toggleGroup = (status: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#30363d" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p>暂无任务</p>
        <p className={styles.emptyHint}>点击右上角「+ 新任务」添加</p>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      {STATUS_ORDER.map((status) => {
        const items = grouped.get(status);
        if (!items) return null;
        const isCollapsed = collapsedGroups.has(status);
        const color = STATUS_COLORS[status];

        return (
          <div key={status} className={styles.group}>
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup(status)}
            >
              <span
                className={`${styles.arrow} ${isCollapsed ? styles.collapsed : ""}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </span>
              <span className={styles.statusDot} style={{ background: color }} />
              <span className={styles.groupLabel}>{STATUS_LABELS[status]}</span>
              <span className={styles.groupCount}>{items.length}</span>
            </div>
            {!isCollapsed && (
              <div className={styles.groupCards}>
                {items.map((task) => (
                  <TaskCard
                    key={task.name}
                    task={task}
                    taskState={getTaskState(task.name)}
                    expanded={expandedTasks.has(task.name)}
                    onToggleExpand={() => onToggleExpand(task.name)}
                    onContextMenu={(e) => onContextMenu(e, task)}
                    onAction={onAction}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
