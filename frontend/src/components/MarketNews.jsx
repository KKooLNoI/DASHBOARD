const SENTIMENT = {
  bullish: { label: "Bullish", cls: "sentiment-bullish" },
  bearish: { label: "Bearish", cls: "sentiment-bearish" },
  neutral: { label: "Neutral", cls: "sentiment-neutral" },
};

function IndexPill({ label, price, changePct, direction }) {
  const sign = changePct >= 0 ? "+" : "";
  return (
    <div className="news-index-pill">
      <span className="news-index-label">{label}</span>
      <span className="news-index-price">
        {price ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
      </span>
      {price > 0 && (
        <span className={`market-change ${direction}`}>
          {sign}{changePct}%
        </span>
      )}
    </div>
  );
}

function tvUrl(ticker) {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(ticker)}`;
}

function TickerChip({ ticker, direction }) {
  return (
    <a
      className={`mover-chip ${direction ?? ""}`}
      href={tvUrl(ticker)}
      target="_blank"
      rel="noopener noreferrer"
      title={`ดูกราฟ ${ticker}`}
    >
      {ticker} ↗
    </a>
  );
}

export default function MarketNews({ news }) {
  if (!news) return null;

  const {
    isMarketOpen, isPostClose, lastCloseLabel,
    indices, headlines, topMovers, aiSummary,
  } = news;

  const statusLabel = isMarketOpen
    ? { text: "OPEN",        cls: "market-status-open"   }
    : isPostClose
    ? { text: "AFTER HOURS", cls: "market-status-ah"     }
    : { text: "CLOSED",      cls: "market-status-closed" };

  const hasMovers =
    (topMovers?.gainers?.length > 0) || (topMovers?.losers?.length > 0);

  return (
    <div className="panel">
      {/* ── Header ── */}
      <div className="panel-header">
        <span className="panel-title">
          <span className="accent-bar" style={{ background: "var(--amber)" }} />
          US Market News
          <span className="market-close-date">อัปเดต {lastCloseLabel}</span>
        </span>
        <span className={`market-status-badge ${statusLabel.cls}`}>
          {statusLabel.text}
        </span>
      </div>

      {/* ── Index strip ── */}
      <div className="news-index-row">
        <IndexPill label="S&P 500" {...indices.sp500} />
        <IndexPill label="NASDAQ"  {...indices.nasdaq} />
        <IndexPill label="DOW"     {...indices.dow} />
      </div>

      {/* ── AI Summary ── */}
      {aiSummary && (
        <div className="news-ai-summary">
          <span className="news-ai-badge">✦ AI Summary</span>
          <p className="news-ai-text">{aiSummary}</p>
        </div>
      )}

      {/* ── Top movers from news ── */}
      {hasMovers && (
        <div className="news-movers-row">
          {topMovers.gainers?.length > 0 && (
            <>
              <span className="news-movers-label">Bullish picks</span>
              {topMovers.gainers.map((m) => (
                <TickerChip key={m.ticker} ticker={m.ticker} direction="up" />
              ))}
            </>
          )}
          {topMovers.gainers?.length > 0 && topMovers.losers?.length > 0 && (
            <span className="news-movers-divider" />
          )}
          {topMovers.losers?.length > 0 && (
            <>
              <span className="news-movers-label">Bearish</span>
              {topMovers.losers.map((m) => (
                <TickerChip key={m.ticker} ticker={m.ticker} direction="down" />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Headlines ── */}
      <div className="news-headlines">
        {headlines.map((item) => {
          const s = SENTIMENT[item.sentiment] ?? SENTIMENT.neutral;
          return (
            <a
              key={item.id}
              className="news-card"
              href={item.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="news-card-top">
                <span className={`news-sentiment ${s.cls}`}>{s.label}</span>
                <span className="news-source">{item.source}</span>
              </div>
              <div className="news-headline">{item.headline}</div>
              {item.summary && item.summary !== item.headline && (
                <div className="news-summary">{item.summary}</div>
              )}
            </a>
          );
        })}
      </div>

      <div className="news-footer">
        แหล่งข้อมูล: Yahoo Finance RSS · ราคาอัปเดตทุก 10 นาที
      </div>
    </div>
  );
}
