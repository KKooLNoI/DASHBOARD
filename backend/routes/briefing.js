// routes/briefing.js
import express from "express";
import { getTodayEvents, getUpcomingEvents } from "../services/calendar.js";
import { getTodayTasks } from "../services/notion.js";
import { getMarketSnapshot } from "../services/market.js";
import { getTrendSnapshot } from "../services/trend.js";
import { saveBriefingSnapshot, getRecentBriefings } from "../data/db.js";

const router = express.Router();

// GET /api/briefing/today — รวมทุกอย่างเป็น briefing เดียว (เหมือน nova-daily-briefing skill)
router.get("/today", async (req, res) => {
  try {
    const [events, upcoming, tasks, market, trend] = await Promise.all([
      getTodayEvents(),
      getUpcomingEvents(),
      getTodayTasks(),
      getMarketSnapshot(),
      getTrendSnapshot(),
    ]);

    const snapshot = {
      date: new Date().toISOString(),
      events,
      upcoming,
      tasks,
      market,
      trend,
    };

    saveBriefingSnapshot(snapshot);

    res.json(snapshot);
  } catch (err) {
    console.error("briefing/today error:", err);
    res.status(500).json({ error: "ไม่สามารถดึง briefing ได้ตอนนี้" });
  }
});

// GET /api/briefing/history — ดู briefing ย้อนหลัง
router.get("/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 7;
  const history = getRecentBriefings(limit);
  res.json(history);
});

export default router;
