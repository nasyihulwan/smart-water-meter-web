'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenLine, Droplet } from 'lucide-react';
import type { HistoryPricingSettings, HistoryRecord } from '@/types/history';
import {
  formatMonthDisplay,
  formatMonthKey,
  getDaysInMonth,
  calculateWaterCost,
} from '@/lib/history';
import { MONTH_NAMES_ID } from '@/types/history';

interface HistoryManualInputProps {
  pricingSettings: HistoryPricingSettings;
  onSubmit: (records: HistoryRecord[]) => void;
  onBack: () => void;
}

interface MonthInput {
  id: string;
  month: number;
  year: number;
  volumeM3: string;
}

export function HistoryManualInput({
  pricingSettings,
  onSubmit,
  onBack,
}: HistoryManualInputProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [monthCount, setMonthCount] = useState<number>(1);
  const [inputs, setInputs] = useState<MonthInput[]>([
    {
      id: '1',
      month: currentMonth,
      year: currentYear,
      volumeM3: '',
    },
  ]);

  const handleMonthCountChange = (count: number) => {
    setMonthCount(count);

    // Generate month inputs
    const newInputs: MonthInput[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      newInputs.push({
        id: String(i + 1),
        month: date.getMonth(),
        year: date.getFullYear(),
        volumeM3: inputs[i]?.volumeM3 || '',
      });
    }
    setInputs(newInputs);
  };

  const updateInput = (
    id: string,
    field: keyof MonthInput,
    value: string | number
  ) => {
    setInputs((prev) =>
      prev.map((input) =>
        input.id === id ? { ...input, [field]: value } : input
      )
    );
  };

  const handleSubmit = () => {
    const records: HistoryRecord[] = [];
    const monthKeys = new Set<string>();

    // Validate and create records
    for (const input of inputs) {
      const vol = parseFloat(input.volumeM3);

      if (isNaN(vol) || vol < 0) continue;

      const monthKey = formatMonthKey(input.year, input.month);

      // Check for duplicates
      if (monthKeys.has(monthKey)) {
        alert(
          `Bulan ${formatMonthDisplay(
            input.year,
            input.month
          )} muncul lebih dari sekali. Harap periksa input Anda.`
        );
        return;
      }
      monthKeys.add(monthKey);

      const days = getDaysInMonth(input.year, input.month);
      const waterCost = calculateWaterCost(vol, pricingSettings.tiers);
      const totalCost = waterCost + pricingSettings.fixedCost;

      records.push({
        id: `manual-${monthKey}-${Date.now()}`,
        month: monthKey,
        monthDisplay: formatMonthDisplay(input.year, input.month),
        volumeM3: vol,
        waterCost,
        fixedCost: pricingSettings.fixedCost,
        totalCost,
        daysInMonth: days,
        avgDailyUsage: vol / days,
      });
    }

    if (records.length === 0) {
      alert('Harap isi setidaknya satu bulan dengan volume yang valid');
      return;
    }

    // Sort by month
    records.sort((a, b) => a.month.localeCompare(b.month));

    onSubmit(records);
  };

  const isValid = inputs.some((input) => {
    const vol = parseFloat(input.volumeM3);
    return !isNaN(vol) && vol >= 0;
  });

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <CardTitle>Input Manual (Beberapa Bulan)</CardTitle>
        </div>
        <CardDescription>
          Masukkan data historis penggunaan air untuk beberapa bulan sekaligus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Count Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Berapa bulan data yang akan Anda input?
          </label>
          <select
            value={monthCount}
            onChange={(e) => handleMonthCountChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((count) => (
              <option key={count} value={count}>
                {count} bulan
              </option>
            ))}
          </select>
        </div>

        {/* Month Inputs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Data Bulanan</p>
            <p className="text-xs text-muted-foreground">
              {inputs.filter((i) => i.volumeM3).length} dari {inputs.length}{' '}
              terisi
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {inputs.map((input, index) => (
              <div
                key={input.id}
                className="p-4 border rounded-lg bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Bulan #{index + 1}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Bulan
                    </label>
                    <select
                      value={input.month}
                      onChange={(e) =>
                        updateInput(input.id, 'month', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
                    >
                      {MONTH_NAMES_ID.map((name, idx) => (
                        <option key={idx} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Tahun
                    </label>
                    <select
                      value={input.year}
                      onChange={(e) =>
                        updateInput(input.id, 'year', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Droplet className="h-3 w-3" />
                    Volume Pemakaian
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={input.volumeM3}
                      onChange={(e) =>
                        updateInput(input.id, 'volumeM3', e.target.value)
                      }
                      placeholder="Contoh: 15"
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-sm text-muted-foreground">m³</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            💡 <strong>Tips:</strong> Biaya air dihitung otomatis berdasarkan
            tarif yang telah diatur. Pastikan tidak ada bulan yang duplikat.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Kembali
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
            Simpan Semua Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
