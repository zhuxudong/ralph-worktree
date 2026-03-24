import { useState } from "react";
import type { Task, TaskState } from "../types";
import { removeTask, runTask } from "../hooks/useApi";
import { LogPanel } from "./LogPanel";
import styles from "./TaskCard.module.less";

interface TaskCardProps {
  task: Task;
  taskState?: TaskState;
  latestLog?: string;
}

export function TaskCard({ task, taskState, latestLog }: TaskCardProps) {
  const [acting, setActing] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const handleDelete = async () => {
    if (acting) return;
    setActing(true);
    try {
      await removeTask(task.name);
    } finally {
      setActing(false);
    }
  };

  const handleRun = async () => {
    if (acting) return;
    setActing(true);
    try {
      await runTask(task.name);
    } finally {
      setActing(false);
    }
  };

  const loops = taskState?.loops ?? 0;
  const summary = taskState?.summary;
  const isClickable = task.status === "running" || task.status === "done" || task.status === "failed";

  return (
    <>
      <div
        className={`${styles.card} ${styles[task.status]} ${isClickable ? styles.clickable : ""}`}
        onClick={isClickable ? () => setShowLog(true) : undefined}
      >
        <div className={styles.name}>{task.name}</div>
        <div className={styles.desc}>{task.description}</div>

        {task.status === "pending" && (
          <div className={styles.actions}>
            <button
              className={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={acting}
            >
              删除
            </button>
            <button
              className={styles.runBtn}
              onClick={(e) => { e.stopPropagation(); handleRun(); }}
              disabled={acting}
            >
              运行
            </button>
          </div>
        )}

        {task.status === "running" && (
          <div className={styles.runningInfo}>
            <div className={styles.progress}>循环 {loops}/{taskState?.maxLoops ?? 20}</div>
            {latestLog && (
              <div className={styles.logPreview} title={latestLog}>
                {latestLog}
              </div>
            )}
          </div>
        )}

        {task.status === "done" && (
          <div className={styles.summary}>
            {summary || `完成 (${loops} 轮)`}
          </div>
        )}

        {task.status === "failed" && (
          <div className={styles.error}>
            {summary || "执行失败"}
          </div>
        )}
      </div>

      <LogPanel
        taskName={task.name}
        visible={showLog}
        onClose={() => setShowLog(false)}
      />
    </>
  );
}
