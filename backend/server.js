// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";

import briefingRoutes from "./routes/briefing.js";
import marketRoutes from "./routes/market.js";
import miscRoutes from "./routes/misc.js";
import eventsRoutes from "./routes/events.js";
import studyRoutes from "./routes/study.js";
import { logAlert, getStudySchedule, getEventsForDate } from "./data/db.js";
import { sendDiscord, buildClassEmbed, buildEventEmbed, buildDailySummaryEmbed } from "./services/discordNotify.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/briefing", briefingRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/study", studyRoutes);
app.use("/api", miscRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ===== Scheduler =====
// Phase 1: แค่ log เข้า database (ดูได้ผ่าน /api/alerts/recent)
// Phase 2: เพิ่มการส่งเข้า LINE จริงตรงจุดที่คอมเมนต์ไว้

const DAY_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

function nowBKK() {
  return new Date(new Date().toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" }));
}
function todayDateBKK() {
  return nowBKK().toLocaleDateString("sv-SE");
}

// ── ทุก 1 นาที: เช็คแจ้งเตือน 30 นาทีก่อนเรียน / ก่อน event ──────────────
cron.schedule(
  "* * * * *",
  async () => {
    const now     = nowBKK();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const dow     = now.getDay(); // 0=Sun

    // ── แจ้งเตือนตารางเรียน ──────────────────────────────────────────────
    try {
      const slots = getStudySchedule();
      for (const slot of slots) {
        if (slot.day_of_week !== dow) continue;
        const [h, m] = slot.start_time.split(":").map(Number);
        const diff = (h * 60 + m) - nowMins;
        if (diff === 30) {
          await sendDiscord(null, buildClassEmbed(slot.subject_name, slot, 30));
          logAlert("class-alert", `${slot.subject_name} ${slot.start_time}`);
        }
      }
    } catch (e) { console.error("[cron] study alert:", e.message); }

    // ── แจ้งเตือน events (coaching / custom) ─────────────────────────────
    try {
      const events = getEventsForDate(todayDateBKK());
      for (const ev of events) {
        if (!ev.start) continue;
        const [h, m] = ev.start.split(":").map(Number);
        const diff = (h * 60 + m) - nowMins;
        if (diff === 30) {
          await sendDiscord(null, buildEventEmbed(ev, 30));
          logAlert("event-alert", `${ev.title} ${ev.start}`);
        }
      }
    } catch (e) { console.error("[cron] event alert:", e.message); }
  },
  { timezone: "Asia/Bangkok" }
);

// ── ทุกเช้า 07:00 — สรุปตารางวันนี้ ──────────────────────────────────────
cron.schedule(
  "0 7 * * *",
  async () => {
    const now = nowBKK();
    const dow = now.getDay();
    const slots = getStudySchedule().filter((s) => s.day_of_week === dow);
    const events = getEventsForDate(todayDateBKK());

    let msg = `\n🌅 NOVA สรุปวันนี้ (${DAY_TH[dow]})\n`;

    if (slots.length > 0) {
      msg += `\n📚 วิชาที่เรียนวันนี้:\n`;
      slots.forEach((s) => {
        msg += `• ${s.subject_name} ${s.start_time}–${s.end_time} [${s.type}] ห้อง ${s.room || "—"}\n`;
      });
    }
    if (events.length > 0) {
      msg += `\n📅 กิจกรรม:\n`;
      events.forEach((e) => { msg += `• ${e.title} ${e.start || ""}–${e.end || ""}\n`; });
    }
    if (slots.length === 0 && events.length === 0) {
      msg += "\n✨ วันว่าง — perfect สำหรับ deep work!";
    }

    await sendDiscord(null, buildDailySummaryEmbed(DAY_TH[dow], slots, events));
    logAlert("daily-summary", `วันนี้: ${slots.length} วิชา, ${events.length} event`);
    console.log("[scheduler] 07:00 daily summary sent");
  },
  { timezone: "Asia/Bangkok" }
);

// ── ทุก 30 นาที ช่วงตลาดเปิด — placeholder ──────────────────────────────
cron.schedule(
  "*/30 * * * *",
  () => { /* Phase 2: market price alert */ },
  { timezone: "Asia/Bangkok" }
);

app.listen(PORT, () => {
  console.log(`NOVA backend running on http://localhost:${PORT}`);
});
