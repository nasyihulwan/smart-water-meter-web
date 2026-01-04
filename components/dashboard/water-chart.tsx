'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ================= TYPES ================= */
interface ChartPoint {
  timestamp: string | Date;
  flowRate: number;
}

interface WaterChartProps {
  liveData: ChartPoint[]; // realtime (SSE)
  historicalData: ChartPoint[]; // dari InfluxDB
}

/* ================= HELPERS ================= */
const formatTime = (ts: string | Date) =>
  new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatDateTime = (ts: string | Date) =>
  new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/* ================= COMPONENT ================= */
export function WaterChart({ liveData, historicalData }: WaterChartProps) {
  const [mode, setMode] = useState<'live' | 'historical'>('live');

  // Tentukan sumber data
  const source = mode === 'live' ? liveData : historicalData;

  // Mapping data → CHART DATA
  const chartData = source.map((d) => ({
    time:
      mode === 'live'
        ? formatTime(d.timestamp) // jam:menit:detik
        : formatDateTime(d.timestamp), // hari + jam
    flow: Number(d.flowRate.toFixed(2)),
  }));

  return (
    <div className="w-full">
      {/* ===== MODE SWITCH ===== */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('live')}
          className={`px-3 py-1 rounded text-sm ${
            mode === 'live'
              ? 'bg-green-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Live
        </button>

        <button
          onClick={() => setMode('historical')}
          className={`px-3 py-1 rounded text-sm ${
            mode === 'historical'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Historical
        </button>
      </div>

      {/* ===== EMPTY STATE ===== */}
      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center border rounded">
          <p className="text-muted-foreground text-sm">
            {mode === 'live'
              ? 'Menunggu aliran air...'
              : 'Tidak ada data historis'}
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis
                label={{
                  value: 'L/min',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="flow"
                stroke={mode === 'live' ? '#10b981' : '#3b82f6'}
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
