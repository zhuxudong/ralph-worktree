import { useState } from "react";
import { addTask, smartParseTask } from "../hooks/useApi";
import styles from "./AddTask.module.less";

interface AddTaskProps {
  onAdded: () => void;
  onClose: () => void;
}

export function AddTask({ onAdded, onClose }: AddTaskProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ name: string; description: string } | null>(null);

  const handleParse = async () => {
    if (!input.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await smartParseTask(input.trim());
      setPreview(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      await addTask(preview.name, preview.description);
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (preview) handleConfirm();
      else handleParse();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>添加新任务</span>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <textarea
            className={styles.input}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setPreview(null);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="描述你想要完成的任务，可以用自然语言&#10;也支持快捷格式：task-name: 描述"
            rows={3}
            autoFocus
            disabled={loading}
          />

          {preview && (
            <div className={styles.preview}>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>任务名</span>
                <span className={styles.previewValue}>{preview.name}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>描述</span>
                <span className={styles.previewValue}>{preview.description}</span>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>
            {preview ? "确认添加此任务？" : "Enter 解析 · Esc 关闭"}
          </span>
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
            {preview ? (
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "添加中..." : "确认添加"}
              </button>
            ) : (
              <button
                className={styles.parseBtn}
                onClick={handleParse}
                disabled={loading || !input.trim()}
              >
                {loading ? "解析中..." : "解析任务"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
