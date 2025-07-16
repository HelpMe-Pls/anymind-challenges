import { Database } from "bun:sqlite";
import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { CryptoApiSchema, NewsApiSchema, WeatherApiSchema } from "./schema";

const OPENWEATHER_API_KEY = Bun.env.OPENWEATHER_API_KEY ?? "";
const NEWSAPI_API_KEY = Bun.env.NEWSAPI_API_KEY ?? "";

// Initialize Express app
const app: Express = express();
app.use(cors());
const port = 3000;

// Initialize SQLite DB (built-in to Bun; file-based for simplicity)
// Trade-off: SQLite is quick for tests but single-writer (fine for demo). Alternative: PostgreSQL via pg driver for concurrency.
const db = new Database("app.db", { create: true });

// Create tables if not exist (idempotent; run on startup)
// We're using simple schemas to normalize data: one table per API source for easy querying/aggregation.
// Alternative: A single JSONB column in PostgreSQL for flexible storage without multiple tables.
db.exec(`
  CREATE TABLE IF NOT EXISTS crypto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    market_cap REAL NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    temperature REAL NOT NULL,
    condition TEXT NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Function to fetch and normalize data from APIs
// Uses Bun's built-in fetch (no deps). Handles errors gracefully.
// Fetches Bitcoin data (as in example); extend for more coins if needed.
// Normalizes to match the required unified format.
async function fetchAndStoreData() {
  try {
    // Clear old data (simulating a simple refresh; in prod, use UPSERT or timestamps for deltas)
    db.exec("DELETE FROM crypto; DELETE FROM weather; DELETE FROM news;");

    // Fetch Multiple Cryptos (Bitcoin + Ethereum for filtering demo)
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true"
    );
    const cryptoData = CryptoApiSchema.parse(await cryptoRes.json());

    const bitcoin = cryptoData.bitcoin;
    db.prepare(
      "INSERT INTO crypto (name, symbol, price, market_cap) VALUES (?, ?, ?, ?)"
    ).run("Bitcoin", "BTC", bitcoin.usd, bitcoin.usd_market_cap);

    const ethereum = cryptoData.ethereum;
    db.prepare(
      "INSERT INTO crypto (name, symbol, price, market_cap) VALUES (?, ?, ?, ?)"
    ).run("Ethereum", "ETH", ethereum.usd, ethereum.usd_market_cap);

    // Fetch Weather (OpenWeather - HCMC as default; requires key)
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Ho%20Chi%20Minh&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const weatherData = WeatherApiSchema.parse(await weatherRes.json());

    const weatherCondition = weatherData.weather[0]?.main;
    if (!weatherCondition) {
      console.warn("No weather condition found; skipping insertion.");
      return; // Or throw; keeping simple for test
    }

    db.prepare(
      "INSERT INTO weather (city, temperature, condition) VALUES (?, ?, ?)"
    ).run("Ho Chi Minh", weatherData.main.temp, weatherCondition);

    // Fetch Multiple News (top 5 US headlines for search demo). Using `JSONPlaceholder` alternative if key issues, but we're sticking to spec for now)
    // Alternative: Use `JSONPlaceholder` for mock news (e.g., fetch posts as "news") to avoid key dependency.
    const newsRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=12&apiKey=${NEWSAPI_API_KEY}`
    );
    const newsData = NewsApiSchema.parse(await newsRes.json());
    // Runtime check to narrow type (satisfies TS; Zod .nonempty() throws if empty, but we handle gracefully)
    const topArticle = newsData.articles[0];
    if (!topArticle) {
      console.warn("No news articles found; skipping insertion...");
      return;
    }

    const insertNews = db.prepare(
      "INSERT INTO news (title, source, url) VALUES (?, ?, ?)"
    );
    for (const article of newsData.articles) {
      insertNews.run(article.title, article.source.name, article.url);
    }

    console.log("Data fetched and stored successfully.");
  } catch (error) {
    console.error("Error fetching/storing data:", error);
    // In prod, add retry logic or alerts (e.g., via Sentry).
  }
}

// Fetch and store on server startup (fulfills "store the combined data" requirement)
// Alternative: Run this in a cron job (add `node-cron` dep) for periodic updates without restarting server.
fetchAndStoreData();

// Rate Limiting (Part 3)
// In-memory store: Map<ip, {count: number, resetTime: number}>
// Limit: 5 requests per 60 seconds per IP.
// Trade-off: Simple and dep-free, but not persistent (lost on restart). Prod: Use Redis with TTL keys.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

// Middleware: Check rate limit by IP
const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // Reset window
    record = { count: 0, resetTime: now + WINDOW_MS };
  }

  if (record.count > RATE_LIMIT) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: "Too many requests, please wait before retrying.",
    });
  }

  record.count++;
  rateLimitStore.set(ip, record);
  next();
};

// Endpoint: /aggregated-data
// Queries DB and aggregates into single JSON (normalized/unified format).
// If DB empty, could re-fetch here, but we pre-fetch on startup for efficiency.
app.get("/aggregated-data", rateLimiter, (_req: Request, res: Response) => {
  const cryptos = db.prepare("SELECT * FROM crypto").all() as Array<{
    name: string;
    symbol: string;
    price: number;
    market_cap: number;
  }>;
  const weathers = db.prepare("SELECT * FROM weather LIMIT 1").all() as Array<{
    city: string;
    temperature: number;
    condition: string;
  }>; // Still single, but array for consistency
  const newsItems = db.prepare("SELECT * FROM news").all() as Array<{
    title: string;
    source: string;
    url: string;
  }>;

  if (cryptos.length === 0 || weathers.length === 0 || newsItems.length === 0) {
    return res.status(500).json({ error: "Data not available." });
  }

  const aggregated = {
    crypto: cryptos,
    weather: weathers[0],
    latest_news: newsItems,
  };

  res.json(aggregated);
});

// New Endpoint: /weather?city=... (for dynamic city updates)
app.get("/weather", rateLimiter, async (req: Request, res: Response) => {
  const city = (req.query.city as string) || "New York";
  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const weatherData = WeatherApiSchema.parse(await weatherRes.json());
    const condition = weatherData.weather[0]?.main;
    if (!condition) {
      return res.status(400).json({ error: "Invalid weather data." });
    }
    // Optionally store in DB; here, just return fresh data
    const result = {
      city,
      temperature: weatherData.main.temp,
      condition,
    };
    res.json(result);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res.status(500).json({ error: "Failed to fetch weather." });
  }
});

// Default route
app.get("/", (_req: Request, res: Response) => {
  res.redirect(301, "/aggregated-data");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
