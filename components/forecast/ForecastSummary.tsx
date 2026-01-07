'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, Calendar, CalendarDays, Wallet, Info } from 'lucide-react';
import type { ForecastData } from '@/types/forecast';
import type { PricingSettings } from '@/types/pricing';
import {
  calculateTotalBill,
  formatRupiah,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateWaterCost,
} from '@/lib/pricing';
import {
  getNextNDays,
  calculateTotalVolume,
  formatVolume,
} from '@/lib/forecast-utils';

interface ForecastSummaryProps {
  forecastData: ForecastData;
  pricingSettings: PricingSettings;
}

export function ForecastSummary({
  forecastData,
  pricingSettings,
}: ForecastSummaryProps) {
  // Validate forecast data structure
  if (!forecastData || !forecastData.daily || !forecastData.monthly) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Data prediksi tidak valid. Silakan refresh halaman.
          </p>
        </div>
      </Card>
    );
  }

  // Get today's forecast
  const today = new Date().toISOString().split('T')[0];
  const todayForecast = forecastData.daily.find((d) => d.date === today);

  // Get next 7 days forecast
  const next7Days = getNextNDays(forecastData.daily, 7);
  const weeklyTotal = calculateTotalVolume(next7Days);

  // Get current month forecast
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthForecast = forecastData.monthly.find(
    (m) => m.month === currentMonth
  );

  // Calculate estimated bill for the month
  const monthlyVolume = monthForecast?.volumeInLiters || 0;
  const billEstimate = calculateTotalBill(monthlyVolume, pricingSettings);

  // Calculate cost breakdown for display
  const costBreakdown = {
    volumeM3: (monthlyVolume / 1000).toFixed(2),
    waterCost: billEstimate.waterCost,
    operationalCost: billEstimate.operationalCost,
    total: billEstimate.total,
  };

  // Format pricing tiers dynamically
  const formatPricingTiers = () => {
    const sortedTiers = [...pricingSettings.priceTiers].sort(
      (a, b) => a.minVolume - b.minVolume
    );
    return sortedTiers
      .map((tier) => {
        const range =
          tier.maxVolume === null
            ? `${tier.minVolume}+ m³`
            : `${tier.minVolume}-${tier.maxVolume} m³`;
        return `${range}: Rp${tier.pricePerM3.toLocaleString('id-ID')}`;
      })
      .join(' | ');
  };

  const summaryCards = [
    {
      title: 'Prediksi Hari Ini',
      value: todayForecast
        ? formatVolume(todayForecast.volumeInLiters, 'm3')
        : '-',
      subtext: todayForecast
        ? `${formatVolume(todayForecast.volumeInLiters)} (${formatVolume(
            todayForecast.volumeInLiters_lower
          )} - ${formatVolume(todayForecast.volumeInLiters_upper)})`
        : 'Data tidak tersedia',
      icon: TrendingUp,
      iconColor: 'text-blue-500',
      iconBgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Prediksi 7 Hari',
      value: formatVolume(weeklyTotal, 'm3'),
      subtext:
        next7Days.length > 0
          ? `${formatVolume(weeklyTotal)} • ${next7Days.length} hari ke depan`
          : 'Data tidak tersedia',
      icon: Calendar,
      iconColor: 'text-green-500',
      iconBgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Prediksi Bulan Ini',
      value: monthForecast
        ? formatVolume(monthForecast.volumeInLiters, 'm3')
        : '-',
      subtext: monthForecast
        ? `${formatVolume(monthForecast.volumeInLiters)} (${formatVolume(
            monthForecast.volumeInLiters_lower,
            'm3'
          )} - ${formatVolume(monthForecast.volumeInLiters_upper, 'm3')})`
        : 'Data tidak tersedia',
      icon: CalendarDays,
      iconColor: 'text-purple-500',
      iconBgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Estimasi Biaya',
      value: formatRupiah(billEstimate.total),
      subtext: monthForecast
        ? `${
            costBreakdown.volumeM3
          } m³ • Tarif progresif + Rp ${costBreakdown.operationalCost.toLocaleString(
            'id-ID'
          )} ops`
        : 'Berdasarkan prediksi bulanan',
      icon: Wallet,
      iconColor: 'text-amber-500',
      iconBgColor: 'bg-amber-50 dark:bg-amber-950',
      hasDetail: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {card.title}
                </p>
                <div className="mt-2">
                  <h3 className="text-2xl font-bold tracking-tight truncate">
                    {card.value}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtext}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-lg shrink-0 ${card.iconBgColor}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Cost Breakdown Detail */}
      {monthForecast && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">
                Detail Kalkulasi Biaya:
              </p>
              <div className="text-muted-foreground space-y-0.5">
                <p>
                  Volume: {costBreakdown.volumeM3} m³ (
                  {formatVolume(monthlyVolume)})
                </p>
                <p>
                  Tarif Air (Progresif): {formatRupiah(costBreakdown.waterCost)}
                  <span className="text-xs ml-1">({formatPricingTiers()})</span>
                </p>
                <p>
                  Biaya Operasional:{' '}
                  {formatRupiah(costBreakdown.operationalCost)}
                </p>
                <p className="font-medium text-foreground pt-1 border-t border-border mt-1">
                  Total Estimasi: {formatRupiah(costBreakdown.total)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
