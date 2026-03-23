import { useEffect, useRef } from "react";
import { useLogStream } from "../hooks/useEvents";
import styles from "./LogPanel.module.less";

interface LogPanelProps {
  taskName: string;
  visible: boolean;
  onClose: () => void;
}

export function LogPanel({ taskName, visible, onClose }: LogPanelProps) {
  const { lines, done, connect, disconnect } = useLogStream(taskName);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-connect when visible, disconnect when hidden
  useEffect(() => {
    if (visible) {
      connect();
    } else {
      disconnect();
    }
  }, [visible, connect, disconnect]);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{taskName} - 日志</span>
          <span className={styles.status}>
            {done ? "已结束" : "实时"}
          </span>
          <button className={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.content} ref={containerRef}>
          {lines.length === 0 ? (
            <div className={styles.empty}>暂无日志输出…</div>
          ) : (
            lines.map((line, i) => (
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
