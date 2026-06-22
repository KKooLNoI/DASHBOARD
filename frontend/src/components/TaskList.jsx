import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const PRIORITY = {
  urgent:  { label: "ด่วน",    cls: "priority-urgent"  },
  normal:  { label: "ปกติ",    cls: "priority-normal"  },
  backlog: { label: "Backlog", cls: "priority-backlog" },
};

function CheckButton({ done, onClick, priority }) {
  const p = PRIORITY[priority] || PRIORITY.normal;
  return (
    <button
      className={`task-check-btn ${done ? "task-check-btn--done" : ""} ${p.cls}`}
      onClick={onClick}
      aria-label={done ? "ยกเลิก" : "เสร็จสิ้น"}
    >
      {done && (
        <svg viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function TaskRow({ task, onToggle, onDelete, saving }) {
  const [hov, setHov] = useState(false);
  const p = PRIORITY[task.priority] || PRIORITY.normal;
  return (
    <div
      className={`task-row ${task.done ? "task-row--done" : ""} ${saving ? "task-row--saving" : ""}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <CheckButton done={task.done} onClick={onToggle} priority={task.priority} />
      <div className="task-body">
        <div className="task-name">{task.name}</div>
        <div className="task-meta">
          <span className={`task-priority-tag ${p.cls}`}>{p.label}</span>
          {task.due && <span className="task-due">{task.due}</span>}
        </div>
      </div>
      {hov && (
        <button className="task-delete-btn" onClick={onDelete} title="ลบ task">
          <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Inline add-task form ──────────────────────────────────────────────────────
function AddTaskForm({ onAdd, onClose }) {
  const [name, setName]         = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), priority }),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      onAdd(task);
      setName(""); setPriority("normal");
    } catch {
      alert("เพิ่ม task ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="task-add-form">
      <input
        ref={inputRef}
        className="task-add-input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="ชื่อ task..."
      />
      <div className="task-add-row">
        <select
          className="task-add-select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option value="urgent">ด่วน</option>
          <option value="normal">ปกติ</option>
          <option value="backlog">Backlog</option>
        </select>
        <button
          className="btn-primary task-add-btn"
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
        >
          {saving ? "..." : "เพิ่ม"}
        </button>
        <button className="btn-ghost task-add-btn" onClick={onClose}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TaskList({ tasks: propTasks }) {
  const [tasks,   setTasks]   = useState(propTasks || []);
  const [pending, setPending] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { setTasks(propTasks || []); }, [propTasks]);

  async function toggleDone(task) {
    if (pending.has(task.id)) return;
    const newDone = !task.done;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: newDone } : t));
    setPending(s => new Set(s).add(task.id));
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: newDone }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: task.done } : t));
    } finally {
      setPending(s => { const n = new Set(s); n.delete(task.id); return n; });
    }
  }

  async function deleteTask(task) {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, { method: "DELETE" });
    } catch {
      setTasks(prev => [...prev, task]);
    }
  }

  function handleAdded(newTask) {
    setTasks(prev => [newTask, ...prev.filter(t => !t.done)].concat(prev.filter(t => t.done)));
    setShowAdd(false);
  }

  const todo = tasks.filter(t => !t.done);
  const done = tasks.filter(t =>  t.done);

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Tasks วันนี้</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {tasks.length > 0 && (
            <span className={`task-counter ${done.length === tasks.length ? "task-counter--all-done" : ""}`}>
              {done.length === tasks.length ? "✓ เสร็จทั้งหมด!" : `${done.length}/${tasks.length}`}
            </span>
          )}
          <button
            className="btn-add-event"
            onClick={() => setShowAdd(v => !v)}
            title="เพิ่ม task"
          >
            {showAdd ? "−" : "+ เพิ่ม"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="task-progress-wrap">
          <div className="task-progress-bar" style={{ width: `${(done.length / tasks.length) * 100}%` }} />
        </div>
      )}

      {/* Inline add form */}
      {showAdd && (
        <AddTaskForm onAdd={handleAdded} onClose={() => setShowAdd(false)} />
      )}

      {tasks.length === 0 && !showAdd && (
        <div className="empty-state">ไม่มี task — กด + เพิ่ม ได้เลย</div>
      )}

      {/* Todo */}
      {todo.length > 0 && (
        <div className="task-list">
          {todo.map(t => (
            <TaskRow
              key={t.id} task={t}
              onToggle={() => toggleDone(t)}
              onDelete={() => deleteTask(t)}
              saving={pending.has(t.id)}
            />
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <>
          <div className="task-done-divider"><span>เสร็จแล้ว {done.length} รายการ</span></div>
          <div className="task-list task-list--done">
            {done.map(t => (
              <TaskRow
                key={t.id} task={t}
                onToggle={() => toggleDone(t)}
                onDelete={() => deleteTask(t)}
                saving={pending.has(t.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
