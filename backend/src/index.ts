import { Database } from "bun:sqlite";
import type { Express, Request, Response } from "express";
import express from "express";
import { CryptoApiSchema, NewsApiSchema, WeatherApiSchema } from "./schema";

// Environment variables (Bun loads from process.env; use .env file for dev)
// In prod, use a secrets manager. Hardcode defaults for test fallback, but replace with real keys.
const OPENWEATHER_API_KEY = Bun.env.OPENWEATHER_API_KEY ?? "";
const NEWSAPI_API_KEY = Bun.env.NEWSAPI_API_KEY ?? "";

// Initialize Express app
const app: Express = express();
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

    // Fetch Crypto (CoinGecko - no API key needed)
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true"
    );
    const cryptoData = CryptoApiSchema.parse(await cryptoRes.json());
    const bitcoin = cryptoData.bitcoin;
    db.prepare(
      "INSERT INTO crypto (name, symbol, price, market_cap) VALUES (?, ?, ?, ?)"
    ).run("Bitcoin", "BTC", bitcoin.usd, bitcoin.usd_market_cap);

    // Fetch Weather (OpenWeather - New York as default; requires key)
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=New%20York&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    const weatherData = WeatherApiSchema.parse(await weatherRes.json());
    // Runtime check to narrow type (satisfies TS; Zod .nonempty() already throws if empty)
    const weatherCondition = weatherData.weather[0]?.main;
    if (!weatherCondition) {
      console.warn("No weather condition found; skipping insertion.");
      return; // Or throw; keeping simple for test
    }
    db.prepare(
      "INSERT INTO weather (city, temperature, condition) VALUES (?, ?, ?)"
    ).run("New York", weatherData.main.temp, weatherCondition);

    // Fetch News (NewsAPI - top US headline; requires key. Using JSONPlaceholder alternative if key issues, but sticking to spec)
    // Alternative: Use JSONPlaceholder for mock news (e.g., fetch posts as "news") to avoid key dependency.
    const newsRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWSAPI_API_KEY}`
    );
    const newsData = NewsApiSchema.parse(await newsRes.json());
    // Runtime check to narrow type (satisfies TS; Zod .nonempty() throws if empty, but we handle gracefully)
    const topArticle = newsData.articles[0];
    if (!topArticle) {
      console.warn("No news articles found; skipping insertion.");
      return;
    }
    db.prepare("INSERT INTO news (title, source, url) VALUES (?, ?, ?)").run(
      topArticle.title,
      topArticle.source.name,
      topArticle.url
    );

    console.log("Data fetched and stored successfully.");
  } catch (error) {
    console.error("Error fetching/storing data:", error);
    // In prod, add retry logic or alerts (e.g., via Sentry).
  }
}

// Fetch and store on server startup (fulfills "store the combined data")
// Alternative: Run this in a cron job (add node-cron dep) for periodic updates without restarting server.
fetchAndStoreData();

// Endpoint: /aggregated-data
// Queries DB and aggregates into single JSON (normalized/unified format).
// If DB empty, could re-fetch here, but we pre-fetch on startup for efficiency.
app.get("/aggregated-data", (_req: Request, res: Response) => {
  const crypto = db.prepare("SELECT * FROM crypto LIMIT 1").get() as {
    name: string;
    symbol: string;
    price: number;
    market_cap: number;
  };
  const weather = db.prepare("SELECT * FROM weather LIMIT 1").get() as {
    city: string;
    temperature: number;
    condition: string;
  };
  const news = db.prepare("SELECT * FROM news LIMIT 1").get() as {
    title: string;
    source: string;
    url: string;
  };

  if (!crypto || !weather || !news) {
    return res
      .status(500)
      .json({ error: "Data not available. Try restarting the server." });
  }

  const aggregated = {
    crypto: {
      name: crypto.name,
      symbol: crypto.symbol,
      price: crypto.price,
      market_cap: crypto.market_cap,
    },
    weather: {
      city: weather.city,
      temperature: weather.temperature,
      condition: weather.condition,
    },
    latest_news: { title: news.title, source: news.source, url: news.url },
  };

  res.json(aggregated);
});

app.get("/", (_req: Request, res: Response) => {
  return res
    .status(404)
    .json({ error: "Nothing to see here. Visit /aggregated-data instead." });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
