// data/db.js
// SQLite — เบาและพอสำหรับใช้คนเดียว ไม่ต้องตั้ง server database แยก
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Render.com persistent disk mounts at /data; fallback to local dir
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "nova.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

// Migration: drop study tables if schema is outdated (missing midterm_date)
const studyExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='study_subjects'").get();
if (studyExists) {
  const hasMidterm = db.prepare("PRAGMA table_info(study_subjects)").all().some((c) => c.name === "midterm_date");
  if (!hasMidterm) {
    db.exec(`
      DROP TABLE IF EXISTS study_schedule;
      DROP TABLE IF EXISTS study_topics;
      DROP TABLE IF EXISTS study_subjects;
    `);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS briefing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    snapshot_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_to_line INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    location TEXT,
    type TEXT NOT NULL DEFAULT 'default',
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_done (
    task_id TEXT NOT NULL,
    date    TEXT NOT NULL,
    done_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, date)
  );

  CREATE TABLE IF NOT EXISTS local_tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    priority   TEXT NOT NULL DEFAULT 'normal',
    due_label  TEXT,
    done       INTEGER NOT NULL DEFAULT 0,
    done_at    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_subjects (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    name_en       TEXT,
    code          TEXT,
    color         TEXT NOT NULL DEFAULT 'teal',
    midterm_date  TEXT,
    midterm_time  TEXT,
    exam_date     TEXT,
    exam_time     TEXT,
    credit        INTEGER DEFAULT 3,
    sort_order    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS study_topics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    week_num   INTEGER DEFAULT 1,
    title      TEXT NOT NULL,
    done       INTEGER DEFAULT 0,
    done_at    TEXT,
    FOREIGN KEY (subject_id) REFERENCES study_subjects(id)
  );

  CREATE TABLE IF NOT EXISTS study_schedule (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week INTEGER NOT NULL,
    subject_id  INTEGER NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    room        TEXT,
    type        TEXT DEFAULT 'lecture',
    FOREIGN KEY (subject_id) REFERENCES study_subjects(id)
  );
`);

// ── Seed coach schedule for current week if table is empty ────────────────────
function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00+07:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

const eventCount = db.prepare("SELECT COUNT(*) AS c FROM events").get();
if (eventCount.c === 0) {
  const today = todayBKK();
  const dow = new Date(today + "T00:00:00+07:00").getDay(); // 0=Sun
  // find Monday of this week
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(today, mondayOffset);

  const weeklySchedule = [
    // Mon=1
    { dow: 1, title: "🏸 สอนแบด (กูร) — นน, มิกกี้, ออเว, อเมซิ่ง, ภูเมษ, แผ่นดิน", start: "17:00", end: "19:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Tue=2
    { dow: 2, title: "🏸 สอนแบด (กูร) — นน, มิกกี้, นาย, ออเว, ปันปัน, อเมซิ่ง",   start: "17:00", end: "19:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Wed=3
    { dow: 3, title: "🏸 สอนแบด (กูร) — นน, ออเว, อเมซิ่ง",                          start: "17:00", end: "19:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Thu=4
    { dow: 4, title: "🏸 สอนแบด (กูร) — นน, นาย, มิกกี้, ปันปัน, อเมซิ่ง",          start: "17:00", end: "19:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Sat=6 morning
    { dow: 6, title: "🏸 สอนแบด (กูร) — ออเว, ลีโอ, ปันปัน, อเมซิ่ง",               start: "09:00", end: "11:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Sat=6 afternoon
    { dow: 6, title: "🏸 สอนแบด (กูร) — ออเว, ธี, ปันปัน",                           start: "13:00", end: "15:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
    // Sun=0
    { dow: 0, title: "🏸 สอนแบด (กูร) — พรีโม่, พรีม",                               start: "13:00", end: "15:00", location: "NA แจ้งวัฒนะ", type: "coaching" },
  ];

  const insert = db.prepare(
    "INSERT INTO events (date, title, start_time, end_time, location, type) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });

  // Seed 3 weeks: last + current + next
  const rows = [];
  for (let weekOffset = -1; weekOffset <= 1; weekOffset++) {
    for (const s of weeklySchedule) {
      const dayOffset = (s.dow === 0 ? 7 : s.dow) - 1; // 0-indexed from Mon
      const date = addDays(monday, weekOffset * 7 + dayOffset);
      rows.push([date, s.title, s.start, s.end, s.location, s.type]);
    }
  }
  insertMany(rows);
}

// ── Seed study data (real schedule from university portal) ────────────────────

const subjectCount = db.prepare("SELECT COUNT(*) AS c FROM study_subjects").get();
if (subjectCount.c === 0) {
  const subjects = [
    {
      name: "ชีววิทยาในชีวิตประจำวัน", name_en: "Biology in Daily Life",
      code: "040413001", color: "green",  credit: 3,
      midterm_date: "2026-08-18", midterm_time: "13:00-16:00",
      exam_date:    "2026-10-27", exam_time:    "13:00-16:00",
      sort_order: 0,
    },
    {
      name: "สถาปัตยกรรมซอฟต์แวร์", name_en: "Software Architecture",
      code: "040613305", color: "blue",   credit: 3,
      midterm_date: "2026-08-21", midterm_time: "09:00-12:00",
      exam_date:    "2026-10-29", exam_time:    "09:00-12:00",
      sort_order: 1,
    },
    {
      name: "การทดสอบซอฟต์แวร์", name_en: "Software Testing",
      code: "040613307", color: "purple", credit: 3,
      midterm_date: "2026-08-20", midterm_time: "16:30-19:30",
      exam_date:    "2026-10-28", exam_time:    "09:00-12:00",
      sort_order: 2,
    },
    {
      name: "เทคโนโลยีการเชื่อมต่อระหว่างเครือข่าย", name_en: "Inter-networking Technology",
      code: "040613504", color: "teal",   credit: 3,
      midterm_date: "2026-08-20", midterm_time: "13:00-16:00",
      exam_date:    "2026-10-21", exam_time:    "13:00-16:00",
      sort_order: 3,
    },
    {
      name: "นิติวิทยาศาสตร์ดิจิทัล", name_en: "Digital Forensics",
      code: "040613604", color: "amber",  credit: 3,
      midterm_date: "2026-08-19", midterm_time: "16:30-19:30",
      exam_date:    "2026-10-30", exam_time:    "13:00-16:00",
      sort_order: 4,
    },
    {
      name: "การอ่านเชิงวิชาการ", name_en: "Academic Reading",
      code: "080103030", color: "green",  credit: 3,
      midterm_date: "2026-08-20", midterm_time: "09:00-12:00",
      exam_date:    "2026-10-22", exam_time:    "09:00-12:00",
      sort_order: 5,
    },
  ];

  const insertSubj = db.prepare(`
    INSERT INTO study_subjects
      (name, name_en, code, color, midterm_date, midterm_time, exam_date, exam_time, credit, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  const topicsMap = {
    "ชีววิทยาในชีวิตประจำวัน": [
      "บทนำ: ชีววิทยากับชีวิตประจำวัน",
      "เซลล์และกระบวนการของเซลล์",
      "พันธุกรรมและ DNA",
      "วิวัฒนาการและความหลากหลายทางชีวภาพ",
      "ระบบนิเวศและสิ่งแวดล้อม",
      "ร่างกายมนุษย์ — ระบบย่อยอาหาร",
      "ร่างกายมนุษย์ — ระบบไหลเวียนโลหิต",
      "Midterm Review",
      "ร่างกายมนุษย์ — ระบบภูมิคุ้มกัน",
      "โรคติดเชื้อและระบาดวิทยา",
      "เทคโนโลยีชีวภาพ (GMO, CRISPR)",
      "ยาและสารเสพติดในชีวิตประจำวัน",
      "โภชนาการและสุขภาพ",
      "ชีววิทยากับสิ่งแวดล้อมและการเปลี่ยนแปลงสภาพภูมิอากาศ",
      "Final Review & สรุปองค์ความรู้",
    ],
    "สถาปัตยกรรมซอฟต์แวร์": [
      "บทนำ Software Architecture & Architectural Thinking",
      "Architectural Styles (Layered, MVC, Pipe-Filter)",
      "Service-Oriented Architecture (SOA)",
      "Microservices Architecture",
      "REST API Design & GraphQL",
      "Domain-Driven Design (DDD)",
      "Design Patterns (Creational, Structural, Behavioral)",
      "Midterm Review",
      "Quality Attributes (Availability, Scalability, Security)",
      "Cloud-native Architecture (12-Factor App)",
      "Event-driven Architecture & Message Queue",
      "CQRS & Event Sourcing",
      "DevOps & CI/CD ใน Software Architecture",
      "Architecture Decision Records (ADR) & Documentation",
      "Final Review & Case Studies",
    ],
    "การทดสอบซอฟต์แวร์": [
      "Testing Fundamentals & V-Model",
      "Test Planning, Strategy & Test Case Design",
      "Black-box Testing (Equivalence Partitioning, Boundary Value)",
      "White-box Testing (Statement, Branch, Path Coverage)",
      "Unit Testing ด้วย JUnit 5 / Jest",
      "Integration Testing",
      "System Testing & User Acceptance Testing",
      "Midterm Review",
      "Performance & Load Testing (JMeter)",
      "Security Testing & OWASP",
      "Test Automation ด้วย Selenium / Playwright",
      "API Testing ด้วย Postman / REST Assured",
      "CI/CD Pipeline & Automated Testing (GitHub Actions)",
      "Test Management (JIRA, TestRail, Zephyr)",
      "Final Review & Lab Project Retrospective",
    ],
    "เทคโนโลยีการเชื่อมต่อระหว่างเครือข่าย": [
      "Network Architecture Review & OSI/TCP-IP",
      "Routing Protocols — Static & RIP",
      "Routing Protocols — OSPF",
      "Routing Protocols — BGP & Inter-domain Routing",
      "MPLS & Traffic Engineering",
      "Quality of Service (QoS) — DiffServ, IntServ",
      "SDN Fundamentals (OpenFlow, OpenDaylight)",
      "Midterm Review",
      "NFV & Network Function Virtualization",
      "IPv6 & Migration Strategies (Dual Stack, Tunneling)",
      "Data Center Networking (Leaf-Spine)",
      "Network Virtualization (VXLAN, EVPN)",
      "Network Management (SNMP, NETCONF, YANG)",
      "Network Security Integration",
      "Final Review & Lab Exam Preparation",
    ],
    "นิติวิทยาศาสตร์ดิจิทัล": [
      "บทนำ Digital Forensics & กระบวนการสืบสวน",
      "กฎหมายและจริยธรรมด้าน Forensics (พ.ร.บ. คอมพิวเตอร์)",
      "Disk Forensics — HDD/SSD Analysis",
      "File System Analysis (FAT32, NTFS, ext4)",
      "Data Recovery & Deleted File Analysis",
      "Memory Forensics — RAM Dump & Volatility",
      "Network Forensics & Packet Analysis (Wireshark)",
      "Midterm Review",
      "Log Analysis (System, Application, Security Logs)",
      "Mobile Forensics — Android & iOS",
      "Email & Browser Forensics",
      "Malware Analysis & Reverse Engineering (พื้นฐาน)",
      "Incident Response & Chain of Custody",
      "Forensics Report Writing & Expert Witness",
      "Final Review & Lab Case Study",
    ],
    "การอ่านเชิงวิชาการ": [
      "การอ่านเพื่อจับใจความสำคัญ (Main Idea)",
      "Reading Strategies — Skimming & Scanning",
      "Academic Vocabulary Building",
      "Understanding Academic Text Structure",
      "Critical Reading & Analysis",
      "Reading Research Papers (Abstract → Conclusion)",
      "Summarizing & Paraphrasing Academic Texts",
      "Midterm Review",
      "Note-taking Techniques (Cornell Method)",
      "APA & IEEE Citation Styles",
      "Literature Review Reading & Writing",
      "Reading Technical Documentation",
      "Cross-referencing & Source Evaluation",
      "Academic Presentation Skills",
      "Final Review & Oral Presentation",
    ],
  };

  const scheduleMap = {
    "ชีววิทยาในชีวิตประจำวัน": [
      { day: 1, start: "09:00", end: "12:00", type: "lecture", room: "78-216" },
    ],
    "สถาปัตยกรรมซอฟต์แวร์": [
      { day: 5, start: "09:00", end: "12:00", type: "lecture", room: "75-604" },
    ],
    "การทดสอบซอฟต์แวร์": [
      { day: 2, start: "09:00", end: "12:00", type: "lecture", room: "78-619" },
    ],
    "เทคโนโลยีการเชื่อมต่อระหว่างเครือข่าย": [
      { day: 3, start: "08:30", end: "10:30", type: "lecture", room: "78-625" },
      { day: 3, start: "10:30", end: "12:30", type: "lab",     room: "78-625" },
    ],
    "นิติวิทยาศาสตร์ดิจิทัล": [
      { day: 3, start: "17:00", end: "19:00", type: "lecture", room: "78-619" },
      { day: 3, start: "19:00", end: "21:00", type: "lab",     room: "78-619" },
    ],
    "การอ่านเชิงวิชาการ": [
      { day: 4, start: "09:00", end: "12:00", type: "lecture", room: "78-317" },
    ],
  };

  const insertTopic = db.prepare(
    "INSERT INTO study_topics (subject_id, week_num, title) VALUES (?,?,?)"
  );
  const insertSched = db.prepare(
    "INSERT INTO study_schedule (day_of_week, subject_id, start_time, end_time, room, type) VALUES (?,?,?,?,?,?)"
  );

  db.transaction(() => {
    for (const s of subjects) {
      const info = insertSubj.run(
        s.name, s.name_en, s.code, s.color,
        s.midterm_date, s.midterm_time, s.exam_date, s.exam_time,
        s.credit, s.sort_order
      );
      const sid = info.lastInsertRowid;
      (topicsMap[s.name] || []).forEach((title, i) => insertTopic.run(sid, i + 1, title));
      (scheduleMap[s.name] || []).forEach((sl) =>
        insertSched.run(sl.day, sid, sl.start, sl.end, sl.room, sl.type)
      );
    }
  })();
}

// ── Seed local_tasks from mock if empty ──────────────────────────────────────
const localTaskCount = db.prepare("SELECT COUNT(*) AS c FROM local_tasks").get();
if (localTaskCount.c === 0) {
  const ins = db.prepare("INSERT INTO local_tasks (name, priority, due_label) VALUES (?,?,?)");
  db.transaction(() => {
    ins.run("อ่านเปเปอร์ Network Security",       "urgent",  "วันนี้");
    ins.run("เตรียม drill ใหม่ให้กลุ่มเยาวชน",    "normal",  "วันนี้");
    ins.run("อัปเดต SKILL.md us-market-analysis", "normal",  "วันนี้");
    ins.run("ตัดคลิป TikTok รีวิว gadget",        "backlog", null);
  })();
}

export function getLocalTasks() {
  return db.prepare("SELECT * FROM local_tasks ORDER BY done ASC, priority ASC, created_at ASC").all()
    .map(r => ({
      id:       r.id,
      name:     r.name,
      priority: r.priority,
      due:      r.due_label || null,
      done:     r.done === 1,
    }));
}

export function createLocalTask({ name, priority, due_label }) {
  const info = db.prepare(
    "INSERT INTO local_tasks (name, priority, due_label) VALUES (?,?,?)"
  ).run(name, priority || "normal", due_label || null);
  const r = db.prepare("SELECT * FROM local_tasks WHERE id = ?").get(info.lastInsertRowid);
  return { id: r.id, name: r.name, priority: r.priority, due: r.due_label, done: false };
}

export function setLocalTaskDone(id, done) {
  db.prepare("UPDATE local_tasks SET done=?, done_at=? WHERE id=?")
    .run(done ? 1 : 0, done ? new Date().toISOString() : null, id);
}

export function deleteLocalTask(id) {
  db.prepare("DELETE FROM local_tasks WHERE id=?").run(id);
}

// ── Study CRUD ────────────────────────────────────────────────────────────────

export function getStudySubjects() {
  const subjects = db.prepare("SELECT * FROM study_subjects ORDER BY sort_order ASC").all();
  return subjects.map((s) => {
    const topics = db
      .prepare("SELECT * FROM study_topics WHERE subject_id = ? ORDER BY week_num ASC")
      .all(s.id);
    const doneCount = topics.filter((t) => t.done).length;
    return { ...s, topics, doneCount, totalTopics: topics.length };
  });
}

export function getStudySchedule() {
  const rows = db.prepare(`
    SELECT ss.*, subj.name AS subject_name, subj.color AS subject_color, subj.code AS subject_code
    FROM study_schedule ss
    JOIN study_subjects subj ON subj.id = ss.subject_id
    ORDER BY ss.day_of_week ASC, ss.start_time ASC
  `).all();
  return rows;
}

export function toggleStudyTopic(id) {
  const topic = db.prepare("SELECT done FROM study_topics WHERE id = ?").get(id);
  if (!topic) return null;
  const newDone = topic.done ? 0 : 1;
  db.prepare(
    "UPDATE study_topics SET done = ?, done_at = ? WHERE id = ?"
  ).run(newDone, newDone ? new Date().toISOString() : null, id);
  return db.prepare("SELECT * FROM study_topics WHERE id = ?").get(id);
}

export function addStudyScheduleSlot({ day_of_week, subject_id, start_time, end_time, room, type }) {
  const info = db.prepare(
    "INSERT INTO study_schedule (day_of_week, subject_id, start_time, end_time, room, type) VALUES (?,?,?,?,?,?)"
  ).run(day_of_week, subject_id, start_time, end_time, room || null, type || "lecture");
  return db.prepare("SELECT * FROM study_schedule WHERE id = ?").get(info.lastInsertRowid);
}

export function deleteStudyScheduleSlot(id) {
  db.prepare("DELETE FROM study_schedule WHERE id = ?").run(id);
}

export function saveBriefingSnapshot(snapshot) {
  const stmt = db.prepare(
    "INSERT INTO briefing_log (created_at, snapshot_json) VALUES (?, ?)"
  );
  stmt.run(new Date().toISOString(), JSON.stringify(snapshot));
}

export function getRecentBriefings(limit = 7) {
  const rows = db
    .prepare("SELECT * FROM briefing_log ORDER BY created_at DESC LIMIT ?")
    .all(limit);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    snapshot: JSON.parse(r.snapshot_json),
  }));
}

