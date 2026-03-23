import type { Task, RunState } from "../types";
import { TaskCard } from "./TaskCard";
import styles from "./TaskBoard.module.less";

interface TaskBoardProps {
  tasks: Task[];
  state: RunState | null;
  onAction: () => void;
}

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "pending", label: "待做" },
  { key: "running", label: "进行中" },
  { key: "done", label: "已完成" },
  { key: "failed", label: "失败" },
];

export function TaskBoard({ tasks, state, onAction }: TaskBoardProps) {
  const grouped = {
    pending: tasks.filter((t) => t.status === "pending"),
    running: tasks.filter((t) => t.status === "running"),
    done: tasks.filter((t) => t.status === "done"),
    failed: tasks.filter((t) => t.status === "failed"),
  };

  const getTaskState = (name: string) =>
    state?.tasks.find((t) => t.name === name);

  return (
    <div className={styles.board}>
      {COLUMNS.map((col) => (
        <div key={col.key} className={styles.column}>
          <div className={styles.header}>
            {col.label}
            <span className={styles.count}>{grouped[col.key].length}</span>
          </div>
          <div className={styles.cards}>
            {grouped[col.key].map((task) => (
              <TaskCard
                key={task.name}
                task={task}
                taskState={getTaskState(task.name)}
                onAction={onAction}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
