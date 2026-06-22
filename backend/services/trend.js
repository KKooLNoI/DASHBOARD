// services/trend.js
// Phase 1: real X trends + curated product recs — Phase 2: X API v2 + Claude matching

function xUrl(tag) {
  return `https://x.com/search?q=${encodeURIComponent(tag)}&src=trend_click`;
}
function shopeeUrl(q) {
  return `https://shopee.co.th/search?keyword=${encodeURIComponent(q)}`;
}
function lazadaUrl(q) {
  return `https://www.lazada.co.th/catalog/?q=${encodeURIComponent(q)}`;
}

function mockTrends() {
  const raw = [
    { tag: "#GMMTVOuting2026",               category: "entertainment" },
    { tag: "#บวงสรวงซีรีส์วาดฝันวันวิวาห์",  category: "entertainment" },
    { tag: "LINGORM ILF WORSHIP",            category: "entertainment" },
    { tag: "SKYNANI CHILL TOGETHER",         category: "entertainment" },
    { tag: "WILLIAMEST DAYDRIFT",            category: "entertainment" },
    { tag: "PONDPHUWIN OFF DUTY 2026",       category: "entertainment" },
    { tag: "#เบื้องหลังMVกลิ่นฝน",           category: "music"         },
    { tag: "BTS TFO 1ST SINGLE DUO",        category: "kpop"          },
    { tag: "#NEXnattakit",                   category: "entertainment" },
    { tag: "NEX 21st HBD",                  category: "entertainment" },
    { tag: "BRIGHT LFW 2026",               category: "fashion"       },
    { tag: "#KarismaxKengNamping",           category: "entertainment" },
    { tag: "SAMSUNG A56 X GEMINIFOURTH",    category: "tech"          },
    { tag: "GRABFOOD WITH TEETEEPOR",       category: "lifestyle"     },
    { tag: "ENGFA GALA THE STAIN",          category: "entertainment" },
    { tag: "XIAO ZHAN TSINGTAO 1903",       category: "kpop"          },
  ];

  const products = [
    {
      id: "p1",
      emoji: "📸",
      name: "GMMTV Official Photobook & Collectible Cards",
      category: "บันเทิง / แฟนเมิร์ช",
      matchedTrend: "#GMMTVOuting2026",
      angle: "Outing ปี 2026 มาแล้ว! Photobook และ Collectible Card ของนักแสดงในดวงใจ — ของสะสมที่แฟนซีรีส์ต้องมี ราคาพุ่งหลัง outing",
      priceRange: "฿290 – ฿890",
      hashtags: ["#GMMTVOuting2026", "#ของมันต้องมี", "#แฟนเมิร์ช"],
      shopee: shopeeUrl("GMMTV photobook collectible card"),
      lazada: lazadaUrl("GMMTV official merchandise"),
      hot: true,
    },
    {
      id: "p2",
      emoji: "💜",
      name: "BTS TFO อัลบั้ม + Weverse Merch",
      category: "K-Pop / เมิร์ช",
      matchedTrend: "BTS TFO 1ST SINGLE DUO",
      angle: "BTS ปล่อยซิงเกิ้ลใหม่! อัลบั้ม TFO และเมิร์ชชุดใหม่ขายเร็วมาก — Army ทั่วโลกกำลังออร์เดอร์อยู่ตอนนี้",
      priceRange: "฿450 – ฿1,290",
      hashtags: ["BTS TFO 1ST SINGLE DUO", "#BTS", "#ARMY"],
      shopee: shopeeUrl("BTS TFO album official"),
      lazada: lazadaUrl("BTS official album 2026"),
      hot: true,
    },
    {
      id: "p3",
      emoji: "👗",
      name: "ชุดลุค Minimalist / Monochrome สไตล์ LFW",
      category: "แฟชั่น",
      matchedTrend: "BRIGHT LFW 2026",
      angle: "ลุคที่ Bright ใส่บน London Fashion Week — ชุด minimal สีเดียว ดูแพง ไม่ต้องแพงจริง หาได้บน Shopee ราคาหลักร้อย",
      priceRange: "฿390 – ฿1,590",
      hashtags: ["BRIGHT LFW 2026", "#OOTD", "#แฟชั่น", "#minimal"],
      shopee: shopeeUrl("minimal monochrome outfit fashion 2026"),
      lazada: lazadaUrl("minimalist fashion set"),
      hot: false,
    },
    {
      id: "p4",
      emoji: "📱",
      name: "เคส Samsung Galaxy A56 ลาย GEMINIFOURTH",
      category: "เทค / อุปกรณ์เสริม",
      matchedTrend: "SAMSUNG A56 X GEMINIFOURTH",
      angle: "Samsung A56 เปิดตัวร่วมกับ GEMINIFOURTH — เคสลายซีรีส์มาพร้อมกัน ออกแล้ว ขายดีมากบน Shopee",
      priceRange: "฿89 – ฿390",
      hashtags: ["SAMSUNG A56 X GEMINIFOURTH", "#Samsung", "#เคสมือถือ"],
      shopee: shopeeUrl("เคส samsung a56 geminifourth"),
      lazada: lazadaUrl("samsung galaxy a56 case"),
      hot: true,
    },
    {
      id: "p5",
      emoji: "☀️",
      name: "กันแดด SPF50+ / Sunscreen Serum",
      category: "สกินแคร์ / Beauty",
      matchedTrend: "อากาศร้อนจัดทั่วประเทศ",
      angle: "UV สูงสุดในรอบปี! กันแดด SPF50+ เป็นสินค้าขายดีอันดับ 1 บน Shopee-Lazada มิ.ย. 2026 — คนซื้อเพิ่มขึ้น 3x",
      priceRange: "฿199 – ฿890",
      hashtags: ["#กันแดด", "#skincare", "#ของมันต้องมี"],
      shopee: shopeeUrl("กันแดด SPF50 sunscreen 2026"),
      lazada: lazadaUrl("sunscreen spf50 serum"),
      hot: true,
    },
    {
      id: "p6",
      emoji: "🍱",
      name: "Meal Kit / อุปกรณ์ทำอาหารตาม Teeteepor",
      category: "ไลฟ์สไตล์ / อาหาร",
      matchedTrend: "GRABFOOD WITH TEETEEPOR",
      angle: "เทรนด์ทำอาหารตาม Teeteepor — meal kit และอุปกรณ์ครัว ขายดีตามคลิปไวรัล ต้นทุนต่ำ margin สูง",
      priceRange: "฿149 – ฿690",
      hashtags: ["GRABFOOD WITH TEETEEPOR", "#ทำอาหาร", "#mealkit"],
      shopee: shopeeUrl("meal kit ทำอาหาร อุปกรณ์ครัว"),
      lazada: lazadaUrl("meal kit cooking set"),
      hot: false,
    },
    {
      id: "p7",
      emoji: "🎽",
      name: "ชุดออกกำลังกาย / อุปกรณ์ฟิตเนส",
      category: "สุขภาพ / Sport",
      matchedTrend: "เทรนด์ดูแลสุขภาพ 2026",
      angle: "ตลาด Sport & Wellness โต 10x YoY บน Lazada — ชุด gym, resistance band, protein shaker ขายดีตลอดปี โดยเฉพาะช่วงกลางปี",
      priceRange: "฿99 – ฿1,290",
      hashtags: ["#ออกกำลังกาย", "#ฟิตเนส", "#healthy"],
      shopee: shopeeUrl("ชุดออกกำลังกาย fitness อุปกรณ์"),
      lazada: lazadaUrl("fitness equipment sport set"),
      hot: false,
    },
  ];

  return {
    xTrending: raw.map(({ tag, category }) => ({
      hashtag: tag,
      category,
      url: xUrl(tag),
    })),
    facebookTopics: ["อากาศร้อนจัดทั่วประเทศ", "เทศกาลลดราคาปลายเดือน"],
    products,
    // keep old field for backward compat
    recommendedProduct: products[0]
      ? { category: products[0].category, matchedTrend: products[0].matchedTrend, angle: products[0].angle, hashtags: products[0].hashtags }
      : null,
    skippedSensitive: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function getTrendSnapshot() {
  return mockTrends();
}
