'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { WaterChart } from '@/components/dashboard/water-chart';
import { WeeklyReport } from '@/components/dashboard/weekly-report';
import { ThemeToggle } from '@/components/theme-toggle';
import { Droplet, Gauge, Power, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WaterReading {
  deviceId: string;
  flowRate: number;
  totalVolume: number;
  solenoidState: boolean;
  timestamp: Date;
}

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
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard? device_id=ESP32_001&range=-24h');
      const json = await res.json();

      if (json.success) {
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
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
          <p className="text-sm text-muted-foreground mt-2">
            Fetching real-time water data
          </p>
        </div>
      </div>
    );
  }

  // if (!data || data.historical.length === 0) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <div className="text-center max-w-md">
  //         <div className="text-6xl mb-4">📊</div>
  //         <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
  //         <p className="text-muted-foreground mb-6">
  //           Generate dummy data or connect your ESP32 device to start
  //           monitoring.
  //         </p>
  //         <div className="bg-muted p-4 rounded-lg text-sm text-left">
  //           <p className="font-medium mb-2">💡 Quick Start:</p>
  //           <code className="block bg-background p-2 rounded">
  //             npm run generate-data
  //           </code>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const latestReading = data?.latest || {
    deviceId: 'ESP32_001',
    flowRate: 0,
    totalVolume: 0,
    solenoidState: false,
    timestamp: new Date(),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💧</div>
              <h1 className="text-2xl font-bold">Smart Water Meter</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Home className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">
            Water Realtime Usage
          </h2>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="default" className="gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Current Status
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Flow Rate"
            value={latestReading.flowRate.toFixed(2)}
            unit="L/min"
            icon={Droplet}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-950"
          />
          <StatsCard
            title="Total Volume"
            value={latestReading.totalVolume.toFixed(1)}
            unit="Liters"
            icon={Gauge}
            iconColor="text-green-500"
            iconBgColor="bg-green-50 dark: bg-green-950"
          />
          <StatsCard
            title="Solenoid Valve"
            value={latestReading.solenoidState ? 'OPEN' : 'CLOSED'}
            unit={latestReading.solenoidState ? '🟢' : '🔴'}
            icon={Power}
            iconColor="text-orange-500"
            iconBgColor="bg-orange-50 dark:bg-orange-950"
          />
        </div>

        {/* Chart & Report Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - 2 columns */}
          <div className="lg:col-span-2">
            <WaterChart data={data?.historical || []} />
          </div>

          {/* Weekly Report - 1 column */}
          <div className="lg:col-span-1">
            <WeeklyReport
              totalUsage={parseFloat(data?.stats?.totalVolume || '0')}
              dateRange="01 Jan - 08 Jan 2026"
              peakHour="Monday 08/01 (18:00, 12.5 L)"
              weeklyCost={45000}
              notes="Penggunaan harian rata-rata 8.6 L dalam 8 hari.  Peak penggunaan di Monday jam 18:00 masih wajar untuk aktivitas sore/malam.  Tetap monitor penggunaan perangkat elektronik."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
