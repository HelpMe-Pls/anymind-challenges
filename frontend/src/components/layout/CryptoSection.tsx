import { Badge } from "@/components/ui/badge";
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
import { TrendingUp } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

const formatNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
};

export const CryptoSection = React.memo(
  ({ crypto }: { crypto: AggregatedData["crypto"] }) => {
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const handleInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
      const rawValue = e.target.value;

      // 1. Remove any character that is NOT a digit or a dot
      const numericOnly = rawValue.replace(/[^0-9.]/g, "");

      // 2. Handle multiple dots: ensure only the first one is kept
      const parts = numericOnly.split(".");
      const cleanedValue =
        parts.length > 1
          ? parts[0] + "." + parts.slice(1).join("") // Join subsequent parts without extra dots
          : parts[0];

      setter(cleanedValue);
    };

    const filteredCrypto = useMemo(() => {
      const min = minPrice ? +minPrice : 0;
      const max = maxPrice ? +maxPrice : Infinity;
      return crypto.filter((c) => c.price >= min && c.price <= max);
    }, [crypto, minPrice, maxPrice]);

    return (
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
                    type="text"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => handleInputChange(e, setMinPrice)}
                  />
                </label>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Max Price ($)
                  <Input
                    className="mt-2"
                    type="text"
                    placeholder="No limit"
                    value={maxPrice}
                    onChange={(e) => handleInputChange(e, setMaxPrice)}
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
                  const prices = crypto.sparkline_7d;
                  const chartData = prices.map((price, index) => ({
                    price,
                    index,
                  }));
                  const minPriceVal = Math.min(...prices);
                  const maxPriceVal = Math.max(...prices);
                  const padding = (maxPriceVal - minPriceVal) * 0.1;
                  const domain = [minPriceVal - padding, maxPriceVal + padding];
                  const trendColor =
                    (crypto.price_change_24h ?? 0) >= 0 ? "#00ff00" : "#ff0000";

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
                      <TableCell>${formatNumber(crypto.volume_24h)}</TableCell>
                      <TableCell>${formatNumber(crypto.market_cap)}</TableCell>
                      <TableCell>
                        <ResponsiveContainer width="100%" height={40}>
                          <AreaChart
                            data={chartData}
                            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
    );
  }
);
