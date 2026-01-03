'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WeeklyReportProps {
  totalUsage: number;
  dateRange: string;
  peakHour: string;
  weeklyCost: number;
  notes: string;
}

export function WeeklyReport({
  totalUsage,
  dateRange,
  peakHour,
  weeklyCost,
  notes,
}: WeeklyReportProps) {
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">📊</div>
        <h3 className="text-lg font-bold">Weekly Report - Week 1</h3>
      </div>

      <div className="space-y-4">
        {/* Total Consumption */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Total Water Consumption this Week:
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{totalUsage.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">Liters</span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: '75%' }}
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Date: </p>
          <p className="text-sm font-semibold">{dateRange}</p>
        </div>

        {/* Peak Hour */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Peak Hour:
          </p>
          <p className="text-sm font-semibold">{peakHour}</p>
        </div>

        {/* Weekly Cost */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Weekly Cost:
          </p>
          <p className="text-lg font-bold text-primary">
            Rp {weeklyCost.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Notes:
          </p>
          <p className="text-sm leading-relaxed">{notes}</p>
        </div>

        {/* Forecast Status */}
        <div className="pt-4 border-t">
          <div className="flex items-start gap-2">
            <span className="text-lg">📈</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Konsumsi Anda ({totalUsage.toFixed(1)} L) sesuai dengan forecast.
              Tetap monitor penggunaan untuk efisiensi maksimal.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
