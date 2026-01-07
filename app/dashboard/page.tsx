'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { WaterChart } from '@/components/dashboard/water-chart';
import { ConsumptionCard } from '@/components/dashboard/consumption-card';
import {
  PricingSettingsCard,
  loadPricingSettings,
} from '@/components/dashboard/pricing-settings';
import {
  ForecastChart,
  ForecastSummary,
  ForecastControls,
} from '@/components/forecast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Droplet, Gauge, Home, History } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Power } from 'lucide-react';

import type { WaterReading } from '@/lib/influxdb';
import type { PricingSettings } from '@/types/pricing';
import type { ForecastData, ForecastPeriod } from '@/types/forecast';
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
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>('daily');
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(
    () => {
      // Initialize from localStorage if available (SSR safe)
      if (typeof window !== 'undefined') {
        return loadPricingSettings();
      }
      return DEFAULT_PRICING_SETTINGS;
    }
  );

  // ✅ Track kapan terakhir kali user klik tombol
  const lastClickTime = useRef<number>(0);

  // ✅ Callback for pricing settings change
  const handlePricingSettingsChange = useCallback(
    (settings: PricingSettings) => {
      setPricingSettings(settings);
    },
    []
  );

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

  // Fetch forecast data
  useEffect(() => {
    setForecastLoading(true);
    fetch('/api/forecast')
      .then((res) => res.json())
      .then((json) => {
        // Validate that forecast data has required properties
        if (
          json &&
          json.daily &&
          json.monthly &&
          Array.isArray(json.daily) &&
          Array.isArray(json.monthly)
        ) {
          setForecastData(json);
        } else {
          setForecastData(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch forecast:', err);
        setForecastData(null);
      })
      .finally(() => setForecastLoading(false));
  }, []);

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
            <Link href="/history">
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historis</span>
              </button>
            </Link>
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
            <span
              className={`w-2 h-2 rounded-full ${
                data?.latest ? 'bg-green-400 animate-pulse' : 'bg-red-500'
              }`}
            />
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
            title="Total Volume This Day"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 h-full">
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

        {/* Forecast Section */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-2xl font-bold">Prediksi Konsumsi Air</h3>
              <p className="text-muted-foreground text-sm">
                Powered by Prophet ML Model
              </p>
            </div>
            <ForecastControls
              activePeriod={forecastPeriod}
              onPeriodChange={setForecastPeriod}
            />
          </div>

          {/* Forecast Update Banner */}
          {forecastData?.metadata?.trained_on &&
            (() => {
              const trainedDate = new Date(forecastData.metadata.trained_on);
              const daysSinceTrained = Math.floor(
                (Date.now() - trainedDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysSinceTrained > 30) {
                return (
                  <Card className="mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
                    <div className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-orange-600 dark:text-orange-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-200">
                          Model Perlu Diperbarui
                        </h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                          Model prediksi terakhir dilatih {daysSinceTrained}{' '}
                          hari yang lalu (
                          {trainedDate.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                          ). Untuk akurasi terbaik, disarankan melatih ulang
                          model dengan data terbaru.
                        </p>
                        <Link
                          href="/retrain"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Latih Ulang Model
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              }
              return null;
            })()}

          {forecastLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Memuat prediksi...
                </p>
              </div>
            </div>
          ) : forecastData ? (
            <>
              <ForecastSummary
                forecastData={forecastData}
                pricingSettings={pricingSettings}
              />

              <div className="mt-6">
                <Card className="p-6">
                  <ForecastChart
                    data={forecastData[forecastPeriod] || []}
                    period={forecastPeriod}
                  />
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto mb-4 p-4 bg-muted/50 rounded-full w-fit">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Belum Ada Data yang Cukup untuk Diprediksi
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Untuk menghasilkan prediksi konsumsi air, sistem memerlukan
                  data historis. Silakan tambahkan data historis terlebih
                  dahulu.
                </p>
                <Link href="/history">
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Tambah Data Historis
                  </button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
