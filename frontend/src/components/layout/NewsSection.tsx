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
import { Newspaper } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

export const NewsSection = React.memo(
  ({ latest_news }: { latest_news: AggregatedData["latest_news"] }) => {
    const [keyword, setKeyword] = useState("");
    const [debouncedKeyword, setDebouncedKeyword] = useState("");

    // Debounce keyword updates (only update after 369ms of inactivity)
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedKeyword(keyword);
      }, 369);
      return () => clearTimeout(timer);
    }, [keyword]);

    const filteredNews = useMemo(() => {
      return latest_news.filter((n) =>
        n.title.toLowerCase().includes(debouncedKeyword.toLowerCase())
      );
    }, [latest_news, debouncedKeyword]);

    return (
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
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <Separator className="mb-6" />

            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-3/4 text-center">Source</TableHead>
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
    );
  }
);
