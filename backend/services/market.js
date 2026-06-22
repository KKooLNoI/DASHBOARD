// services/market.js
// Phase 1: mock data — Phase 2: แทนด้วย yfinance/financial API จริง
// Portfolio list อ้างอิงจาก 30-stock portfolio ของผู้ใช้

const PORTFOLIO = [
  "GOOGL", "RKLB", "NVDA", "TSM", "ASML", "AMD", "AMZN", "SMH", "JNJ", "QQQ",
  "VOO", "AAPL", "LLY", "JEPQ", "TSLA", "ABBV", "KO", "IVV", "O", "QQQI",
  "BAC", "PEP", "COST", "SGOV", "SHV", "BIL", "META", "PLTR", "MSFT", "GOLD",
];

function mockSnapshot() {
  return {
    sp500: { price: 6142.35, changePct: 0.42, direction: "up" },
    nasdaq: { price: 21834.12, changePct: 0.68, direction: "up" },
    xauUsd: { price: 3387.5, changePct: -0.15, direction: "down" },
    mood: "risk_on", // risk_on | risk_off | mixed
    updatedAt: new Date().toISOString(),
  };
}

function mockPortfolio() {
  // mock ราคาแบบสุ่มเบาๆ รอบค่าฐาน ให้ดูสมจริงพอใช้ทดสอบ UI
  return PORTFOLIO.map((ticker) => {
    const base = 100 + (ticker.length * 7);
    const changePct = Math.round((Math.sin(ticker.length) * 3) * 100) / 100;
    return {
      ticker,
      price: Math.round(base * 1.5 * 100) / 100,
      changePct,
      direction: changePct >= 0 ? "up" : "down",
    };
  });
}

export async function getMarketSnapshot() {
  // Phase 2: ดึงจาก yfinance backend service หรือ financial API จริง
  return mockSnapshot();
}

export async function getPortfolio() {
  return mockPortfolio();
}

export { PORTFOLIO };
