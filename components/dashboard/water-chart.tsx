'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';

interface WaterChartProps {
  data: Array<{
    timestamp: Date;
    flowRate: number;
    totalVolume: number;
  }>;
}

export function WaterChart({ data }: WaterChartProps) {
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');

  // Transform data untuk chart
  const chartData = data.map((item) => ({
    time: new Date(item.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    'Hourly Usage': Number(item.flowRate.toFixed(2)),
    Forecast: Number(item.totalVolume.toFixed(2)),
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">24-Hour Water Usage</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring and consumption data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'hourly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('hourly')}
          >
            Today (Hourly)
          </Button>
          <Button
            variant={view === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('daily')}
          >
            History (Daily)
          </Button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[450px] flex items-center justify-center border-2 border-dashed rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-muted-foreground font-medium">
              No data available
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate dummy data or connect ESP32 to see the chart
            </p>
            <div className="mt-4">
              <code className="text-xs bg-muted px-3 py-1 rounded">
                npm run generate-data
              </code>
            </div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />

            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${value}L`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '12px',
              }}
              labelStyle={{
                color: 'hsl(var(--foreground))',
                fontWeight: 600,
                marginBottom: 8,
              }}
              formatter={(value: number | undefined) => [`${value ?? 0} L`, '']}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />

            <Legend
              verticalAlign="top"
              height={50}
              iconType="line"
              iconSize={20}
              wrapperStyle={{
                paddingBottom: '10px',
                fontSize: '14px',
              }}
            />

            {/* Line 1: Hourly Usage (Hijau) */}
            <Line
              type="monotone"
              dataKey="Hourly Usage"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#10b981',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />

            {/* Line 2: Forecast (Biru) */}
            <Line
              type="monotone"
              dataKey="Forecast"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#3b82f6',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-6 flex gap-3">
        <Button className="flex-1 sm:flex-initial" variant="default">
          📊 GENERATE FORECAST
        </Button>
        <Button className="flex-1 sm:flex-initial" variant="outline">
          📥 EXPORT DATA
        </Button>
      </div>
    </Card>
  );
}
