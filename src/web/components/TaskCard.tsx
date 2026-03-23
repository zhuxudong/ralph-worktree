import { useState } from "react";
import type { Task, TaskState } from "../types";
import { removeTask, runTask } from "../hooks/useApi";
import styles from "./TaskCard.module.less";

interface TaskCardProps {
  task: Task;
  taskState?: TaskState;
  onAction: () => void;
}

export function TaskCard({ task, taskState, onAction }: TaskCardProps) {
  const [acting, setActing] = useState(false);

  const handleDelete = async () => {
    if (acting) return;
    setActing(true);
    try {
      await removeTask(task.name);
      onAction();
    } finally {
      setActing(false);
    }
  };

  const handleRun = async () => {
    if (acting) return;
    setActing(true);
    try {
      await runTask(task.name);
      onAction();
    } finally {
      setActing(false);
    }
  };

  const loops = taskState?.loops ?? 0;
  const summary = taskState?.summary;

  return (
    <div className={`${styles.card} ${styles[task.status]}`}>
      <div className={styles.name}>{task.name}</div>
      <div className={styles.desc}>{task.description}</div>

      {task.status === "pending" && (
        <div className={styles.actions}>
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={acting}
          >
            删除
          </button>
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={acting}
          >
            运行
          </button>
        </div>
      )}

      {task.status === "running" && (
        <div className={styles.progress}>{loops}/20 轮</div>
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
  );
}
