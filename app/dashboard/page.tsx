'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { WaterChart } from '@/components/dashboard/water-chart';
import { ConsumptionCard } from '@/components/dashboard/consumption-card';
import { PricingSettingsCard, loadPricingSettings } from '@/components/dashboard/pricing-settings';
import { ThemeToggle } from '@/components/theme-toggle';
import { Droplet, Gauge, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Power } from 'lucide-react';

import type { WaterReading } from '@/lib/influxdb';
import type { PricingSettings } from '@/types/pricing';
import { DEFAULT_PRICING_SETTINGS } from '@/types/pricing';

interface DashboardData {
  success: boolean;
  latest: WaterReading | null;
  historical: WaterReading[];
  stats: {
    totalVolume: string;
    weeklyVolume: string;
    monthlyVolume: string;
    avgFlowRate: string;
    dataPoints: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [liveData, setLiveData] = useState<WaterReading[]>([]);
  const [historicalData, setHistoricalData] = useState<WaterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => {
    // Initialize from localStorage if available (SSR safe)
    if (typeof window !== 'undefined') {
      return loadPricingSettings();
    }
    return DEFAULT_PRICING_SETTINGS;
  });

  // ✅ Track kapan terakhir kali user klik tombol
  const lastClickTime = useRef<number>(0);

  // ✅ Callback for pricing settings change
  const handlePricingSettingsChange = useCallback((settings: PricingSettings) => {
    setPricingSettings(settings);
  }, []);

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
          setHistoricalData(json.historical || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();

    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const realtime = JSON.parse(event.data);

      const newPoint: WaterReading = {
        ...realtime,
        timestamp: new Date(),
      };

      // ✅ Ignore SSE update solenoid state selama 3 detik setelah user klik
      const timeSinceClick = Date.now() - lastClickTime.current;
      const shouldUpdateSolenoid = timeSinceClick > 3000;

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latest: {
            ...newPoint,
            // ✅ Keep user's optimistic state jika baru klik
            solenoidState: shouldUpdateSolenoid
              ? newPoint.solenoidState
              : prev.latest?.solenoidState ?? newPoint.solenoidState,
          },
        };
      });

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
      : '0.00';
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
            value={parseFloat(data?.stats?.totalVolume ?? '0').toFixed(1)}
            unit="Liters"
            icon={Gauge}
            iconColor="text-green-500"
            iconBgColor="bg-green-50 dark:bg-green-950"
          />

          {/* SOLENOID VALVE - OPTIMISTIC UPDATE WITH DEBOUNCE */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Solenoid Valve
                </p>
                <button
                  onClick={() => {
                    const newState = !latestReading.solenoidState;
                    const command = newState ? 'ON' : 'OFF';

                    // ✅ Record waktu klik
                    lastClickTime.current = Date.now();

                    // ✅ Update UI instant
                    setData((prev) => {
                      if (!prev || !prev.latest) return prev;
                      return {
                        ...prev,
                        latest: {
                          ...prev.latest,
                          solenoidState: newState,
                        },
                      };
                    });

                    // ✅ Kirim MQTT
                    fetch('/api/relay', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ state: command }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        console.log('✅ MQTT sent:', data);
                      })
                      .catch((err) => {
                        console.error('❌ Failed:', err);
                        // Rollback jika gagal
                        setData((prev) => {
                          if (!prev || !prev.latest) return prev;
                          return {
                            ...prev,
                            latest: {
                              ...prev.latest,
                              solenoidState: !newState,
                            },
                          };
                        });
                      });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    latestReading.solenoidState
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <span className="text-xl">
                    {latestReading.solenoidState ? '🟢' : '🔴'}
                  </span>
                  <span>{latestReading.solenoidState ? 'OPEN' : 'CLOSED'}</span>
                </button>
              </div>
              <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-950">
                <Power className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </Card>
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

          <ConsumptionCard
            stats={{
              todayVolume: parseFloat(data?.stats?.totalVolume ?? '0'),
              weeklyVolume: parseFloat(data?.stats?.weeklyVolume ?? '0'),
              monthlyVolume: parseFloat(data?.stats?.monthlyVolume ?? '0'),
            }}
            pricingSettings={pricingSettings}
          />
        </div>

        {/* Pricing Settings Section */}
        <div className="mt-8">
          <PricingSettingsCard onSettingsChange={handlePricingSettingsChange} />
        </div>
      </main>
    </div>
  );
}
