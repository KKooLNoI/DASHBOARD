// services/lineNotify.js — LINE Notify free API
// ตั้งค่า: เพิ่ม LINE_NOTIFY_TOKEN ใน .env
// รับ token ได้ที่ https://notify.line.me/ → ล็อกอิน → ออก token

const LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify";

export async function sendLine(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) {
    console.log("[LINE] no token — skip:", message.slice(0, 60));
    return;
  }

  try {
    const res = await fetch(LINE_NOTIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });
    const json = await res.json();
    if (json.status !== 200) console.warn("[LINE] warn:", json.message);
  } catch (e) {
    console.error("[LINE] error:", e.message);
  }
}

// สร้างข้อความแจ้งเตือนก่อนเรียน
export function buildClassAlert(subject, slot, minutesBefore) {
  const typeLabel = slot.type === "lab" ? "Lab 🧪" : "Lecture 📖";
  return (
    `\n🔔 NOVA แจ้งเตือนการเรียน\n` +
    `วิชา: ${subject}\n` +
    `ประเภท: ${typeLabel}\n` +
    `เวลา: ${slot.start_time}–${slot.end_time} น.\n` +
    `ห้อง: ${slot.room || "—"}\n` +
    `⏱ อีก ${minutesBefore} นาที`
  );
}

// สร้างข้อความแจ้งเตือน event (coaching/task)
export function buildEventAlert(event, minutesBefore) {
  return (
    `\n📅 NOVA แจ้งเตือนกิจกรรม\n` +
    `${event.title}\n` +
    `เวลา: ${event.start}–${event.end || "?"} น.\n` +
    (event.location ? `สถานที่: ${event.location}\n` : "") +
    `⏱ อีก ${minutesBefore} นาที`
  );
}
