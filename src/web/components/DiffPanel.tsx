import { useState, useEffect, useRef } from "react";
import { getDiff } from "../hooks/useApi";
import styles from "./DiffPanel.module.less";

interface DiffPanelProps {
  taskName: string;
  onClose: () => void;
}

export function DiffPanel({ taskName, onClose }: DiffPanelProps) {
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDiff(taskName)
      .then(setDiff)
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{taskName} - Diff</span>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
        <div className={styles.content} ref={contentRef}>
          {loading && <div className={styles.empty}>加载中...</div>}
          {error && <div className={styles.error}>{error}</div>}
          {!loading && !error && !diff && <div className={styles.empty}>无差异</div>}
          {diff &&
            diff.split("\n").map((line, i) => {
              let cls = styles.line;
              if (line.startsWith("+")) cls = `${styles.line} ${styles.added}`;
              else if (line.startsWith("-")) cls = `${styles.line} ${styles.removed}`;
              else if (line.startsWith("@@")) cls = `${styles.line} ${styles.hunk}`;
              else if (line.startsWith("diff ") || line.startsWith("index "))
                cls = `${styles.line} ${styles.meta}`;
              return (
                <div key={i} className={cls}>
                  {line}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
