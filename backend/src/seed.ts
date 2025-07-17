import { Pool } from "pg";
import { CryptoApiSchema, NewsApiSchema, WeatherApiSchema } from "./schema";

const OPENWEATHER_API_KEY = Bun.env.OPENWEATHER_API_KEY ?? "";
const NEWSAPI_API_KEY = Bun.env.NEWSAPI_API_KEY ?? "";
const DATABASE_URL = Bun.env.DATABASE_URL ?? ""; // Get this from Neon

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function fetchAndStoreData() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set. Cannot seed data.");
    return;
  }
  if (!OPENWEATHER_API_KEY || !NEWSAPI_API_KEY) {
    console.error(
      "API keys are missing. Please set OPENWEATHER_API_KEY and NEWSAPI_API_KEY."
    );
    return;
  }

  const client = await pool.connect(); // Get a client from the pool
  try {
    console.log("Starting data seeding...");

    // Clear old data for a fresh seed (Optional: use UPSERT in prod)
    await client.query("DELETE FROM crypto;");
    await client.query("DELETE FROM weather;");
    await client.query("DELETE FROM news;");
    console.log("✅ Old data cleared.");

    // Fetch 10 Coins (top by market cap, with 24h data and sparkline)
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h"
    );
    if (!cryptoRes.ok)
      throw new Error(`CoinGecko API error: ${cryptoRes.statusText}`);
    const cryptoData = CryptoApiSchema.parse(await cryptoRes.json());

    for (const coin of cryptoData) {
      await client.query(
        "INSERT INTO crypto (name, symbol, price, market_cap, price_change_24h, volume_24h, sparkline_7d) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          coin.name,
          coin.symbol.toUpperCase(),
          coin.current_price,
          coin.market_cap,
          coin.price_change_percentage_24h,
          coin.total_volume,
          JSON.stringify(coin.sparkline_in_7d.price), // Stored as JSON array
        ]
      );
    }
    console.log("✅ Crypto data stored.");

    // Weather: Seed 10 Vietnamese cities
    const cities = [
      "Ho Chi Minh",
      "Hanoi",
      "Da Nang",
      "Hoi An",
      "Can Tho",
      "Nha Trang",
      "Hue",
      "Da Lat",
      "Buon Ma Thuot",
      "Vinh",
    ];
    for (const city of cities) {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          city
        )}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      if (!weatherRes.ok) {
        console.warn(
          `Failed to fetch weather for ${city}: ${weatherRes.statusText}`
        );
        continue;
      }
      const weatherData = WeatherApiSchema.parse(await weatherRes.json());
      const condition = weatherData.weather[0]?.main;
      if (condition) {
        await client.query(
          "INSERT INTO weather (city, temperature, condition, humidity, wind_speed) VALUES ($1, $2, $3, $4, $5)",
          [
            city,
            weatherData.main.temp,
            condition,
            weatherData.main.humidity,
            weatherData.wind.speed,
          ]
        );
      }
    }
    console.log("✅ Weather data stored.");

    // Fetch Multiple News (top 12 US headlines)
    const newsRes = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=12&apiKey=${NEWSAPI_API_KEY}`
    );
    if (!newsRes.ok)
      throw new Error(`NewsAPI API error: ${newsRes.statusText}`);
    const newsData = NewsApiSchema.parse(await newsRes.json());
    if (newsData.articles.length === 0) {
      console.warn("No news articles found from API.");
    } else {
      for (const article of newsData.articles) {
        await client.query(
          "INSERT INTO news (title, source, url) VALUES ($1, $2, $3)",
          [article.title, article.source.name, article.url]
        );
      }
      console.log("✅ News data stored.");
    }

    console.log("Data seeding complete! 🎉");
  } catch (error) {
    console.error("Error during data seeding:", error);
  } finally {
    client.release(); // Release the client back to the pool
    await pool.end(); // Close the pool after seeding (important for standalone script)
  }
}

fetchAndStoreData();
