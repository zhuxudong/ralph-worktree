import { useState } from "react";
import { useEmployees, createEmployee, deleteEmployee } from "../hooks/useApi";
import styles from "./EmployeePanel.module.less";

interface EmployeePanelProps {
  onClose: () => void;
}

export function EmployeePanel({ onClose }: EmployeePanelProps) {
  const { employees, loading, refresh } = useEmployees();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", role: "", description: "", systemPrompt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!form.id || !form.name || !form.role || !form.description) {
      setError("ID、名称、角色、描述为必填项");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createEmployee({
        id: form.id,
        name: form.name,
        role: form.role,
        description: form.description,
        systemPrompt: form.systemPrompt || undefined,
      });
      setForm({ id: "", name: "", role: "", description: "", systemPrompt: "" });
      setShowAdd(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>数字员工管理</span>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.empty}>加载中...</div>
          ) : employees.length === 0 && !showAdd ? (
            <div className={styles.empty}>
              <p>暂无数字员工</p>
              <p className={styles.emptyHint}>添加员工后，新建任务时可自动/手动指派</p>
            </div>
          ) : (
            <div className={styles.list}>
              {employees.map((emp) => (
                <div key={emp.id} className={styles.card}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardTop}>
                      <span className={styles.empName}>{emp.name}</span>
                      <span className={styles.empRole}>{emp.role}</span>
                      <span className={styles.empId}>@{emp.id}</span>
                    </div>
                    <div className={styles.empDesc}>{emp.description}</div>
                    {emp.systemPrompt && (
                      <div className={styles.empPrompt}>{emp.systemPrompt}</div>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(emp.id)}
                    title="删除"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 00-1.492-.15l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAdd && (
            <div className={styles.addForm}>
              <div className={styles.formRow}>
                <input
                  className={styles.formInput}
                  placeholder="ID（如 frontend-dev）"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                />
                <input
                  className={styles.formInput}
                  placeholder="名称（如 小前）"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className={styles.formRow}>
                <input
                  className={styles.formInput}
                  placeholder="角色（如 frontend、backend、test）"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <textarea
                className={styles.formTextarea}
                placeholder="描述（如：擅长 React/Vue 前端开发，UI 组件实现）"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <textarea
                className={styles.formTextarea}
                placeholder="自定义系统提示词（可选，会注入到 agent 上下文中）"
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                rows={2}
              />
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => { setShowAdd(false); setError(""); }}>
                  取消
                </button>
                <button className={styles.saveBtn} onClick={handleAdd} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>
            {employees.length} 名员工
          </span>
          {!showAdd && (
            <button className={styles.addBtnFooter} onClick={() => setShowAdd(true)}>
              + 添加员工
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
