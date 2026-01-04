'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { ConsumptionPeriod, PricingSettings } from '@/types/pricing';
import { calculateTotalBill, formatRupiah, getBillingPeriod } from '@/lib/pricing';

// Monthly target consumption in m³ - can be made configurable in the future
const MONTHLY_TARGET_M3 = 30;

interface ConsumptionStats {
  todayVolume: number; // in liters
  weeklyVolume: number; // in liters
  monthlyVolume: number; // in liters
}

interface ConsumptionCardProps {
  stats: ConsumptionStats;
  pricingSettings: PricingSettings;
}

const periodLabels: Record<ConsumptionPeriod, string> = {
  today: 'Hari Ini',
  this_week: 'Minggu Ini',
  this_month: 'Bulan Ini',
};

export function ConsumptionCard({
  stats,
  pricingSettings,
}: ConsumptionCardProps) {
  const [period, setPeriod] = useState<ConsumptionPeriod>('this_week');

  const getVolumeForPeriod = (): number => {
    switch (period) {
      case 'today':
        return stats.todayVolume;
      case 'this_week':
        return stats.weeklyVolume;
      case 'this_month':
        return stats.monthlyVolume;
      default:
        return stats.weeklyVolume;
    }
  };

  const volume = getVolumeForPeriod();
  const billing = calculateTotalBill(volume, pricingSettings);
  const billingPeriod = getBillingPeriod(pricingSettings.paymentDueDay);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  };

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl">💧</div>
          <h3 className="text-lg font-bold">Konsumsi Air</h3>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as ConsumptionPeriod)}
          className="px-3 py-1 text-sm border rounded-lg bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="today">Hari Ini</option>
          <option value="this_week">Minggu Ini</option>
          <option value="this_month">Bulan Ini</option>
        </select>
      </div>

      <div className="space-y-4">
        {/* Volume Consumption */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Total Penggunaan {periodLabels[period]}:
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {volume.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">Liter</span>
            <span className="text-lg text-muted-foreground">
              ({billing.volumeInM3.toFixed(3)} m³)
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (billing.volumeInM3 / MONTHLY_TARGET_M3) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {MONTHLY_TARGET_M3} m³/bulan
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Estimasi Biaya:</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Air:</span>
              <span className="font-medium">{formatRupiah(billing.waterCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Operasional:</span>
              <span className="font-medium">
                {formatRupiah(billing.operationalCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-primary">
                {formatRupiah(billing.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Billing Period Info */}
        <div className="pt-4 border-t">
          <div className="flex items-start gap-2">
            <span className="text-lg">📅</span>
            <div className="text-xs text-muted-foreground">
              <p>
                Periode tagihan:{' '}
                <span className="font-medium">
                  {formatDate(billingPeriod.startDate)} -{' '}
                  {formatDate(billingPeriod.endDate)}
                </span>
              </p>
              <p className="mt-1">
                Jatuh tempo:{' '}
                <span className="font-medium">
                  {billingPeriod.daysRemaining} hari lagi
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
