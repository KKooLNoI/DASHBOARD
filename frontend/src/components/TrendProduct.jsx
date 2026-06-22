const CAT_LABEL = {
  entertainment: { label: "🎬 บันเทิง",    cls: "cat-ent"  },
  kpop:          { label: "🎵 K-Pop",      cls: "cat-kpop" },
  music:         { label: "🎶 เพลง",       cls: "cat-music"},
  fashion:       { label: "👗 แฟชั่น",     cls: "cat-fash" },
  tech:          { label: "📱 เทค",        cls: "cat-tech" },
  lifestyle:     { label: "🍔 ไลฟ์สไตล์",  cls: "cat-life" },
  general:       { label: "🔥 ทั่วไป",     cls: "cat-gen"  },
};

function HashtagPill({ hashtag, url, category }) {
  const cat = CAT_LABEL[category] || CAT_LABEL.general;
  const isHashtag = hashtag.startsWith("#");
  return (
    <a
      className={`hashtag-pill hashtag-pill--link ${cat.cls}`}
      href={url || `https://x.com/search?q=${encodeURIComponent(hashtag)}&src=trend_click`}
      target="_blank"
      rel="noopener noreferrer"
      title={`ค้นหา "${hashtag}" บน X`}
    >
      {isHashtag ? hashtag : `🔍 ${hashtag}`}
    </a>
  );
}

function ProductCard({ product }) {
  return (
    <div className={`product-card ${product.hot ? "product-card--hot" : ""}`}>
      {product.hot && <span className="product-hot-badge">🔥 HOT</span>}

      <div className="product-card-header">
        <span className="product-emoji">{product.emoji}</span>
        <div className="product-meta">
          <div className="product-category">{product.category}</div>
          <div className="product-trend-tag">
            <a
              href={`https://x.com/search?q=${encodeURIComponent(product.matchedTrend)}&src=trend_click`}
              target="_blank"
              rel="noopener noreferrer"
              className="product-trend-link"
            >
              ↑ {product.matchedTrend}
            </a>
          </div>
        </div>
      </div>

      <div className="product-name">{product.name}</div>
      <div className="product-angle">{product.angle}</div>

      <div className="product-hashtags">
        {product.hashtags.map((h) => (
          <a
            key={h}
            className="hashtag-pill hashtag-pill--link"
            href={`https://x.com/search?q=${encodeURIComponent(h)}&src=trend_click`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {h}
          </a>
        ))}
      </div>

      <div className="product-footer">
        <span className="product-price">{product.priceRange}</span>
        <div className="product-shop-links">
          <a className="shop-btn shop-btn--shopee" href={product.shopee} target="_blank" rel="noopener noreferrer">
            🛒 Shopee
          </a>
          <a className="shop-btn shop-btn--lazada" href={product.lazada} target="_blank" rel="noopener noreferrer">
            🔶 Lazada
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TrendProduct({ trend }) {
  if (!trend) return null;

  const groups = {};
  for (const t of trend.xTrending) {
    const cat = t.category || "general";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">
          <span className="accent-bar" />
          🔥 Trending บน X &amp; สินค้าแนะนำ
        </span>
        <span className="trend-count">{trend.xTrending.length} topics · {trend.products?.length ?? 0} สินค้า</span>
      </div>

      {/* X Trending hashtags */}
      <div className="trend-groups">
        {Object.entries(groups).map(([cat, items]) => {
          const info = CAT_LABEL[cat] || CAT_LABEL.general;
          return (
            <div key={cat} className="trend-group">
              <span className="trend-group-label">{info.label}</span>
              <div className="trend-group-pills">
                {items.map((t) => <HashtagPill key={t.hashtag} {...t} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="trend-section-divider">
        <span className="trend-section-label">🎯 สินค้าแนะนำตาม Trend</span>
      </div>

      {/* Product grid */}
      {trend.products?.length > 0 && (
        <div className="product-grid">
          {trend.products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Facebook topics */}
      {trend.facebookTopics?.length > 0 && (
        <div className="fb-topics">
          <div className="trend-group-label">📘 Facebook</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {trend.facebookTopics.map((t) => (
              <span key={t} className="hashtag-pill">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
