import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CryptoSection } from "./components/layout/CryptoSection";
import { NewsSection } from "./components/layout/NewsSection";
import { WeatherSection } from "./components/layout/WeatherSection";
import type { AggregatedData } from "./types/aggregated-data";

function App() {
  const [data, setData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/aggregated-data");
        // For dev mode
        // const res = await fetch("http://localhost:3000/aggregated-data");
        if (!res.ok)
          // NOTE: Prefer Zod schemas for error validation
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

  const updateWeather = async (city: string) => {
    try {
      const res = await fetch(`/api/weather?city=${city}`);
      // For dev mode
      // const res = await fetch(`http://localhost:3000/weather?city=${city}`);
      if (!res.ok)
        throw new Error(
          // NOTE: Prefer Zod schemas for error validation
          ((await res.json()) as { error: string }).error ||
            "Failed to fetch weather"
        );
      const newWeather = await res.json();
      setData((prev) => {
        if (!prev) return null;
        const updatedWeathers = prev.weather.filter(
          (w) => w.city.toLowerCase() !== city.toLowerCase()
        );
        return { ...prev, weather: [...updatedWeathers, newWeather] };
      });
    } catch (err) {
      setError((err as Error).message);
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

        <CryptoSection crypto={data.crypto} />

        <div className="flex flex-col md:flex-row gap-8">
          <WeatherSection
            weather={data.weather}
            onUpdateWeather={updateWeather}
          />
          <NewsSection latest_news={data.latest_news} />
        </div>
      </div>
    </div>
  );
}

export default App;
