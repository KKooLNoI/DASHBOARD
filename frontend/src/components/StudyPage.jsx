import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_FULL  = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const COLOR_MAP = {
  blue:   { bg: "var(--blue-dim,rgba(96,165,250,.12))",   text: "var(--blue,#60a5fa)",   border: "var(--blue,#60a5fa)" },
  purple: { bg: "var(--purple-dim,rgba(167,139,250,.12))",text: "var(--purple,#a78bfa)", border: "var(--purple,#a78bfa)" },
  teal:   { bg: "var(--teal-dim,rgba(45,212,191,.12))",   text: "var(--teal,#2dd4bf)",   border: "var(--teal,#2dd4bf)" },
  green:  { bg: "var(--green-dim,rgba(74,222,128,.12))",  text: "var(--green,#4ade80)",  border: "var(--green,#4ade80)" },
  amber:  { bg: "var(--amber-dim,rgba(251,191,36,.12))",  text: "var(--amber,#fbbf24)",  border: "var(--amber,#fbbf24)" },
};

function useStudyData() {
  const [subjects,  setSubjects]  = useState([]);
  const [schedule,  setSchedule]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [sRes, schRes] = await Promise.all([
        fetch(`${API_BASE}/api/study/subjects`),
        fetch(`${API_BASE}/api/study/schedule`),
      ]);
      setSubjects(await sRes.json());
      setSchedule(await schRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleTopic(topicId, subjectId) {
    // Optimistic
    setSubjects((prev) =>
      prev.map((s) =>
        s.id !== subjectId ? s : {
          ...s,
          topics: s.topics.map((t) =>
            t.id !== topicId ? t : { ...t, done: t.done ? 0 : 1 }
          ),
          doneCount: s.topics.filter((t) => t.id === topicId
            ? !t.done
            : t.done
          ).length,
        }
      )
    );
    await fetch(`${API_BASE}/api/study/topics/${topicId}`, { method: "PATCH" });
  }

  return { subjects, schedule, loading, toggleTopic };
}

// ── Weekly Timetable ──────────────────────────────────────────────────────────

function Timetable({ schedule, subjects }) {
  const todayDow = new Date().getDay(); // 0=Sun

  // group by day
  const byDay = {};
  for (const slot of schedule) {
    if (!byDay[slot.day_of_week]) byDay[slot.day_of_week] = [];
    byDay[slot.day_of_week].push(slot);
  }

  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun order

  return (
    <div className="panel study-timetable-panel">
      <div className="panel-header">
        <span className="panel-title"><span className="accent-bar" />ตารางเรียนสัปดาห์นี้</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {subjects.length} วิชา · {schedule.length} คาบ/สัปดาห์
        </span>
      </div>

      <div className="study-timetable-grid">
        {days.map((dow) => {
          const isToday = dow === todayDow;
          const slots   = byDay[dow] || [];
          return (
            <div key={dow} className={`timetable-col ${isToday ? "timetable-col--today" : ""}`}>
              <div className={`timetable-day-label ${isToday ? "timetable-day-label--today" : ""}`}>
                {DAY_NAMES[dow]}
                {isToday && <span className="timetable-today-dot" />}
              </div>
              <div className="timetable-slots">
                {slots.length === 0 && (
                  <div className="timetable-slot timetable-slot--empty">—</div>
                )}
                {slots.map((slot) => {
                  const c = COLOR_MAP[slot.subject_color] || COLOR_MAP.teal;
                  return (
                    <div
                      key={slot.id}
                      className={`timetable-slot timetable-slot--${slot.type}`}
                      style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}
                    >
                      <div className="timetable-slot-time">
                        {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
                      </div>
                      <div className="timetable-slot-name" style={{ color: c.text }}>
                        {shortName(slot.subject_name)}
                      </div>
                      <div className="timetable-slot-type">
                        {slot.type === "lab" ? "Lab" : "Lecture"}
                      </div>
                      {slot.room && (
                        <div className="timetable-slot-room">{slot.room}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today highlight */}
      {byDay[todayDow]?.length > 0 && (
        <div className="timetable-today-note">
          วันนี้ ({DAY_FULL[todayDow]}) มีเรียน{" "}
          {byDay[todayDow].map((s) => shortName(s.subject_name)).join(", ")}
        </div>
      )}
    </div>
  );
}

function shortName(name) {
  const map = {
    "ชีววิทยาในชีวิตประจำวัน":             "ชีววิทยา",
    "สถาปัตยกรรมซอฟต์แวร์":               "SW Arch",
    "การทดสอบซอฟต์แวร์":                  "SW Test",
    "เทคโนโลยีการเชื่อมต่อระหว่างเครือข่าย": "Interntwork",
    "นิติวิทยาศาสตร์ดิจิทัล":              "Forensics",
    "การอ่านเชิงวิชาการ":                  "Acad. Read",
  };
  return map[name] || name.slice(0, 10);
}

// ── Subject Roadmap Card ──────────────────────────────────────────────────────

function formatExamDate(isoDate, time) {
  if (!isoDate) return null;
  const d = new Date(isoDate + "T00:00:00+07:00");
  const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  return time ? `${label}  ${time} น.` : label;
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const now  = new Date();
  const then = new Date(isoDate + "T00:00:00+07:00");
  return Math.ceil((then - now) / 86400000);
}

function SubjectCard({ subject, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const pct = subject.totalTopics > 0
    ? Math.round((subject.doneCount / subject.totalTopics) * 100)
    : 0;
  const c = COLOR_MAP[subject.color] || COLOR_MAP.teal;

  const midtermDays = daysUntil(subject.midterm_date);
  const examDays    = daysUntil(subject.exam_date);

  const visible = expanded ? subject.topics : subject.topics.slice(0, 5);

  return (
    <div className="subject-card" style={{ borderTop: `3px solid ${c.border}` }}>
      {/* Header */}
      <div className="subject-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="subject-name" style={{ color: c.text }}>{subject.name}</div>
          {subject.name_en && <div className="subject-name-en">{subject.name_en}</div>}
          {subject.code && <div className="subject-code">{subject.code} · {subject.credit} credit</div>}
        </div>
        <div className="subject-progress-label">
          <span style={{ color: c.text, fontWeight: 700 }}>{subject.doneCount}</span>
          <span style={{ color: "var(--text-tertiary)" }}>/{subject.totalTopics}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="subject-progress-wrap">
        <div className="subject-progress-bar" style={{ width: `${pct}%`, background: c.border }} />
      </div>
      <div className="subject-pct-label" style={{ color: c.text }}>{pct}%</div>

      {/* Exam dates */}
      <div className="subject-exam-row">
        {subject.midterm_date && (
          <div className={`subject-exam-chip ${midtermDays !== null && midtermDays <= 14 && midtermDays >= 0 ? "subject-exam-chip--soon" : ""}`}>
            <span className="exam-label">กลางภาค</span>
            <span className="exam-date">{formatExamDate(subject.midterm_date, subject.midterm_time)}</span>
            {midtermDays !== null && midtermDays >= 0 && (
              <span className="exam-countdown">{midtermDays === 0 ? "วันนี้!" : `อีก ${midtermDays} วัน`}</span>
            )}
          </div>
        )}
        {subject.exam_date && (
          <div className={`subject-exam-chip ${examDays !== null && examDays <= 14 && examDays >= 0 ? "subject-exam-chip--soon" : ""}`}>
            <span className="exam-label">ปลายภาค</span>
            <span className="exam-date">{formatExamDate(subject.exam_date, subject.exam_time)}</span>
            {examDays !== null && examDays >= 0 && (
              <span className="exam-countdown">{examDays === 0 ? "วันนี้!" : `อีก ${examDays} วัน`}</span>
            )}
          </div>
        )}
      </div>

      {/* Topic list */}
      <div className="subject-topics">
        {visible.map((topic) => (
          <TopicRow key={topic.id} topic={topic} color={c} onToggle={() => onToggle(topic.id, subject.id)} />
        ))}
      </div>

      {subject.topics.length > 5 && (
        <button className="subject-expand-btn" onClick={() => setExpanded((v) => !v)} style={{ color: c.text }}>
          {expanded ? "▲ ย่อ" : `▼ ดูทั้งหมด ${subject.topics.length} สัปดาห์`}
        </button>
      )}
    </div>
  );
}

function TopicRow({ topic, color, onToggle }) {
  return (
    <div
      className={`topic-row ${topic.done ? "topic-row--done" : ""}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
    >
      <span
        className={`topic-check ${topic.done ? "topic-check--done" : ""}`}
        style={topic.done ? { background: color.border, borderColor: color.border } : { borderColor: color.border }}
      >
        {topic.done && (
          <svg viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0a0d11" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <div className="topic-body">
        <span className="topic-week">สัปดาห์ {topic.week_num}</span>
        <span className="topic-title">{topic.title}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudyPage() {
  const { subjects, schedule, loading, toggleTopic } = useStudyData();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-dot" /><div className="page-loading-dot" /><div className="page-loading-dot" />
      </div>
    );
  }

  const totalDone  = subjects.reduce((s, sub) => s + sub.doneCount, 0);
  const totalAll   = subjects.reduce((s, sub) => s + sub.totalTopics, 0);

  return (
    <div className="study-page">
      {/* Overall progress bar */}
      <div className="study-overview">
        <div className="study-overview-label">
          ความคืบหน้ารวม
          <span className="study-overview-count"> {totalDone}/{totalAll} สัปดาห์</span>
        </div>
        <div className="study-overview-bar-wrap">
          <div
            className="study-overview-bar"
            style={{ width: totalAll > 0 ? `${(totalDone / totalAll) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Timetable */}
      <Timetable schedule={schedule} subjects={subjects} />

      {/* Subject cards */}
      <div className="subject-grid">
        {subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} onToggle={toggleTopic} />
        ))}
      </div>
    </div>
  );
}
