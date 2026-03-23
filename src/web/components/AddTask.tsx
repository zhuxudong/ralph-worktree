import { useState } from "react";
import { addTask } from "../hooks/useApi";
import styles from "./AddTask.module.less";

interface AddTaskProps {
  onAdded: () => void;
}

export function AddTask({ onAdded }: AddTaskProps) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const colonIdx = input.indexOf(":");
    if (colonIdx === -1) {
      setError("格式：task-name: 描述");
      return;
    }

    const name = input.slice(0, colonIdx).trim();
    const description = input.slice(colonIdx + 1).trim();

    if (!name || !description) {
      setError("格式：task-name: 描述");
      return;
    }

    setAdding(true);
    try {
      await addTask(name, description);
      setInput("");
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="task-name: 任务描述"
        disabled={adding}
      />
      <button className={styles.btn} type="submit" disabled={adding || !input}>
        + 添加任务
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </form>
  );
}
