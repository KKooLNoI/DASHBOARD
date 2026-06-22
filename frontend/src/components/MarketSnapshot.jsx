const moodLabel = {
  risk_on: { text: "🟢 Risk-On", className: "up" },
  risk_off: { text: "🔴 Risk-Off", className: "down" },
  mixed:    { text: "🟡 Mixed",   className: "" },
};

// TradingView symbol map สำหรับ index พิเศษ
const TV_SYMBOL = {
  "S&P 500": "SP:SPX",
  NASDAQ:    "NASDAQ:IXIC",
  "XAU/USD": "TVC:GOLD",
  DOW:       "DJ:DJI",
};

function tvUrl(ticker) {
  const sym = TV_SYMBOL[ticker] || ticker;
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
}

function ChangeBadge({ pct, direction }) {
  const sign = pct >= 0 ? "+" : "";
  return <span className={`market-change ${direction}`}>{sign}{pct}%</span>;
}

function IndexRow({ label, price, changePct, direction }) {
  return (
    <a className="market-row market-row--link" href={tvUrl(label)} target="_blank" rel="noopener noreferrer">
      <span className="market-label">{label}</span>
      <span className="market-value">{price.toLocaleString()}</span>
      <ChangeBadge pct={changePct} direction={direction} />
      <span className="tv-icon">↗</span>
    </a>
  );
}

export default function MarketSnapshot({ market, portfolio }) {
  if (!market) return null;
  const mood = moodLabel[market.mood] || moodLabel.mixed;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="accent-bar" />
          Market Snapshot
        </span>
        <span className="tv-hint">คลิกดูกราฟ ↗</span>
      </div>

      <IndexRow label="S&P 500" {...market.sp500} />
      <IndexRow label="NASDAQ"  {...market.nasdaq} />
      <IndexRow label="XAU/USD" {...market.xauUsd} />

      <span className={`mood-badge ${mood.className}`}>{mood.text}</span>

      {portfolio && portfolio.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="panel-title" style={{ marginBottom: 10, fontSize: 11 }}>
            Portfolio ({portfolio.length} positions)
          </div>
          <div className="portfolio-grid">
            {portfolio.map((p) => (
              <a
                key={p.ticker}
                className="ticker-chip ticker-chip--link"
                href={tvUrl(p.ticker)}
                target="_blank"
                rel="noopener noreferrer"
                title={`ดูกราฟ ${p.ticker} บน TradingView`}
              >
                <div className="ticker-symbol">{p.ticker}</div>
                <div className={`ticker-change ${p.direction}`}>
                  {p.direction === "up" ? "+" : ""}{p.changePct}%
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
