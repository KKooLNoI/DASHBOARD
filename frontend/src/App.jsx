import { useState, useEffect } from "react";
import { useBriefing } from "./hooks/useBriefing";
import ScheduleToday from "./components/ScheduleToday";
import TaskList from "./components/TaskList";
import CalendarView from "./components/CalendarView";
import MarketSnapshot from "./components/MarketSnapshot";
import MarketNews from "./components/MarketNews";
import TrendProduct from "./components/TrendProduct";
import StudyPage from "./components/StudyPage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TABS = [
  { id: "schedule", icon: "🗓", label: "ตารางงาน" },
  { id: "study",    icon: "📚", label: "เรียน"    },
  { id: "market",   icon: "📈", label: "หุ้น"     },
  { id: "trend",    icon: "🔥", label: "Trend"    },
];

function formatTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatThaiDate() {
  return new Date().toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function App() {
  const { data, loading, error, lastUpdated, refetch } = useBriefing(60000);
  const [portfolio,    setPortfolio]    = useState(null);
  const [marketNews,   setMarketNews]   = useState(null);
  const [tab,          setTab]          = useState("schedule");
  const [prevTab,      setPrevTab]      = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/market/portfolio`)
      .then((r) => r.json()).then(setPortfolio).catch(() => {});

    const fetchNews = () =>
      fetch(`${API_BASE}/api/market/news`)
        .then((r) => r.json()).then(setMarketNews).catch(() => {});
    fetchNews();
    const t = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  function switchTab(id) {
    if (id === tab) return;
    setPrevTab(tab);
    setTab(id);
  }

  return (
    <>
      {/* ── Header ── */}
      <header className="nova-header">
        <h1><span className="pulse-dot" />NOVA</h1>
        <span className="timestamp">{formatThaiDate()}</span>
      </header>

      {/* ── Tab bar ── */}
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? "tab-btn--active" : ""}`}
            onClick={() => switchTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
        <div className="tab-refresh-info">
          อัปเดต {formatTime(lastUpdated)}
          {loading && <span className="tab-loading"> ·  ...</span>}
        </div>
      </nav>

      {/* ── Error ── */}
      {error && (
        <div className="error-state" style={{ marginBottom: 16 }}>
          {error}
          <button onClick={refetch} className="error-retry">ลองใหม่</button>
        </div>
      )}

      {/* ── Loading (first load) ── */}
      {loading && !data && (
        <div className="page-loading">
          <div className="page-loading-dot" /><div className="page-loading-dot" /><div className="page-loading-dot" />
        </div>
      )}

      {/* ── Pages ── */}
      {data && (
        <div className="tab-page" key={tab}>

          {/* ── ตารางงาน ── */}
          {tab === "schedule" && (
            <div className="schedule-page">
              <CalendarView selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              <div className="page-grid page-grid--schedule">
                <ScheduleToday
                  events={data.events}
                  upcoming={data.upcoming}
                  onRefetch={refetch}
                  selectedDate={selectedDate}
                />
                <TaskList tasks={data.tasks} />
              </div>
            </div>
          )}

          {/* ── หุ้น ── */}
          {tab === "market" && (
            <div className="page-grid page-grid--market">
              <MarketSnapshot market={data.market} portfolio={portfolio} />
              <MarketNews news={marketNews} />
            </div>
          )}

          {/* ── Trend ── */}
          {tab === "trend" && (
            <div className="page-grid page-grid--trend">
              <TrendProduct trend={data.trend} />
            </div>
          )}

        </div>
      )}

      {/* ── Study tab (independent fetch, no briefing dep) ── */}
      {tab === "study" && (
        <div className="tab-page" key="study">
          <StudyPage />
        </div>
      )}
    </>
  );
}
