import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TIMELINE_START = 8;
const TIMELINE_END   = 24;
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function parseDecimal(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function toPct(dec) {
  return ((dec - TIMELINE_START) / TIMELINE_RANGE) * 100;
}
function typeIcon(type) {
  if (type === "coaching") return "🏸";
  if (type === "academic") return "📚";
  return "💼";
}
function getNow() {
  const d = new Date();
  return {
    decimal: d.getHours() + d.getMinutes() / 60,
    str: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
  };
}

const HOUR_MARKS = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 2 + 1 }, (_, i) => TIMELINE_START + i * 2);

const BLANK_FORM = (date) => ({ title: "", type: "coaching", date: date || todayISO(), start_time: "17:00", end_time: "19:00", location: "" });

// ── Event Form Modal ──────────────────────────────────────────────────────────
function EventModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || BLANK_FORM());
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? "แก้ไข Event" : "เพิ่ม Event ใหม่"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="form-label">ชื่อกิจกรรม</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="เช่น สอนแบด, ส่งงาน..."
            autoFocus
          />

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">ประเภท</label>
              <select className="form-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="coaching">🏸 Coaching</option>
                <option value="academic">📚 Academic</option>
                <option value="default">💼 ทั่วไป</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">วันที่</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">เริ่ม</label>
              <input className="form-input" type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">สิ้นสุด (ถ้ามี)</label>
              <input className="form-input" type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          <label className="form-label">สถานที่</label>
          <input
            className="form-input"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="เช่น NA แจ้งวัฒนะ"
          />
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button
            className="btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !form.title || !form.start_time}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateTH(iso) {
  return new Date(iso + "T00:00:00+07:00").toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScheduleToday({ events: propEvents, upcoming, onRefetch, selectedDate }) {
  const todayStr   = todayISO();
  const viewDate   = selectedDate || todayStr;
  const isToday    = viewDate === todayStr;

  const [events, setEvents]   = useState([]);
  const [now, setNow]         = useState(getNow);
  const [modal, setModal]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const viewDateRef           = useRef(viewDate);
  viewDateRef.current         = viewDate;

  // When viewing today → use briefing prop; otherwise fetch from API
  useEffect(() => {
    if (isToday) {
      setEvents(propEvents || []);
    } else {
      fetch(`${API_BASE}/api/events?date=${viewDate}`)
        .then(r => r.json())
        .then(data => setEvents(data))
        .catch(() => setEvents([]));
    }
  }, [viewDate, propEvents, isToday]);

  useEffect(() => {
    const t = setInterval(() => setNow(getNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  const nowPct    = toPct(now.decimal);
  const isInRange = now.decimal >= TIMELINE_START && now.decimal <= TIMELINE_END;

  // ── API calls ────────────────────────────────────────────────────────────────
  async function saveEvent(form) {
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url    = isEdit ? `${API_BASE}/api/events/${form.id}` : `${API_BASE}/api/events`;
      const res    = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:       form.date,
          title:      form.title,
          start_time: form.start_time,
          end_time:   form.end_time || null,
          location:   form.location || null,
          type:       form.type,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const saved = await res.json();

      if (form.date !== viewDateRef.current) {
        // saved to a different date — just close
      } else if (isEdit) {
        setEvents((ev) => ev.map((e) => (e.id === saved.id ? normalise(saved) : e)));
      } else {
        setEvents((ev) => [...ev, normalise(saved)].sort((a, b) => a.start.localeCompare(b.start)));
      }
      setModal(null);
      onRefetch?.();
    } catch {
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(id) {
    if (!confirm("ลบ event นี้?")) return;
    await fetch(`${API_BASE}/api/events/${id}`, { method: "DELETE" });
    setEvents((ev) => ev.filter((e) => e.id !== id));
    onRefetch?.();
  }

  function normalise(r) {
    return { id: r.id, title: r.title, start: r.start_time || r.start, end: r.end_time || r.end, location: r.location, type: r.type, date: r.date };
  }

  function openEdit(evt) {
    setModal({
      mode: "edit",
      event: { id: evt.id, title: evt.title, type: evt.type, date: evt.date || viewDate.current, start_time: evt.start, end_time: evt.end || "", location: evt.location || "" },
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <span className="panel-title">
            {isToday ? "ตารางวันนี้" : formatDateTH(viewDate)}
          </span>
          {!isToday && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>คลิกวันอื่นในปฎิทินเพื่อดูตาราง</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isInRange && (
            <span className="now-badge">
              <span className="now-badge-dot" />{now.str}
            </span>
          )}
          <button className="btn-add-event" onClick={() => setModal({ mode: "add", event: BLANK_FORM(viewDate) })} title="เพิ่ม event">
            + เพิ่ม
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="tl-wrap">
        {HOUR_MARKS.map((h) => (
          <div key={h} className="tl-hour" style={{ top: `${toPct(h)}%` }}>
            <span className="tl-hour-label">{String(h % 24).padStart(2,"0")}:00</span>
            <div className="tl-hour-line" />
          </div>
        ))}

        {events.length === 0 && (
          <div className="tl-empty">
            ไม่มีกิจกรรมวันนี้ — กด <strong>+ เพิ่ม</strong> เพื่อเพิ่ม
          </div>
        )}

        {events.map((evt) => {
          const startDec = parseDecimal(evt.start);
          if (startDec === null) return null;
          const topPct = toPct(startDec);

          if (!evt.end) {
            return (
              <div key={evt.id} className="tl-deadline" style={{ top: `${topPct}%` }}>
                <span className="tl-deadline-dot" />
                <span className="tl-deadline-text">{typeIcon(evt.type)} {evt.title}</span>
              </div>
            );
          }

          const endDec    = parseDecimal(evt.end);
          const heightPct = Math.max(((endDec - startDec) / TIMELINE_RANGE) * 100, 3.5);
          const isPast    = endDec   < now.decimal;
          const isActive  = startDec <= now.decimal && now.decimal < endDec;
          const isHovered = hoverId === evt.id;

          return (
            <div
              key={evt.id}
              className={["tl-event", `tl-event--${evt.type}`, isPast ? "tl-event--past" : "", isActive ? "tl-event--active" : ""].join(" ")}
              style={{ top: `${topPct}%`, height: `${heightPct}%` }}
              onMouseEnter={() => setHoverId(evt.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <span className="tl-event-icon">{typeIcon(evt.type)}</span>
              <div className="tl-event-body">
                <div className="tl-event-title">{evt.title}</div>
                <div className="tl-event-meta">
                  {evt.start} – {evt.end}{evt.location ? ` · ${evt.location}` : ""}
                </div>
              </div>
              {isActive && <span className="tl-event-live">LIVE</span>}
              {isHovered && (
                <div className="tl-event-actions">
                  <button className="tl-act-btn" onClick={() => openEdit(evt)} title="แก้ไข">✏</button>
                  <button className="tl-act-btn tl-act-delete" onClick={() => removeEvent(evt.id)} title="ลบ">✕</button>
                </div>
              )}
            </div>
          );
        })}

        {isInRange && (
          <div className="tl-now" style={{ top: `${nowPct}%` }}>
            <span className="tl-now-label">{now.str}</span>
            <span className="tl-now-dot" />
            <div className="tl-now-line" />
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming?.length > 0 && (
        <div className="upcoming-section">
          <div className="panel-title" style={{ marginBottom: 8, fontSize: 11 }}>⚠️ Heads up</div>
          {upcoming.map((u) => (
            <div key={u.id} className="row-sub" style={{ fontSize: 13, color: "var(--amber)" }}>
              {u.date}: {u.title}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <EventModal
          initial={modal.event}
          onSave={saveEvent}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
