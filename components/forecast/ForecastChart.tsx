'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type {
  DailyForecast,
  WeeklyForecast,
  MonthlyForecast,
  ForecastPeriod,
} from '@/types/forecast';
import { formatDate, formatWeekRange } from '@/lib/forecast-utils';

/* ================= TYPES ================= */
type ForecastDataPoint = DailyForecast | WeeklyForecast | MonthlyForecast;

interface ForecastChartProps {
  data: ForecastDataPoint[];
  period: ForecastPeriod;
}

interface ChartData {
  label: string;
  value: number;
  lower: number;
  upper: number;
  original: ForecastDataPoint;
}

/* ================= HELPERS ================= */
function getLabel(item: ForecastDataPoint, period: ForecastPeriod): string {
  if (period === 'daily' && 'date' in item) {
    return formatDate(item.date);
  }
  if (period === 'weekly' && 'week' in item) {
    return formatWeekRange(item.week);
  }
  if (period === 'monthly' && 'month' in item) {
    const date = new Date(item.month + '-01');
    return date.toLocaleDateString('id-ID', {
      month: 'short',
      year: '2-digit',
    });
  }
  return '';
}

/* ================= CUSTOM TOOLTIP ================= */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    payload: ChartData;
  }>;
  period: ForecastPeriod;
}

const CustomTooltip = ({ active, payload, period }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const periodLabel =
    period === 'daily'
      ? 'Harian'
      : period === 'weekly'
      ? 'Mingguan'
      : 'Bulanan';

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {data.label} • {periodLabel}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <p className="text-sm font-semibold">
          {data.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
          <span className="text-muted-foreground">Liter</span>
        </p>
      </div>
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">Rentang Prediksi:</p>
        <p className="text-xs font-medium">
          {data.lower.toLocaleString('id-ID', { maximumFractionDigits: 1 })} -{' '}
          {data.upper.toLocaleString('id-ID', { maximumFractionDigits: 1 })} L
        </p>
      </div>
    </div>
  );
};

/* ================= COMPONENT ================= */
export function ForecastChart({ data, period }: ForecastChartProps) {
  const chartData: ChartData[] = data.map((item) => ({
    label: getLabel(item, period),
    value: item.volumeInLiters,
    lower: item.volumeInLiters_lower,
    upper: item.volumeInLiters_upper,
    original: item,
  }));

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            dy={10}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000
                ? `${(value / 1000).toFixed(1)}k`
                : value.toLocaleString()
            }
            width={50}
          />
          <Tooltip content={<CustomTooltip period={period} />} />

          {/* Confidence interval area (upper bound) */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="transparent"
            fill="url(#colorConfidence)"
            fillOpacity={1}
          />

          {/* Confidence interval area (lower bound - creates the band effect) */}
          <Area
            type="monotone"
            dataKey="lower"
            stroke="transparent"
            fill="hsl(var(--background))"
            fillOpacity={1}
          />

          {/* Main prediction line */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorPrediction)"
            fillOpacity={0.3}
            dot={{
              r: 4,
              fill: '#3b82f6',
              strokeWidth: 2,
              stroke: 'hsl(var(--background))',
            }}
            activeDot={{
              r: 6,
              fill: '#3b82f6',
              strokeWidth: 2,
              stroke: 'hsl(var(--background))',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
