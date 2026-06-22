// services/discordNotify.js — Discord Webhook notifications
// ตั้งค่า: สร้าง webhook ใน Discord แล้วใส่ DISCORD_WEBHOOK_URL ใน .env
// วิธี: Server Settings → Integrations → Webhooks → New Webhook → Copy URL

export async function sendDiscord(content, embeds = []) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.log("[Discord] no webhook URL — skip:", content?.slice(0, 60));
    return;
  }

  try {
    const body = embeds.length > 0 ? { embeds } : { content };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn("[Discord] warn:", res.status, await res.text());
  } catch (e) {
    console.error("[Discord] error:", e.message);
  }
}

// แจ้งเตือนก่อนเรียน — ใช้ Discord Embed
export function buildClassEmbed(subject, slot, minutesBefore) {
  const typeLabel = slot.type === "lab" ? "Lab 🧪" : "Lecture 📖";
  const colorMap  = { lecture: 0x2dd4bf, lab: 0xa78bfa };
  return [
    {
      title: `🔔 เตือน: ${subject}`,
      color: colorMap[slot.type] || 0x2dd4bf,
      fields: [
        { name: "ประเภท",   value: typeLabel,                        inline: true },
        { name: "เวลา",     value: `${slot.start_time}–${slot.end_time} น.`, inline: true },
        { name: "ห้อง",     value: slot.room || "—",                 inline: true },
        { name: "เหลือเวลา", value: `⏱ อีก **${minutesBefore} นาที**`, inline: false },
      ],
      footer: { text: "NOVA Dashboard" },
    },
  ];
}

// แจ้งเตือนก่อน event
export function buildEventEmbed(event, minutesBefore) {
  return [
    {
      title: `📅 ${event.title}`,
      color: 0xf5a623,
      fields: [
        { name: "เวลา",     value: `${event.start || "?"}–${event.end || "?"} น.`, inline: true },
        { name: "สถานที่",  value: event.location || "—",            inline: true },
        { name: "เหลือเวลา", value: `⏱ อีก **${minutesBefore} นาที**`, inline: false },
      ],
      footer: { text: "NOVA Dashboard" },
    },
  ];
}

// สรุปตารางเช้า
export function buildDailySummaryEmbed(dayName, slots, events) {
  const fields = [];
  if (slots.length > 0) {
    fields.push({
      name: "📚 วิชาที่เรียนวันนี้",
      value: slots.map((s) =>
        `• **${s.subject_name}** ${s.start_time}–${s.end_time} [${s.type}] ห้อง ${s.room || "—"}`
      ).join("\n"),
    });
  }
  if (events.length > 0) {
    fields.push({
      name: "📅 กิจกรรม",
      value: events.map((e) =>
        `• **${e.title}** ${e.start || ""}–${e.end || ""}`
      ).join("\n"),
    });
  }
  if (slots.length === 0 && events.length === 0) {
    fields.push({ name: "✨ วันว่าง", value: "เหมาะกับ deep work!" });
  }

  return [
    {
      title: `🌅 NOVA สรุปวัน${dayName}`,
      color: 0x4ade80,
      fields,
      footer: { text: "NOVA Dashboard" },
      timestamp: new Date().toISOString(),
    },
  ];
}
