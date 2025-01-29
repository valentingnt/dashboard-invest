'use client'

import { formatCurrency } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"

interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  assets: Array<{
    id: string;
    name: string;
  }>;
}

const TIME_RANGES = {
  "7d": { label: "7 jours", days: 7 },
  "1m": { label: "1 mois", days: 30 },
  "3m": { label: "3 mois", days: 90 },
  "6m": { label: "6 mois", days: 180 },
  "1y": { label: "1 an", days: 365 },
  "all": { label: "Tout", days: Infinity }
} as const;

type TimeRange = keyof typeof TIME_RANGES;

export function PerformanceChart({ data, assets }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const filteredData = useMemo(() => {
    if (timeRange === "all") return data;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TIME_RANGES[timeRange].days);

    return data.filter(point => {
      const [day, month, year] = point.date.split('/').map(Number);
      const pointDate = new Date(year, month - 1, day);
      return pointDate >= cutoffDate;
    });
  }, [data, timeRange]);

  const yAxisDomain = useMemo(() => {
    if (!filteredData.length) return [0, 0];

    const values = filteredData.flatMap(point => 
      assets.map(asset => Number(point[asset.name]) || 0)
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [filteredData, assets]);

  const colors = useMemo(() => 
    assets.map((_, i) => `hsl(${(i * 137.508) % 360}, 70%, 50%)`),
    [assets]
  );

  const formatDate = (dateStr: string, short = false) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      ...(short ? {} : { year: 'numeric', weekday: 'long' })
    });
  };

  return (

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Évolution du portefeuille</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredData.length} points
            </span>
            <Select
              value={timeRange}
              onValueChange={(value: TimeRange) => setTimeRange(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_RANGES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={filteredData}>
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
                tickFormatter={(date) => formatDate(date, true)}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k€`}
                domain={yAxisDomain}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Legend />
              {assets.map((asset, index) => (
                <Line
                  key={asset.id}
                  type="monotone"
                  dataKey={asset.name}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

  );
} 