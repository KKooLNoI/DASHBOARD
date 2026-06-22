import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const DOW_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

const MONTH_TH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

const EVENT_COLOR = {
  coaching: "var(--blue)",
  academic: "var(--purple)",
  default:  "var(--teal)",
};

const SUBJECT_COLOR = {
  green:  "var(--green)",
  blue:   "var(--blue)",
  purple: "var(--purple)",
  teal:   "var(--teal)",
  amber:  "var(--amber)",
  red:    "var(--red)",
};

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function buildGrid(year, month) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i).toLocaleDateString("sv-SE"), other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d).toLocaleDateString("sv-SE"), other: false });
  }
  const rem = cells.length % 7;
  if (rem > 0) {
    for (let i = 1; i <= 7 - rem; i++) {
      cells.push({ date: new Date(year, month + 1, i).toLocaleDateString("sv-SE"), other: true });
    }
  }
  return cells;
}

export default function CalendarView({ selectedDate, onSelectDate }) {
  const today = todayISO();
  const init  = new Date(today + "T00:00:00");

  const [yr,  setYr]  = useState(init.getFullYear());
  const [mo,  setMo]  = useState(init.getMonth());
  const [eventMap, setEventMap] = useState({});
  const [examMap,  setExamMap]  = useState({});

  // fetch events for the viewed month
  useEffect(() => {
    const lastD = new Date(yr, mo + 1, 0).getDate();
    const from  = `${yr}-${String(mo + 1).padStart(2,"0")}-01`;
    const to    = `${yr}-${String(mo + 1).padStart(2,"0")}-${String(lastD).padStart(2,"0")}`;
    fetch(`${API_BASE}/api/events/range?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(evts => {
        const map = {};
        for (const e of evts) {
          (map[e.date] = map[e.date] || []).push(e);
        }
        setEventMap(map);
      })
      .catch(() => {});
  }, [yr, mo]);

  // fetch exam dates once
  useEffect(() => {
    fetch(`${API_BASE}/api/study/subjects`)
      .then(r => r.json())
      .then(subjects => {
        const map = {};
        for (const s of subjects) {
          if (s.midterm_date) {
            (map[s.midterm_date] = map[s.midterm_date] || []).push({
              type: "midterm", name: s.name, time: s.midterm_time, color: s.color,
            });
          }
          if (s.exam_date) {
            (map[s.exam_date] = map[s.exam_date] || []).push({
              type: "final", name: s.name, time: s.exam_time, color: s.color,
            });
          }
        }
        setExamMap(map);
      })
      .catch(() => {});
  }, []);

  function prevMonth() {
    if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1);
  }
  function nextMonth() {
    if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1);
  }
  function goToday() {
    const d = new Date(today + "T00:00:00");
    setYr(d.getFullYear()); setMo(d.getMonth());
    onSelectDate?.(today);
  }

  const cells    = buildGrid(yr, mo);
  const selected = selectedDate || today;
  const selExams = examMap[selected] || [];

  return (
    <div className="panel cal-panel">
      {/* ── Navigation ── */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="เดือนก่อน">‹</button>
        <span className="cal-month-label">{MONTH_TH[mo]} {yr + 543}</span>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="เดือนถัดไป">›</button>
        <button className="cal-today-btn" onClick={goToday}>วันนี้</button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="cal-grid">
        {DOW_LABELS.map(d => <div key={d} className="cal-dow">{d}</div>)}

        {/* ── Day cells ── */}
        {cells.map(cell => {
          const evts     = eventMap[cell.date] || [];
          const exams    = examMap[cell.date]  || [];
          const isToday  = cell.date === today;
          const isSel    = cell.date === selected;
          const hasMid   = exams.some(e => e.type === "midterm");
          const hasFinal = exams.some(e => e.type === "final");
          const dayNum   = new Date(cell.date + "T00:00:00").getDate();

          return (
            <button
              key={cell.date}
              className={[
                "cal-day",
                cell.other             ? "cal-day--other"    : "",
                isToday                ? "cal-day--today"    : "",
                isSel && !isToday      ? "cal-day--selected" : "",
                (hasMid || hasFinal)   ? "cal-day--has-exam" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onSelectDate?.(cell.date)}
            >
              <span className="cal-day-num">{dayNum}</span>

              {/* event type dots */}
              {evts.length > 0 && (
                <div className="cal-dots">
                  {[...new Set(evts.map(e => e.type))].slice(0, 3).map(t => (
                    <span key={t} className="cal-dot" style={{ background: EVENT_COLOR[t] || "var(--teal)" }} />
                  ))}
                </div>
              )}

              {/* exam markers */}
              {(hasMid || hasFinal) && (
                <div className="cal-exam-markers">
                  {hasMid   && <span className="cal-exam-pip cal-exam-pip--mid"   />}
                  {hasFinal && <span className="cal-exam-pip cal-exam-pip--final" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-dot" style={{ background: "var(--blue)" }} /> กิจกรรม
        </span>
        <span className="cal-legend-item">
          <span className="cal-exam-pip cal-exam-pip--mid" /> กลางภาค
        </span>
        <span className="cal-legend-item">
          <span className="cal-exam-pip cal-exam-pip--final" /> ปลายภาค
        </span>
      </div>

      {/* ── Exam detail for selected date ── */}
      {selExams.length > 0 && (
        <div className="cal-exam-detail">
          {selExams.map((e, i) => (
            <div key={i} className="cal-exam-row">
              <span className={`cal-exam-badge ${e.type === "midterm" ? "cal-exam-badge--mid" : "cal-exam-badge--final"}`}>
                {e.type === "midterm" ? "กลางภาค" : "ปลายภาค"}
              </span>
              <span
                className="cal-exam-subject"
                style={{ borderLeft: `2px solid ${SUBJECT_COLOR[e.color] || "var(--teal)"}` }}
              >
                {e.name}
              </span>
              {e.time && <span className="cal-exam-time">{e.time} น.</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
