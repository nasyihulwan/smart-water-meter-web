'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

/* ================= TYPES ================= */
interface ChartPoint {
  timestamp: string | Date;
  flowRate?: number;
  consumption?: number;
  avgFlowRate?: number;
}

interface WaterChartProps {
  liveData: ChartPoint[];
  historicalData: ChartPoint[];
  onRangeChange?: (range: string, window: string) => void;
}

interface ChartData {
  time: string;
  value: number;
  originalTimestamp: string | Date;
}

/* ================= HELPERS ================= */
const formatTime = (ts: string | Date) =>
  new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

const formatDate = (ts: string | Date) =>
  new Date(ts).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  });

const formatDateTime = (ts: string | Date) =>
  new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

/* ================= CUSTOM TOOLTIP ================= */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    payload: ChartData;
  }>;
  mode: 'live' | 'historical';
  timeRange: '1d' | '7d' | '30d';
}

const CustomTooltip = ({
  active,
  payload,
  mode,
  timeRange,
}: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{data.time}</p>
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: payload[0].color }}
        />
        <p className="text-sm font-semibold">
          {mode === 'live' ? (
            <>
              {data.value.toFixed(2)}{' '}
              <span className="text-muted-foreground">L/min</span>
            </>
          ) : (
            <>
              {data.value.toFixed(2)}{' '}
              <span className="text-muted-foreground">Liter</span>
            </>
          )}
        </p>
      </div>
      {mode === 'historical' && (
        <p className="text-xs text-muted-foreground mt-1">
          {timeRange === '1d' ? 'Konsumsi per jam' : 'Konsumsi per hari'}
        </p>
      )}
    </div>
  );
};

/* ================= COMPONENT ================= */
export function WaterChart({
  liveData,
  historicalData,
  onRangeChange,
}: WaterChartProps) {
  const [mode, setMode] = useState<'live' | 'historical'>('live');
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('1d');

  const handleRangeChange = (range: '1d' | '7d' | '30d') => {
    setTimeRange(range);
    setMode('historical');

    const rangeMap = {
      '1d': { range: '-24h', window: '1h' },
      '7d': { range: '-7d', window: '1d' },
      '30d': { range: '-30d', window: '1d' },
    };

    const config = rangeMap[range];
    onRangeChange?.(config.range, config.window);
  };

  const source = mode === 'live' ? liveData : historicalData;

  const chartData: ChartData[] = source.map((d) => {
    const isAggregated = 'consumption' in d;

    if (mode === 'live') {
      return {
        time: formatTime(d.timestamp),
        value: Number((d.flowRate || 0).toFixed(2)),
        originalTimestamp: d.timestamp,
      };
    }

    if (isAggregated) {
      return {
        time:
          timeRange === '1d'
            ? formatTime(d.timestamp)
            : formatDate(d.timestamp),
        value: Number((d.consumption || 0).toFixed(2)),
        originalTimestamp: d.timestamp,
      };
    }

    return {
      time: formatDateTime(d.timestamp),
      value: Number((d.flowRate || 0).toFixed(2)),
      originalTimestamp: d.timestamp,
    };
  });

  return (
    <div className="w-full h-full bg-card rounded-lg p-6 border flex flex-col">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setMode('live')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'live'
              ? 'bg-green-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Live
        </button>

        <button
          onClick={() => handleRangeChange('1d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'historical' && timeRange === '1d'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          1 Hari
        </button>

        <button
          onClick={() => handleRangeChange('7d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'historical' && timeRange === '7d'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          1 Minggu
        </button>

        <button
          onClick={() => handleRangeChange('30d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'historical' && timeRange === '30d'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover: bg-muted/80'
          }`}
        >
          1 Bulan
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/20 min-h-[300px]">
          <p className="text-muted-foreground text-sm">
            {mode === 'live' ? 'Menunggu aliran air.. .' : 'Tidak ada data'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-[300px]" style={{ width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{
                  value: mode === 'live' ? 'L/min' : 'Liter',
                  angle: -90,
                  position: 'insideLeft',
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={(tooltipProps) => {
                  return (
                    <CustomTooltip
                      active={tooltipProps.active}
                      payload={
                        tooltipProps.payload as Array<{
                          value: number;
                          dataKey: string;
                          color: string;
                          payload: ChartData;
                        }>
                      }
                      mode={mode}
                      timeRange={timeRange}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={mode === 'live' ? '#10b981' : '#3b82f6'}
                strokeWidth={2}
                dot={mode === 'historical'}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
