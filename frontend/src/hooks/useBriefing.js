import { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function useBriefing(refreshIntervalMs = 60000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/briefing/today`);
      if (!res.ok) throw new Error("Network response was not ok");
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError("ดึงข้อมูลไม่ได้ตอนนี้ — เช็คว่า backend รันอยู่หรือไม่");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
    const interval = setInterval(fetchBriefing, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchBriefing, refreshIntervalMs]);

  return { data, loading, error, lastUpdated, refetch: fetchBriefing };
}