export function logAlert(type, message, sentToLine = false) {
  const stmt = db.prepare(
    "INSERT INTO alert_log (created_at, type, message, sent_to_line) VALUES (?, ?, ?, ?)"
  );
  stmt.run(new Date().toISOString(), type, message, sentToLine ? 1 : 0);
}

export function getRecentAlerts(limit = 20) {
  return db
    .prepare("SELECT * FROM alert_log ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

// ── Event CRUD ────────────────────────────────────────────────────────────────

export function getEventsForDate(date) {
  return db
    .prepare("SELECT * FROM events WHERE date = ? ORDER BY start_time ASC")
    .all(date)
    .map(rowToEvent);
}

export function getEventsForRange(from, to) {
  return db
    .prepare("SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC")
    .all(from, to)
    .map(rowToEvent);
}

export function createEvent({ date, title, start_time, end_time, location, type, description }) {
  const info = db
    .prepare("INSERT INTO events (date, title, start_time, end_time, location, type, description) VALUES (?,?,?,?,?,?,?)")
    .run(date, title, start_time, end_time || null, location || null, type || "default", description || null);
  return db.prepare("SELECT * FROM events WHERE id = ?").get(info.lastInsertRowid);
}

export function updateEvent(id, fields) {
  const { title, start_time, end_time, location, type, description } = fields;
  db.prepare(
    "UPDATE events SET title=?, start_time=?, end_time=?, location=?, type=?, description=? WHERE id=?"
  ).run(title, start_time, end_time || null, location || null, type || "default", description || null, id);
  return db.prepare("SELECT * FROM events WHERE id = ?").get(id);
}

export function deleteEvent(id) {
  db.prepare("DELETE FROM events WHERE id = ?").run(id);
}

function rowToEvent(r) {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    start: r.start_time,
    end: r.end_time,
    location: r.location,
    type: r.type,
    description: r.description,
  };
}

// ── Task done state ───────────────────────────────────────────────────────────

export function getDoneTaskIds(date) {
  return db.prepare("SELECT task_id FROM task_done WHERE date = ?").all(date).map((r) => r.task_id);
}

export function setTaskDone(taskId, date, done) {
  if (done) {
    db.prepare("INSERT OR IGNORE INTO task_done (task_id, date) VALUES (?, ?)").run(taskId, date);
  } else {
    db.prepare("DELETE FROM task_done WHERE task_id = ? AND date = ?").run(taskId, date);
  }
}

export default db;
