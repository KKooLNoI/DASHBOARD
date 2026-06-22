// services/notion.js
// Phase 1: mock data — Phase 2: แทนด้วย Notion API จริง (MY LIFE PLANNER workspace)

import { getDoneTaskIds } from "../data/db.js";

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function mockTasks() {
  return [
    { id: "task_1", name: "อ่านเปเปอร์ Network Security",        priority: "urgent",  due: "วันนี้" },
    { id: "task_2", name: "เตรียม drill ใหม่ให้กลุ่มเยาวชน",     priority: "normal",  due: "วันนี้" },
    { id: "task_3", name: "อัปเดต SKILL.md us-market-analysis",  priority: "normal",  due: "วันนี้" },
    { id: "task_4", name: "ตัดคลิป TikTok รีวิว gadget",         priority: "backlog", due: null    },
  ];
}

export async function getTodayTasks() {
  const tasks  = mockTasks();
  const doneIds = new Set(getDoneTaskIds(todayBKK()));
  return tasks.map((t) => ({ ...t, done: doneIds.has(t.id) }));
}
