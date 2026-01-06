'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Calendar, Filter } from 'lucide-react';
import type { HistoryRecord, ChartPeriod, FilterMode } from '@/types/history';
import {
  filterRecordsByPeriod,
  formatRupiah,
  getAvailableMonths,
} from '@/lib/history';

interface HistoryChartProps {
  records: HistoryRecord[];
}

type ChartType = 'volume' | 'cost' | 'daily';

const periodLabels: Record<Exclude<ChartPeriod, 'custom'>, string> = {
  '6months': '6 Bulan',
  '12months': '12 Bulan',
  '24months': '24 Bulan',
  all: 'Semua',
};

const chartTypeLabels: Record<ChartType, string> = {
  volume: 'Volume (m³)',
  cost: 'Biaya (Rp)',
  daily: 'Rata-rata Harian',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
  }>;
  label?: string;
  chartType: ChartType;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  chartType,
}: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">
            {chartType === 'cost'
              ? formatRupiah(entry.value)
              : chartType === 'daily'
              ? `${entry.value.toFixed(3)} m³`
              : `${entry.value.toFixed(2)} m³`}
          </span>
        </div>
      ))}
    </div>
  );
};

export function HistoryChart({ records }: HistoryChartProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('preset');
  const [period, setPeriod] = useState<ChartPeriod>('12months');
  const [chartType, setChartType] = useState<ChartType>('volume');

  // Custom month range state (null means use defaults from availableMonths)
  const [startMonth, setStartMonth] = useState<string | null>(null);
  const [endMonth, setEndMonth] = useState<string | null>(null);

  // Get available months from records
  const availableMonths = useMemo(() => getAvailableMonths(records), [records]);

  // Derive effective start/end months (use defaults if not set)
  const effectiveStartMonth = startMonth ?? (availableMonths[0]?.key || '');
  const effectiveEndMonth =
    endMonth ?? (availableMonths[availableMonths.length - 1]?.key || '');

  const filteredRecords = useMemo(() => {
    if (filterMode === 'month-range') {
      return filterRecordsByPeriod(records, 'custom', {
        startMonth: effectiveStartMonth,
        endMonth: effectiveEndMonth,
      });
    }
    return filterRecordsByPeriod(records, period);
  }, [records, filterMode, period, effectiveStartMonth, effectiveEndMonth]);

  const chartData = useMemo(() => {
    return filteredRecords.map((record) => ({
      month:
        record.monthDisplay.split(' ')[0].slice(0, 3) +
        ' ' +
        record.monthDisplay.split(' ')[1].slice(2),
      monthFull: record.monthDisplay,
      volumeM3: record.volumeM3,
      totalCost: record.totalCost,
      waterCost: record.waterCost,
      fixedCost: record.fixedCost,
      avgDailyUsage: record.avgDailyUsage,
    }));
  }, [filteredRecords]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { value: 0, isUp: false };

    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));

    const avgFirst =
      firstHalf.reduce((sum, d) => sum + d.volumeM3, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((sum, d) => sum + d.volumeM3, 0) / secondHalf.length;

    const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;

    return {
      value: Math.abs(percentChange),
      isUp: percentChange > 0,
    };
  }, [chartData]);

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Grafik Historis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Upload data untuk melihat grafik</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Grafik Historis</CardTitle>
            {trend.value > 0 && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  trend.isUp ? 'text-destructive' : 'text-green-600'
                }`}
              >
                <TrendingUp
                  className={`h-4 w-4 ${!trend.isUp && 'rotate-180'}`}
                />
                <span>{trend.value.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Filter Mode Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={filterMode === 'preset' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('preset')}
              className="text-xs gap-1"
            >
              <Filter className="h-3 w-3" />
              Preset
            </Button>
            <Button
              variant={filterMode === 'month-range' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('month-range')}
              className="text-xs gap-1"
            >
              <Calendar className="h-3 w-3" />
              Pilih Bulan
            </Button>
          </div>
        </div>

        {/* Filter Options based on mode */}
        <div className="flex flex-wrap gap-2">
          {filterMode === 'preset' ? (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(
                Object.keys(periodLabels) as Exclude<ChartPeriod, 'custom'>[]
              ).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className="text-xs px-2"
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Dari:</span>
                <select
                  value={effectiveStartMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-md border bg-background"
                >
                  {availableMonths.map((m) => (
                    <option
                      key={m.key}
                      value={m.key}
                      disabled={m.key > effectiveEndMonth}
                    >
                      {m.display}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sampai:</span>
                <select
                  value={effectiveEndMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-md border bg-background"
                >
                  {availableMonths.map((m) => (
                    <option
                      key={m.key}
                      value={m.key}
                      disabled={m.key < effectiveStartMonth}
                    >
                      {m.display}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-muted-foreground">
                ({filteredRecords.length} bulan)
              </span>
            </div>
          )}
        </div>

        {/* Chart Type Selector */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {(Object.keys(chartTypeLabels) as ChartType[]).map((type) => (
            <Button
              key={type}
              variant={chartType === type ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType(type)}
              className="text-xs"
            >
              {chartTypeLabels[type]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'cost' ? (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip chartType={chartType} />} />
                <Legend />
                <Bar
                  dataKey="waterCost"
                  name="Biaya Air"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                  stackId="cost"
                />
                <Bar
                  dataKey="fixedCost"
                  name="Biaya Tetap"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                  stackId="cost"
                />
              </BarChart>
            ) : chartType === 'daily' ? (
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip chartType={chartType} />} />
                <Line
                  type="monotone"
                  dataKey="avgDailyUsage"
                  name="Rata-rata Harian"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<CustomTooltip chartType={chartType} />} />
                <Bar
                  dataKey="volumeM3"
                  name="Volume"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="font-semibold">
              {chartType === 'cost'
                ? formatRupiah(
                    Math.min(...filteredRecords.map((r) => r.totalCost))
                  )
                : chartType === 'daily'
                ? `${Math.min(
                    ...filteredRecords.map((r) => r.avgDailyUsage)
                  ).toFixed(3)} m³`
                : `${Math.min(
                    ...filteredRecords.map((r) => r.volumeM3)
                  ).toFixed(2)} m³`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Rata-rata</p>
            <p className="font-semibold">
              {chartType === 'cost'
                ? formatRupiah(
                    filteredRecords.reduce((sum, r) => sum + r.totalCost, 0) /
                      filteredRecords.length
                  )
                : chartType === 'daily'
                ? `${(
                    filteredRecords.reduce(
                      (sum, r) => sum + r.avgDailyUsage,
                      0
                    ) / filteredRecords.length
                  ).toFixed(3)} m³`
                : `${(
                    filteredRecords.reduce((sum, r) => sum + r.volumeM3, 0) /
                    filteredRecords.length
                  ).toFixed(2)} m³`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="font-semibold">
              {chartType === 'cost'
                ? formatRupiah(
                    Math.max(...filteredRecords.map((r) => r.totalCost))
                  )
                : chartType === 'daily'
                ? `${Math.max(
                    ...filteredRecords.map((r) => r.avgDailyUsage)
                  ).toFixed(3)} m³`
                : `${Math.max(
                    ...filteredRecords.map((r) => r.volumeM3)
                  ).toFixed(2)} m³`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
