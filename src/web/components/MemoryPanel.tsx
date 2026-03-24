import { useState, useEffect } from "react";
import { getMemory } from "../hooks/useApi";
import styles from "./MemoryPanel.module.less";

interface MemoryPanelProps {
  taskName: string;
  onClose: () => void;
}

export function MemoryPanel({ taskName, onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMemory(taskName)
      .then(setMemories)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskName]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const entries = Object.entries(memories);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{taskName} - Memory</span>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          {loading && <div className={styles.empty}>加载中...</div>}
          {error && <div className={styles.error}>{error}</div>}
          {!loading && !error && entries.length === 0 && (
            <div className={styles.empty}>暂无 memory 数据</div>
          )}
          {entries.map(([file, content]) => (
            <div key={file} className={styles.section}>
              <div className={styles.fileName}>{file}</div>
              <pre className={styles.fileContent}>{content}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
