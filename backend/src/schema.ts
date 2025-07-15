import { z } from "zod";

// CoinGecko ----------------------------------------------------------
export const CryptoApiSchema = z.object({
  bitcoin: z.object({
    usd: z.number(),
    usd_market_cap: z.number(),
  }),
});
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
