import { useState, useEffect } from "react";
import type { Task, TaskState } from "../types";
import { STATUS_COLORS } from "../types";
import { useLogStream } from "../hooks/useEvents";
import styles from "./TaskCard.module.less";

interface TaskCardProps {
  task: Task;
  taskState?: TaskState;
  expanded: boolean;
  onToggleExpand: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onAction: () => void;
}

export function TaskCard({
  task,
  taskState,
  expanded,
  onToggleExpand,
  onContextMenu,
  onAction,
}: TaskCardProps) {
  const loops = taskState?.loops ?? 0;
  const summary = taskState?.summary;
  const color = STATUS_COLORS[task.status] ?? "#8b949e";

  // Log streaming for expanded running tasks
  const { lines, connect, disconnect } = useLogStream(task.name);
  const [lastLogLine, setLastLogLine] = useState("");

  useEffect(() => {
    if (expanded && task.status === "running") {
      connect();
    } else {
      disconnect();
    }
  }, [expanded, task.status, connect, disconnect]);

  useEffect(() => {
    if (lines.length > 0) {
      setLastLogLine(lines[lines.length - 1]);
    }
  }, [lines]);

  return (
    <div
      className={`${styles.card} ${expanded ? styles.expanded : ""}`}
      onContextMenu={onContextMenu}
    >
      <div className={styles.cardHeader} onClick={onToggleExpand}>
        <span className={styles.statusIndicator} style={{ background: color }} />
        <span className={styles.name}>{task.name}</span>

        {task.status === "running" && (
          <span className={styles.badge} style={{ color: "#58a6ff" }}>
            {loops}/20
          </span>
        )}

        {task.status === "done" && (
          <span className={styles.badge} style={{ color: "#3fb950" }}>
            {loops} 轮
          </span>
        )}

        {task.status === "failed" && (
          <span className={styles.badge} style={{ color: "#f85149" }}>
            失败
          </span>
        )}

        <span className={styles.desc}>
          {!expanded && task.description.length > 60
            ? task.description.slice(0, 60) + "..."
            : !expanded
              ? task.description
              : ""}
        </span>

        <span className={`${styles.expandArrow} ${expanded ? styles.expanded : ""}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </span>
      </div>

      {expanded && (
        <div className={styles.cardBody}>
          <div className={styles.description}>{task.description}</div>

          {task.status === "running" && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min((loops / 20) * 100, 100)}%` }}
              />
            </div>
          )}

          {summary && (
            <div className={styles.summary}>{summary}</div>
          )}

          {task.status === "running" && lines.length > 0 && (
            <div className={styles.logPreview}>
              <div className={styles.logHeader}>实时日志</div>
              <div className={styles.logContent}>
                {lines.slice(-20).map((line, i) => (
                  <div key={i} className={styles.logLine}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {!expanded && lastLogLine && task.status === "running" && (
            <div className={styles.lastLog}>{lastLogLine}</div>
          )}
        </div>
      )}
    </div>
  );
}
