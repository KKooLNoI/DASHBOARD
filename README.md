# NOVA Web Dashboard — Phase 1

ระบบ dashboard ส่วนตัวที่รวม Calendar, Tasks, Market, และ Trend & Product
ไว้ในที่เดียว ตอนนี้ใช้ **mock data** ทั้งหมด เพื่อให้เห็นภาพ UI/UX ก่อนต่อข้อมูลจริง

โครงสร้าง:
```
nova-web/
├── backend/    Express API (port 4000)
└── frontend/   React + Vite (port 5173)
```

---

## วิธีรันบนเครื่อง (MacBook Air)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

ทดสอบว่า backend ทำงาน:
```bash
curl http://localhost:4000/api/health
```

> **หมายเหตุ:** `better-sqlite3` เป็น native module ต้อง compile ตอน `npm install`
> ถ้าเครื่องไม่มี Xcode Command Line Tools ให้รัน `xcode-select --install` ก่อน

### 2. Frontend

เปิด terminal อีกหน้าต่าง:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

---

## โครงสร้างข้อมูล (สำหรับต่อข้อมูลจริงใน Phase ถัดไป)

ทุก mock data อยู่ใน `backend/services/*.js` — แต่ละไฟล์มีฟังก์ชัน async ที่ return
shape เดียวกับที่ frontend ใช้อยู่แล้ว เวลาจะต่อข้อมูลจริง **แก้แค่เนื้อในฟังก์ชัน
ไม่ต้องแก้ frontend เลย**:

| ไฟล์ | ฟังก์ชัน | จะต่อกับ |
|---|---|---|
| `services/calendar.js` | `getTodayEvents()`, `getUpcomingEvents()` | Google Calendar API |
| `services/notion.js` | `getTodayTasks()` | Notion API (MY LIFE PLANNER workspace) |
| `services/market.js` | `getMarketSnapshot()`, `getPortfolio()` | yfinance / financial API |
| `services/trend.js` | `getTrendSnapshot()` | web_search + Claude API (ดู trend-product-matcher skill) |

---

## Deploy ขึ้น VPS (DigitalOcean / Vultr)

แนวทางคร่าวๆ (รายละเอียดเต็มถามต่อได้):

1. สร้าง VPS (Ubuntu 22.04 ขนาดเล็กสุดก็พอสำหรับใช้คนเดียว)
2. ติดตั้ง Node.js, nginx, pm2 บน VPS
3. `git clone` หรือ `scp` โปรเจกต์ขึ้นไป
4. รัน backend ด้วย `pm2 start server.js --name nova-backend` (ให้รันตลอด ไม่ดับ)
5. `npm run build` ที่ frontend แล้วเอา `dist/` ไปเสิร์ฟผ่าน nginx
6. ตั้ง nginx reverse proxy: `/api/*` → backend port 4000, อื่นๆ → frontend dist
7. (แนะนำ) ตั้ง HTTPS ด้วย Let's Encrypt (certbot) เพื่อเข้าจากมือถือได้ปลอดภัย

---

## Phase 2 (ขั้นต่อไป)

- ต่อข้อมูลจริงแทน mock (Google Calendar, Notion, market data, trend)
- เชื่อม LINE Official Account — ใช้ webhook เดียวกับ scheduler ที่เตรียมไว้แล้วใน
  `server.js` (ดูคอมเมนต์ `// Phase 2:` ในไฟล์)
- เพิ่ม authentication ถ้าจะเข้าจากที่ไหนก็ได้ผ่านโดเมนสาธารณะ (ตอนนี้ยังไม่มี
  auth — ใครรู้ URL ก็เข้าดูได้ จะต้องเพิ่มก่อน deploy ให้คนอื่นเห็นไม่ได้)
