// services/marketNews.js
// ข่าวจาก Yahoo Finance RSS + ราคาจาก Yahoo Finance API
// แปลภาษาไทย: Google Translate (ฟรี) | Claude (ถ้ามี ANTHROPIC_API_KEY)

import Anthropic from "@anthropic-ai/sdk";

const RSS_URL =
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,%5EDJI&region=US&lang=en-US";

const PRICE_TICKERS = { sp500: "%5EGSPC", nasdaq: "%5EIXIC", dow: "%5EDJI" };

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

// ─── HTML / XML helpers ──────────────────────────────────────────────────────

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x2019;/g, "'").replace(/&#x2018;/g, "'")
    .replace(/&#x201[Cc]/g, '"').replace(/&#x201[Dd]/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function extractTag(xml, tag) {
  return (
    xml.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`))?.[1] ||
    xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] || ""
  ).trim();
}

// ─── Sentiment ───────────────────────────────────────────────────────────────

const BULL = /\b(gain|rise|rally|surge|climb|jump|record|high|up|beat|strong|soar|bull|optimis)\b/i;
const BEAR = /\b(fall|drop|plunge|slide|down|decline|weak|miss|fear|warn|slump|crash|bear|risk|hike|alarm|concern)\b/i;

function sentiment(title, desc) {
  const t = `${title} ${desc}`;
  const b = (t.match(BULL) || []).length;
  const e = (t.match(BEAR) || []).length;
  return b > e ? "bullish" : e > b ? "bearish" : "neutral";
}

// ─── Translation ─────────────────────────────────────────────────────────────

async function gtranslate(text) {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=" +
      encodeURIComponent(text);
    const r = await fetch(url);
    const d = await r.json();
    return d[0].map((seg) => seg[0]).join("").trim();
  } catch {
    return text; // fallback: original
  }
}

async function translateAll(texts) {
  return Promise.all(texts.map(gtranslate));
}

// สรุปอัตโนมัติจาก translated headlines (ใช้เมื่อไม่มี Claude key)
function autoSummary(indices, headlines) {
  const sp = indices.sp500;
  const nq = indices.nasdaq;
  const dir = sp?.direction === "up" ? "ปิดบวก" : "ปิดลบ";
  const pct = sp ? `${sp.changePct > 0 ? "+" : ""}${sp.changePct}%` : "";
  const bearCount = headlines.filter((h) => h.sentiment === "bearish").length;
  const mood = bearCount >= 3 ? "บรรยากาศการลงทุนระมัดระวัง" : "บรรยากาศการลงทุนเป็นบวก";
  return `ตลาดหุ้นสหรัฐฯ ${dir} S&P 500 ${pct} NASDAQ ${nq?.changePct > 0 ? "+" : ""}${nq?.changePct ?? 0}% ประเด็นหลักจากข่าว: ${headlines[0]?.headline || "—"} ${mood} นักลงทุนควรติดตามสัญญาณ Fed และทิศทางดอลลาร์ใกล้ชิด`;
}

// Claude — แปลพร้อมเขียนสรุปคุณภาพสูงใน call เดียว
async function claudeTranslate(headlines) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const prompt = `แปลหัวข่าวตลาดหุ้นสหรัฐฯ ต่อไปนี้เป็นภาษาไทยกระชับ และเขียนสรุปภาพรวมตลาด 2-3 ประโยค

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"summary":"สรุปทิศทางตลาด ปัจจัยสำคัญ ผลกระทบนักลงทุน","headlines":["ไทย1","ไทย2","ไทย3","ไทย4","ไทย5"],"summaries":["สรุปข่าว1ภาษาไทย","สรุปข่าว2ภาษาไทย","สรุปข่าว3ภาษาไทย","สรุปข่าว4ภาษาไทย","สรุปข่าว5ภาษาไทย"]}

ข่าว:
${headlines.slice(0, 5).map((h, i) => `${i + 1}. หัวข่าว: ${h.headline}\n   สรุป: ${h.summary}`).join("\n")}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });
    const raw  = msg.content[0]?.text || "{}";
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");
    return {
      summary:   json.summary   || null,
      headlines: json.headlines || [],
      summaries: json.summaries || [],
    };
  } catch {
    return null;
  }
}

// ─── Price fetcher ────────────────────────────────────────────────────────────

