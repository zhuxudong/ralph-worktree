import { useEffect, useRef, useState } from "react";
import { useLogStream } from "../hooks/useEvents";
import { getLogs } from "../hooks/useApi";
import styles from "./LogPanel.module.less";

interface LogPanelProps {
  taskName: string;
  visible: boolean;
  onClose: () => void;
}

export function LogPanel({ taskName, visible, onClose }: LogPanelProps) {
  const { lines: liveLines, done, connect, disconnect } = useLogStream(taskName);
  const containerRef = useRef<HTMLDivElement>(null);
  const [historicLines, setHistoricLines] = useState<string[]>([]);

  // Load historic logs
  useEffect(() => {
    if (visible) {
      getLogs(taskName).then((logs) => {
        if (logs) {
          setHistoricLines(logs.split("\n").filter((l) => l.length > 0));
        }
      }).catch(() => {});
      connect();
    } else {
      disconnect();
      setHistoricLines([]);
    }
  }, [visible, taskName, connect, disconnect]);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [liveLines, historicLines]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!visible) return null;

  const allLines = [...historicLines, ...liveLines];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{taskName} - 日志</span>
          <span className={styles.status}>
            {done ? "已结束" : "实时"}
          </span>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
        <div className={styles.content} ref={containerRef}>
          {allLines.length === 0 ? (
            <div className={styles.empty}>暂无日志输出...</div>
          ) : (
            allLines.map((line, i) => (
              <div key={i} className={styles.line}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
