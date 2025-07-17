export interface AggregatedData {
  crypto: Array<{
    name: string;
    symbol: string;
    price: number;
    market_cap: number;
    price_change_24h: number | null;
    volume_24h: number;
    sparkline_7d: number[];
  }>;
  weather: Array<{
    city: string;
    temperature: number;
    condition: string;
    humidity: number;
    wind_speed: number;
  }>;
  latest_news: Array<{ title: string; source: string; url: string }>;
}
