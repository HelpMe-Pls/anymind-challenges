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
import type { AggregatedData } from "@/types/aggregated-data";
import { Cloud, Loader2 } from "lucide-react";
import React, { useState } from "react";

export const WeatherSection = React.memo(
  ({
    weather,
    onUpdateWeather,
  }: {
    weather: AggregatedData["weather"];
    onUpdateWeather: (city: string) => Promise<void>;
  }) => {
    const [city, setCity] = useState("Ho Chi Minh");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      await onUpdateWeather(city);
      setLoading(false);
    };

    return (
      <div className="flex-1">
        <div className="flex items-center mb-4">
          <Cloud className="h-6 w-6 mr-2 text-blue-600" />
          <h2 className="text-2xl text-foreground font-semibold">Weather</h2>
        </div>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">City Selection</CardTitle>
            <CardDescription>
              Get weather updates for any city (Top 10 in Vietnam below)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-5 mb-6">
              <Input
                type="text"
                placeholder="Enter city name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </form>

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
                  <TableHead className="w-1/5 text-center">Condition</TableHead>
                  <TableHead className="w-1/5 text-center">
                    Humidity (%)
                  </TableHead>
                  <TableHead className="w-1/5 text-center">
                    Wind Speed (m/s)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weather.map((w) => (
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
                    <TableCell className="text-center">{w.humidity}</TableCell>
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
    );
  }
);