async function fetchPrice(key) {
  try {
    const r    = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${PRICE_TICKERS[key]}?interval=1d&range=1d`,
      { headers: FETCH_HEADERS }
    );
    const json = await r.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose;
    const changePct = prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0;
    return { price, changePct, direction: changePct >= 0 ? "up" : "down" };
  } catch {
    return null;
  }
}

// ─── News RSS fetcher ─────────────────────────────────────────────────────────

async function fetchNews() {
  const r   = await fetch(RSS_URL, { headers: FETCH_HEADERS });
  const xml = await r.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, c], i) => {
    const title = decodeHtml(extractTag(c, "title"));
    const desc  = decodeHtml(extractTag(c, "description"));
    const link  = extractTag(c, "link").replace(/\?.tsrc=rss$/, "");
    return {
      id:        `n${i}`,
      headline:  title,
      summary:   desc || title,
      source:    guessSource(link),
      sentiment: sentiment(title, desc),
      tickers:   [],
      link,
    };
  });
}

function guessSource(link) {
  if (link.includes("fool.com"))      return "Motley Fool";
  if (link.includes("cnbc.com"))      return "CNBC";
  if (link.includes("bloomberg"))     return "Bloomberg";
  if (link.includes("reuters"))       return "Reuters";
  if (link.includes("marketwatch"))   return "MarketWatch";
  if (link.includes("wsj.com"))       return "WSJ";
  if (link.includes("stocktwits"))    return "StockTwits";
  if (link.includes("thestreet"))     return "TheStreet";
  return "Yahoo Finance";
}

// ─── Market status ────────────────────────────────────────────────────────────

function nyMins() {
  const now = new Date();
  return (now.getUTCHours() - 4) * 60 + now.getUTCMinutes(); // EDT = UTC-4
}
function isUSMarketOpen() {
  const d = new Date().getUTCDay();
  if (d === 0 || d === 6) return false;
  const m = nyMins();
  return m >= 9 * 60 + 30 && m < 16 * 60;
}
function isPostClose() {
  const d = new Date().getUTCDay();
  if (d === 0 || d === 6) return false;
  const m = nyMins();
  return m >= 16 * 60 && m < 22 * 60;
}

// ─── Top movers ───────────────────────────────────────────────────────────────

const TICKER_MAP = { SpaceX:"SpaceX", Robinhood:"HOOD", Booking:"BKNG", Honeywell:"HON", Lam:"LRCX" };
const TICKERS = ["NVDA","TSLA","AAPL","MSFT","META","AMZN","GOOGL","AMD","PLTR","RKLB","INTC","NFLX","SMH","ABBV","KO","BAC","COST","JNJ","LLY","SpaceX","Robinhood","Booking","Honeywell","Lam"];

function guessTickerFromTitle(t) {
  for (const k of TICKERS) if (t.includes(k)) return TICKER_MAP[k] || k;
  return null;
}

function deriveMovers(headlines) {
  const pick = (filter) =>
    headlines.filter((h) => h.sentiment === filter).slice(0, 3)
      .map((h) => ({ ticker: guessTickerFromTitle(h.headline) }))
      .filter((m) => m.ticker);
  return { gainers: pick("bullish"), losers: pick("bearish") };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getMarketNews() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const [sp500, nasdaq, dow, headlines] = await Promise.all([
    fetchPrice("sp500"),
    fetchPrice("nasdaq"),
    fetchPrice("dow"),
    fetchNews(),
  ]);

  const top5 = headlines.slice(0, 5);

  // 1) ลอง Claude ก่อน (คุณภาพดีกว่า, แปลพร้อมสรุปใน call เดียว)
  // 2) ถ้าไม่มี key → ใช้ Google Translate ฟรี + สร้างสรุปอัตโนมัติ
  let aiSummary = null;
  let localizedHeadlines;

  const claude = await claudeTranslate(top5);

  if (claude && claude.headlines.length > 0) {
    aiSummary = claude.summary;
    localizedHeadlines = top5.map((h, i) => ({
      ...h,
      headline:   claude.headlines[i] || h.headline,
      summary:    claude.summaries[i] || h.summary,
      headlineEn: claude.headlines[i] ? h.headline : null,
    }));
  } else {
    // Google Translate fallback — แปล headline + summary พร้อมกัน
    const [thHeadlines, thSummaries] = await Promise.all([
      translateAll(top5.map((h) => h.headline)),
      translateAll(top5.map((h) => h.summary)),
    ]);
    localizedHeadlines = top5.map((h, i) => ({
      ...h,
      headline:   thHeadlines[i]  || h.headline,
      summary:    thSummaries[i]  || h.summary,
      headlineEn: h.headline,
    }));
    const indices = { sp500, nasdaq, dow };
    aiSummary = autoSummary(indices, localizedHeadlines);
  }

  const lastCloseLabel = new Date().toLocaleDateString("th-TH", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
  });

  _cache = {
    isMarketOpen: isUSMarketOpen(),
    isPostClose:  isPostClose(),
    lastCloseLabel,
    aiSummary,
    indices: {
      sp500:  sp500  ?? { price: 0, changePct: 0, direction: "up" },
      nasdaq: nasdaq ?? { price: 0, changePct: 0, direction: "up" },
      dow:    dow    ?? { price: 0, changePct: 0, direction: "up" },
    },
    headlines: localizedHeadlines,
    topMovers: deriveMovers(headlines),
  };
  _cacheAt = Date.now();
  return _cache;
}
