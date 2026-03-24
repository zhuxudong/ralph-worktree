import { useState } from "react";
import { TaskBoard } from "./components/TaskBoard";
import { AddTask } from "./components/AddTask";
import { StatusBar } from "./components/StatusBar";
import { useEvents } from "./hooks/useEvents";
import { runAll, mergeAll } from "./hooks/useApi";
import styles from "./App.module.less";

export function App() {
  const { tasks, state, connected, logPreviews } = useEvents();
  const [acting, setActing] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          ralph-worktree
          {!connected && <span className={styles.disconnected}> (断开)</span>}
        </h1>
        <div className={styles.toolbar}>
          <button
            className={styles.primaryBtn}
            onClick={() => handleAction(runAll)}
            disabled={acting}
          >
            运行全部
          </button>
          <button
            className={styles.btn}
            onClick={() => handleAction(mergeAll)}
            disabled={acting}
          >
            合并
          </button>
        </div>
      </header>

      <TaskBoard tasks={tasks} state={state} logPreviews={logPreviews} />

      <AddTask />

      <StatusBar tasks={tasks} />
    </div>
  );
}
