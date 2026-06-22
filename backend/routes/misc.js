// routes/misc.js
import express from "express";
import { getTodayEvents, getUpcomingEvents } from "../services/calendar.js";
import { getTrendSnapshot } from "../services/trend.js";
import {
  getRecentAlerts,
  getLocalTasks, createLocalTask, setLocalTaskDone, deleteLocalTask,
} from "../data/db.js";

const router = express.Router();

router.get("/calendar/today", async (req, res) => {
  const events = await getTodayEvents();
  res.json(events);
});

router.get("/calendar/upcoming", async (req, res) => {
  const events = await getUpcomingEvents();
  res.json(events);
});

// GET /api/tasks/today  — all local tasks (no date filter, shown as "today's list")
router.get("/tasks/today", (req, res) => {
  res.json(getLocalTasks());
});

// POST /api/tasks  body: { name, priority?, due_label? }
router.post("/tasks", (req, res) => {
  const { name, priority, due_label } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  res.status(201).json(createLocalTask({ name: name.trim(), priority, due_label }));
});

// PATCH /api/tasks/:id  body: { done: boolean }
router.patch("/tasks/:id", (req, res) => {
  const { done } = req.body;
  setLocalTaskDone(parseInt(req.params.id), !!done);
  res.json({ ok: true });
});

// DELETE /api/tasks/:id
router.delete("/tasks/:id", (req, res) => {
  deleteLocalTask(parseInt(req.params.id));
  res.json({ ok: true });
});

router.get("/trend/today", async (req, res) => {
  const trend = await getTrendSnapshot();
  res.json(trend);
});

router.get("/alerts/recent", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(getRecentAlerts(limit));
});

export default router;
