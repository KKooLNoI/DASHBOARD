// services/calendar.js
import { getEventsForDate } from "../data/db.js";

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function tomorrowBKK() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

export async function getTodayEvents() {
  return getEventsForDate(todayBKK());
}

export async function getUpcomingEvents() {
  return getEventsForDate(tomorrowBKK()).map((e) => ({
    id: e.id,
    title: e.title,
    date: "พรุ่งนี้",
    type: e.type,
  }));
}

export const COACH_COLORS = { กูร: "red", ตี๋: "green", กุน: "blue" };
