'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { WaterChart } from '@/components/dashboard/water-chart';
import { WeeklyReport } from '@/components/dashboard/weekly-report';
import { ThemeToggle } from '@/components/theme-toggle';
import { Droplet, Gauge, Power, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import type { WaterReading } from '@/lib/influxdb';

interface DashboardData {
  success: boolean;
  latest: WaterReading | null;
  historical: WaterReading[];
  stats: {
    totalVolume: string;
    avgFlowRate: string;
    dataPoints: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [liveData, setLiveData] = useState<WaterReading[]>([]);
  const [historicalData, setHistoricalData] = useState<WaterReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = (range: string = '-24h', window?: string) => {
    const mode = window ? 'aggregated' : 'live';
    const url = `/api/dashboard?device_id=water_meter_01&range=${range}&mode=${mode}${
      window ? `&window=${window}` : ''
    }`;

    fetch(url)
      .then((res) => res.json())
      .then((json: DashboardData) => {
        if (json?.success) {
          setData(json);
          // Set historical data (STATIC, tidak akan di-update SSE)
          setHistoricalData(json.historical || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // 1. Fetch initial data
    fetchData();

    // 2. Setup SSE untuk LIVE DATA saja
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const realtime = JSON.parse(event.data);

      const newPoint: WaterReading = {
        ...realtime,
        timestamp: new Date(),
      };

      // Update latest reading
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latest: newPoint,
        };
      });

      // Update LIVE DATA saja (max 300 points)
      setLiveData((prev) => [...prev, newPoint].slice(-300));
    };

    eventSource.onerror = () => {
      console.error('SSE connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplet className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const latestReading: WaterReading = data?.latest
    ? {
        ...data.latest,
        timestamp: new Date(data.latest.timestamp),
      }
    : {
        deviceId: 'water_meter_01',
        flowRate: 0,
        totalVolume: 0,
        solenoidState: false,
        timestamp: new Date(),
      };

  const formatNumber = (value: unknown, digits: number) => {
    return typeof value === 'number' && !Number.isNaN(value)
      ? value.toFixed(digits)
      : '0. 00';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💧</div>
            <h1 className="text-2xl font-bold">Smart Water Meter</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Home className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-primary mb-2">
            Water Realtime Usage
          </h2>
          <Badge variant="default" className="gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Current Status
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Flow Rate"
            value={formatNumber(latestReading.flowRate, 2)}
            unit="L/min"
            icon={Droplet}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-950"
          />

          <StatsCard
            title="Total Volume"
            value={formatNumber(latestReading.totalVolume, 1)}
            unit="Liters"
            icon={Gauge}
            iconColor="text-green-500"
            iconBgColor="bg-green-50 dark:bg-green-950"
          />

          <StatsCard
            title="Solenoid Valve"
            value={latestReading.solenoidState ? 'OPEN' : 'CLOSED'}
            unit={latestReading.solenoidState ? '🟢' : '🔴'}
            icon={Power}
            iconColor="text-orange-500"
            iconBgColor="bg-orange-50 dark: bg-orange-950"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WaterChart
              liveData={liveData}
              historicalData={historicalData}
              onRangeChange={(range, window) => {
                fetchData(range, window);
              }}
            />
          </div>

          <WeeklyReport
            totalUsage={parseFloat(data?.stats?.totalVolume ?? '0')}
            dateRange="01 Jan - 08 Jan 2026"
            peakHour="Monday 18:00 (12. 5 L)"
            weeklyCost={45000}
            notes="Penggunaan air masih dalam batas wajar.  Tetap monitor untuk efisiensi."
          />
        </div>
      </main>
    </div>
  );
}
