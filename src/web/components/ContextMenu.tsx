import { useEffect, useRef } from "react";
import styles from "./ContextMenu.module.less";

export interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Adjust position if menu would go off-screen
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        ref.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        ref.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`${styles.item} ${item.danger ? styles.danger : ""}`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
