import { z } from "zod";

// CoinGecko ----------------------------------------------------------
export const CryptoApiSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    symbol: z.string(),
    current_price: z.number(),
    market_cap: z.number(),
    total_volume: z.number(), // 24h volume
    price_change_percentage_24h: z.number().nullable(),
    sparkline_in_7d: z.object({
      price: z.array(z.number()), // For 7d chart
    }),
  })
);
export type CryptoApiResponse = z.infer<typeof CryptoApiSchema>;

// OpenWeather --------------------------------------------------------
export const WeatherApiSchema = z.object({
  main: z.object({ temp: z.number() }),
  weather: z.array(z.object({ main: z.string() })).nonempty(),
});
export type WeatherApiResponse = z.infer<typeof WeatherApiSchema>;

// NewsAPI ------------------------------------------------------------
export const NewsApiSchema = z.object({
  articles: z
    .array(
      z.object({
        title: z.string(),
        source: z.object({ name: z.string() }),
        url: z.url(),
      })
    )
    .nonempty(), // Added to ensure at least one article (throws if empty)
});
export type NewsApiResponse = z.infer<typeof NewsApiSchema>;
