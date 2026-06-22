// routes/market.js
import express from "express";
import { getMarketSnapshot, getPortfolio } from "../services/market.js";
import { getMarketNews } from "../services/marketNews.js";

const router = express.Router();

router.get("/snapshot", async (req, res) => {
  try {
    const snapshot = await getMarketSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error("market/snapshot error:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลตลาดได้ตอนนี้" });
  }
});

router.get("/portfolio", async (req, res) => {
  try {
    const portfolio = await getPortfolio();
    res.json(portfolio);
  } catch (err) {
    console.error("market/portfolio error:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูล portfolio ได้ตอนนี้" });
  }
});

router.get("/news", async (req, res) => {
  try {
    const news = await getMarketNews();
    res.json(news);
  } catch (err) {
    console.error("market/news error:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลข่าวได้ตอนนี้" });
  }
});

export default router;
