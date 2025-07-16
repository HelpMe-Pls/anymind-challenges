import { Pool } from "pg";
import { CryptoApiSchema, NewsApiSchema, WeatherApiSchema } from "./schema";

// Ensure you have these in your .env or provide them here for local seeding
const OPENWEATHER_API_KEY = Bun.env.OPENWEATHER_API_KEY ?? "";
const NEWSAPI_API_KEY = Bun.env.NEWSAPI_API_KEY ?? "";
const DATABASE_URL = Bun.env.DATABASE_URL ?? ""; // Use your Neon URL

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
    console.log("Old data cleared.");

    // Fetch Multiple Cryptos (Bitcoin + Ethereum)
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true"
    );
    const cryptoData = CryptoApiSchema.parse(await cryptoRes.json());

    const bitcoin = cryptoData.bitcoin;
    await client.query(
      "INSERT INTO crypto (name, symbol, price, market_cap) VALUES ($1, $2, $3, $4)",
      ["Bitcoin", "BTC", bitcoin.usd, bitcoin.usd_market_cap]
    );

    const ethereum = cryptoData.ethereum;
    await client.query(
      "INSERT INTO crypto (name, symbol, price, market_cap) VALUES ($1, $2, $3, $4)",
      ["Ethereum", "ETH", ethereum.usd, ethereum.usd_market_cap]
    );
    console.log("Crypto data stored.");

    // Fetch Weather (Ho Chi Minh as default)
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Ho%20Chi%20Minh&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!weatherRes.ok)
      throw new Error(`OpenWeather API error: ${weatherRes.statusText}`);
    const weatherData = WeatherApiSchema.parse(await weatherRes.json());
    const weatherCondition = weatherData.weather[0]?.main;
    if (!weatherCondition) {
      console.warn("No weather condition found from API.");
    } else {
      await client.query(
        "INSERT INTO weather (city, temperature, condition) VALUES ($1, $2, $3)",
        ["Ho Chi Minh", weatherData.main.temp, weatherCondition]
      );
      console.log("Weather data stored.");
    }

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
      console.log("News data stored.");
    }

    console.log("Data seeding complete!");
  } catch (error) {
    console.error("Error during data seeding:", error);
  } finally {
    client.release(); // Release the client back to the pool
    await pool.end(); // Close the pool after seeding (important for standalone script)
  }
}

fetchAndStoreData(); // Execute the seeding function
