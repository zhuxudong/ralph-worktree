import { useState } from "react";
import { TaskBoard } from "./components/TaskBoard";
import { AddTask } from "./components/AddTask";
import { StatusBar } from "./components/StatusBar";
import { useTasks, useRunState, runAll, mergeAll, cleanAll } from "./hooks/useApi";
import styles from "./App.module.less";

export function App() {
  const { tasks, loading, refresh: refreshTasks } = useTasks();
  const { state, refresh: refreshState } = useRunState();
  const [acting, setActing] = useState(false);

  const refreshAll = () => {
    refreshTasks();
    refreshState();
  };

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

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>ralph-worktree</h1>
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
            onClick={() => handleAction(cleanAll)}
            disabled={acting}
          >
            清理
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

      <TaskBoard tasks={tasks} state={state} onAction={refreshAll} />

      <AddTask onAdded={refreshAll} />

      <StatusBar tasks={tasks} />
    </div>
  );
}
