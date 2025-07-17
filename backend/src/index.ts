import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import * as http from "http";
import { Pool } from "pg";
import { WeatherApiSchema } from "./schema.js";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

// Initialize Express app
const app: Express = express();
app.use(cors());
// const port = 3000; // for Dev

// Initialize PostgreSQL Pool
// Trade-off: Using Pool for connection management. Prod apps use an ORM (e.g., Prisma, Drizzle,...) for migrations & richer querying.
const pool = new Pool({
  connectionString: DATABASE_URL,
  // Add SSL for Neon connections in production:
  ssl: {
    rejectUnauthorized: false, // Set to true if you have a CA cert; false for demo is common.
  },
});

//------------------------------Rate Limiting (Part 3)
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

  if (record.count >= RATE_LIMIT) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: "Too many requests, please wait before retrying.",
    });
  }

  record.count++;
  rateLimitStore.set(ip, record);
  next();
};

app.get(
  "/aggregated-data",
  rateLimiter,
  async (_req: Request, res: Response) => {
    try {
      // Note: PG table names are case-sensitive if created with quotes (e.g., "crypto").
      // If created without quotes, they are lowercased by default.
      const cryptoRes = await pool.query(
        "SELECT * FROM crypto ORDER BY fetched_at ASC LIMIT 10"
      );
      const cryptos = cryptoRes.rows as Array<{
        name: string;
        symbol: string;
        price: number;
        market_cap: number;
      }>;

      const weatherRes = await pool.query(
        "SELECT * FROM weather ORDER BY fetched_at DESC LIMIT 10"
      );
      const weathers = weatherRes.rows as Array<{
        city: string;
        temperature: number;
        condition: string;
        humidity: number;
        wind_speed: number;
      }>;

      const newsRes = await pool.query(
        "SELECT * FROM news ORDER BY fetched_at DESC LIMIT 12"
      );
      const newsItems = newsRes.rows as Array<{
        title: string;
        source: string;
        url: string;
      }>;

      if (
        cryptos.length === 0 ||
        weathers.length === 0 ||
        newsItems.length === 0
      ) {
        return res
          .status(500)
          .json({ error: "Data not available. Please seed the database." });
      }

      const aggregated = {
        crypto: cryptos,
        weather: weathers,
        latest_news: newsItems,
      };

      res.json(aggregated);
    } catch (error) {
      console.error("Error fetching aggregated data:", error);
      res.status(500).json({ error: "Failed to retrieve aggregated data." });
    }
  }
);

// Dynamic endpoint `/weather?city=...`
app.get("/weather", rateLimiter, async (req: Request, res: Response) => {
  const city = (req.query.city as string) || "ho chi minh";
  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!weatherRes.ok) {
      const errorData = await weatherRes.json();
      throw new Error(
        (errorData as { message: string }).message ||
          "Failed to fetch weather from external API."
      );
    }

    const weatherData = WeatherApiSchema.parse(await weatherRes.json());
    const condition = weatherData.weather[0]?.main;
    if (!condition) {
      return res.status(400).json({ error: "Invalid weather data received." });
    }

    // Store in DB (UPSERT to update if city exists, or insert new)
    await pool.query(
      `INSERT INTO weather (city, temperature, condition, humidity, wind_speed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (city) DO UPDATE SET
         temperature = EXCLUDED.temperature,
         condition = EXCLUDED.condition,
         humidity = EXCLUDED.humidity,
         wind_speed = EXCLUDED.wind_speed,
         fetched_at = CURRENT_TIMESTAMP`,
      [
        city,
        weatherData.main.temp,
        condition,
        weatherData.main.humidity,
        weatherData.wind.speed,
      ]
    );

    const result = {
      city,
      temperature: weatherData.main.temp,
      condition,
      humidity: weatherData.main.humidity,
      wind_speed: weatherData.wind.speed,
    };
    res.json(result);
  } catch (error) {
    console.error("Error fetching weather:", error);
    res
      .status(500)
      .json({ error: (error as Error).message || "Failed to fetch weather." });
  }
});

// Default route
app.get("/", (_req: Request, res: Response) => {
  res.redirect(301, "/aggregated-data");
});

// Start DEV server
// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  // Strip the /api prefix so Express routes match (e.g., /api/aggregated-data -> /aggregated-data)
  if (req.url) {
    req.url = req.url.replace(/^\/api/, "") || "/";
  }
  app(req as any, res as any); // Call the Express app to handle the request
};

export default handler;

export { app };
