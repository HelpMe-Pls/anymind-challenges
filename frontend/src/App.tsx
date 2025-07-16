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
  Cloud,
  DollarSign,
  Loader2,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

// Type for aggregated data (matches backend)
interface AggregatedData {
  crypto: Array<{
    name: string;
    symbol: string;
    price: number;
    market_cap: number;
  }>;
  weather: { city: string; temperature: number; condition: string };
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

  // Fetch aggregated data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/aggregated-data");
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

  // Function to fetch updated weather by city
  const updateWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/weather?city=${weatherCity}`
      );
      if (!res.ok) throw new Error("Failed to fetch weather");
      const newWeather = await res.json();
      setData((prev) => (prev ? { ...prev, weather: newWeather } : null));
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
      <div className="container mx-auto py-8 px-4">
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

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Price Filter</CardTitle>
              <CardDescription>
                Filter cryptocurrencies by price range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Min Price ($):{" "}
                    <Input
                      type="number"
                      placeholder="0"
                      value={cryptoMinPrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCryptoMinPrice(e.target.value)
                      }
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Max Price ($):{" "}
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={cryptoMaxPrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCryptoMaxPrice(e.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCrypto.map((crypto) => (
              <Card
                key={crypto.name}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{crypto.name}</CardTitle>
                    <Badge variant="secondary">{crypto.symbol}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Current Price
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        ${crypto.price.toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Market Cap</span>
                      <span className="font-semibold">
                        ${formatNumber(crypto.market_cap)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Weather Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Cloud className="h-6 w-6 mr-2 text-blue-600" />
            <h2 className="text-2xl text-foreground font-semibold">Weather</h2>
          </div>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">City Selection</CardTitle>
              <CardDescription>
                Get weather updates for any city
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
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
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Cloud className="h-8 w-8 mr-2 text-blue-600" />
                  <h3 className="text-2xl font-bold">{data.weather.city}</h3>
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {data.weather.temperature}°C
                </div>
                <Badge
                  variant="secondary"
                  className="text-lg dark:bg-green-700 px-4 py-2 mt-3"
                >
                  {data.weather.condition}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* News Section */}
        <div>
          <div className="flex items-center mb-4">
            <Newspaper className="h-6 w-6 mr-2 text-purple-600" />
            <h2 className="text-2xl text-foreground font-semibold">
              Latest News
            </h2>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Search Articles</CardTitle>
              <CardDescription>Find news articles by keyword</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                placeholder="Enter search keyword..."
                value={newsKeyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewsKeyword(e.target.value)
                }
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredNews.map((article) => (
              <Card
                key={article.url}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {article.title}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{article.source}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read Full Article →
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
