'use client';

import { Button } from '@/components/ui/button';
import type { ForecastPeriod } from '@/types/forecast';

interface ForecastControlsProps {
  activePeriod: ForecastPeriod;
  onPeriodChange: (period: ForecastPeriod) => void;
}

const periodOptions: { value: ForecastPeriod; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
];

export function ForecastControls({
  activePeriod,
  onPeriodChange,
}: ForecastControlsProps) {
  return (
    <div className="flex gap-2">
      {periodOptions.map((option) => (
        <Button
          key={option.value}
          variant={activePeriod === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPeriodChange(option.value)}
          className="min-w-[80px]"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
