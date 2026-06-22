import express from "express";
import { getEventsForDate, getEventsForRange, createEvent, updateEvent, deleteEvent } from "../data/db.js";

const router = express.Router();

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

// GET /api/events?date=YYYY-MM-DD  (default: today)
router.get("/", (req, res) => {
  const date = req.query.date || todayBKK();
  res.json(getEventsForDate(date));
});

// GET /api/events/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/range", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to required" });
  res.json(getEventsForRange(from, to));
});

// POST /api/events
router.post("/", (req, res) => {
  const { date, title, start_time, end_time, location, type, description } = req.body;
  if (!date || !title || !start_time) {
    return res.status(400).json({ error: "date, title, start_time จำเป็นต้องมี" });
  }
  const event = createEvent({ date, title, start_time, end_time, location, type, description });
  res.status(201).json(event);
});

// PUT /api/events/:id
router.put("/:id", (req, res) => {
  const { title, start_time, end_time, location, type, description } = req.body;
  if (!title || !start_time) {
    return res.status(400).json({ error: "title, start_time จำเป็นต้องมี" });
  }
  const event = updateEvent(parseInt(req.params.id), { title, start_time, end_time, location, type, description });
  if (!event) return res.status(404).json({ error: "ไม่พบ event" });
  res.json(event);
});

// DELETE /api/events/:id
router.delete("/:id", (req, res) => {
  deleteEvent(parseInt(req.params.id));
  res.json({ ok: true });
});

export default router;
