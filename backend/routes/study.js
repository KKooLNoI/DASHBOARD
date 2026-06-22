// routes/study.js
import express from "express";
import {
  getStudySubjects,
  getStudySchedule,
  toggleStudyTopic,
  addStudyScheduleSlot,
  deleteStudyScheduleSlot,
} from "../data/db.js";

const router = express.Router();

// GET /api/study/subjects  → subjects + topics (with done state)
router.get("/subjects", (req, res) => {
  res.json(getStudySubjects());
});

// GET /api/study/schedule  → weekly timetable
router.get("/schedule", (req, res) => {
  res.json(getStudySchedule());
});

// PATCH /api/study/topics/:id  → toggle topic done
router.patch("/topics/:id", (req, res) => {
  const updated = toggleStudyTopic(parseInt(req.params.id));
  if (!updated) return res.status(404).json({ error: "topic not found" });
  res.json(updated);
});

// POST /api/study/schedule  → add class slot
router.post("/schedule", (req, res) => {
  const { day_of_week, subject_id, start_time, end_time, room, type } = req.body;
  if (!day_of_week || !subject_id || !start_time || !end_time) {
    return res.status(400).json({ error: "missing required fields" });
  }
  res.status(201).json(addStudyScheduleSlot({ day_of_week, subject_id, start_time, end_time, room, type }));
});

// DELETE /api/study/schedule/:id  → remove class slot
router.delete("/schedule/:id", (req, res) => {
  deleteStudyScheduleSlot(parseInt(req.params.id));
  res.json({ ok: true });
});

export default router;
