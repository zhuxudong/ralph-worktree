import type { Task } from "../types";
import styles from "./StatusBar.module.less";

interface StatusBarProps {
  tasks: Task[];
}

export function StatusBar({ tasks }: StatusBarProps) {
  const total = tasks.length;
  const running = tasks.filter((t) => t.status === "running").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;

  return (
    <div className={styles.bar}>
      <span className={styles.item}>
        共 <strong>{total}</strong> 个任务
      </span>
      {pending > 0 && (
        <span className={`${styles.item} ${styles.pending}`}>
          待做 {pending}
        </span>
      )}
      {running > 0 && (
        <span className={`${styles.item} ${styles.running}`}>
          运行中 {running}
        </span>
      )}
      {done > 0 && (
        <span className={`${styles.item} ${styles.done}`}>
          完成 {done}
        </span>
      )}
      {failed > 0 && (
        <span className={`${styles.item} ${styles.failed}`}>
          失败 {failed}
        </span>
      )}
      {running > 0 && total > 0 && (
        <span className={styles.progress}>
          进度 {Math.round(((done + failed) / total) * 100)}%
        </span>
      )}
    </div>
  );
}
