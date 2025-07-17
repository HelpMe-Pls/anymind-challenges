import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cloud, Loader2, Newspaper, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

// Type for aggregated data (matches backend)
interface AggregatedData {
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

function App() {
  const [data, setData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Filters states
  const [cryptoMinPrice, setCryptoMinPrice] = useState("");
  const [cryptoMaxPrice, setCryptoMaxPrice] = useState("");
  const [weatherCity, setWeatherCity] = useState("Ho Chi Minh");
  const [newsKeyword, setNewsKeyword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/aggregated-data");
        // const res = await fetch("http://localhost:3000/aggregated-data"); // For dev
        if (!res.ok)
          throw new Error(((await res.json()) as { error: string }).error);
        const json = (await res.json()) as AggregatedData;
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get weather by city
  const updateWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`/api/weather?city=${weatherCity}`);
      // const res = await fetch(
      //   `http://localhost:3000/weather?city=${weatherCity}`
      // ); // For dev
      if (!res.ok)
        throw new Error(
          ((await res.json()) as { error: string }).error ||
            "Failed to fetch weather"
        );
      const newWeather = await res.json();
      setData((prev) => {
        if (!prev) return null;
        const updatedWeathers = prev.weather.filter(
          (w) => w.city.toLowerCase() !== weatherCity.toLowerCase()
        );
        return { ...prev, weather: [...updatedWeathers, newWeather] };
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWeatherLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Filtered data (client-side for simplicity)
  const minPrice = cryptoMinPrice ? +cryptoMinPrice : 0;
  const maxPrice = cryptoMaxPrice ? +cryptoMaxPrice : Infinity;
  const filteredCrypto = data.crypto.filter(
    (c) => c.price >= minPrice && c.price <= maxPrice
  );
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };
  const filteredNews = data.latest_news.filter((n) =>
    n.title.toLowerCase().includes(newsKeyword.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background dark">
      <div className="container mx-auto py-8 px-8">
        <div className="mb-8">
          <h1 className="text-4xl text-foreground font-bold mb-2">
            Market Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time cryptocurrency, weather, and news data
          </p>
        </div>

        {/* Crypto Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
            <h2 className="text-2xl text-foreground font-semibold">
              Cryptocurrency
            </h2>
          </div>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Price Filter</CardTitle>
              <CardDescription>
                Filter cryptocurrencies by price range (Top 10 by Market Cap)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center mb-6 max-w-1/3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Min Price ($)
                    <Input
                      className="mt-2"
                      type="number"
                      placeholder="0"
                      value={cryptoMinPrice}
                      onChange={(e) => setCryptoMinPrice(e.target.value)}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Max Price ($)
                    <Input
                      className="mt-2"
                      type="number"
                      placeholder="No limit"
                      value={cryptoMaxPrice}
                      onChange={(e) => setCryptoMaxPrice(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <Separator className="mb-6" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card/95">
                      Coin
                    </TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>24h</TableHead>
                    <TableHead>24h Volume</TableHead>
                    <TableHead>Market Cap</TableHead>
                    <TableHead>Last 7 Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCrypto.map((crypto) => {
                    // Calculate min/max for Y-domain with padding for volatility
                    const prices = crypto.sparkline_7d;
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const padding = (maxPrice - minPrice) * 0.1; // 10% padding
                    const domain = [minPrice - padding, maxPrice + padding]; // Custom domain for Y-axis

                    // Determine trend color (green if positive 24h change, red if negative)
                    const trendColor =
                      (crypto.price_change_24h ?? 0) >= 0
                        ? "#00ff00"
                        : "#ff0000";

                    // Prepare chart data
                    const chartData = prices.map((price, index) => ({
                      price,
                      index,
                    }));

                    return (
                      <TableRow key={crypto.name}>
                        <TableCell className="sticky left-0 bg-card/95">
                          <div className="flex items-center">
                            <span className="font-medium">{crypto.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {crypto.symbol}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>${crypto.price.toLocaleString()}</TableCell>
                        <TableCell
                          className={
                            (crypto.price_change_24h ?? 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {crypto.price_change_24h?.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          ${formatNumber(crypto.volume_24h)}
                        </TableCell>
                        <TableCell>
                          ${formatNumber(crypto.market_cap)}
                        </TableCell>
                        <TableCell>
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart
                              data={chartData}
                              margin={{
                                top: 0,
                                right: 0,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <YAxis domain={domain} hide={true} />
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={trendColor}
                                fill={trendColor}
                                fillOpacity={0.2}
                                strokeWidth={2}
                                activeDot={false}
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Weather Section */}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <Cloud className="h-6 w-6 mr-2 text-blue-600" />
              <h2 className="text-2xl text-foreground font-semibold">
                Weather
              </h2>
            </div>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">City Selection</CardTitle>
                <CardDescription>
                  Get weather updates for any city (Top 10 in Vietnam below)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-5 mb-6">
                  <Input
                    type="text"
                    placeholder="Enter city name"
                    value={weatherCity}
                    onChange={(e) => setWeatherCity(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={updateWeather}
                    disabled={weatherLoading}
                    className="min-w-[100px]"
                  >
                    {weatherLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading
                      </>
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>

                <Separator className="mb-6" />

                <Table className="w-full table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card/95 w-1/5">
                        City
                      </TableHead>
                      <TableHead className="w-1/5 text-center">
                        Temperature (°C)
                      </TableHead>
                      <TableHead className="w-1/5 text-center">
                        Condition
                      </TableHead>
                      <TableHead className="w-1/5 text-center">
                        Humidity (%)
                      </TableHead>
                      <TableHead className="w-1/5 text-center">
                        Wind Speed (m/s)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.weather.map((w) => (
                      <TableRow key={w.city}>
                        <TableCell className="sticky left-0 bg-card/95">
                          {w.city}
                        </TableCell>
                        <TableCell className="text-center">
                          {w.temperature.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={
                              w.condition == "Rain"
                                ? "border-cyan-400 bg-sky-400/30"
                                : w.condition == "Clouds"
                                ? "border-slate-400 bg-slate-400/30"
                                : w.condition === "Clear"
                                ? "border-slate-700 bg-card/30"
                                : ""
                            }
                          >
                            {w.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {w.humidity}
                        </TableCell>
                        <TableCell className="text-center">
                          {w.wind_speed.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* News Section */}
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <Newspaper className="h-6 w-6 mr-2 text-purple-600" />
              <h2 className="text-2xl text-foreground font-semibold">
                Latest News
              </h2>
            </div>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Search Articles</CardTitle>
                <CardDescription>Find news articles by keyword</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Input
                    type="text"
                    placeholder="Enter search keyword..."
                    value={newsKeyword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewsKeyword(e.target.value)
                    }
                  />
                </div>

                <Separator className="mb-6" />

                <Table className="w-full table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-3/4 text-center">
                        Source
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNews.map((article) => (
                      <TableRow key={article.url}>
                        <TableCell>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {article.title}
                          </a>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{article.source}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
