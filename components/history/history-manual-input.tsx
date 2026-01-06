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
import { PenLine, Calendar, Droplet, Calculator } from 'lucide-react';
import type { HistoryPricingSettings, HistoryRecord } from '@/types/history';
import {
  formatMonthDisplay,
  formatMonthKey,
  getDaysInMonth,
  calculateWaterCost,
  formatRupiah,
} from '@/lib/history';
import { MONTH_NAMES_ID } from '@/types/history';

interface HistoryManualInputProps {
  pricingSettings: HistoryPricingSettings;
  onSubmit: (record: HistoryRecord) => void;
  onBack: () => void;
}

export function HistoryManualInput({
  pricingSettings,
  onSubmit,
  onBack,
}: HistoryManualInputProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [volumeM3, setVolumeM3] = useState<string>('');
  const [waterCost, setWaterCost] = useState<string>('');
  const [fixedCost, setFixedCost] = useState<string>(
    pricingSettings.fixedCost.toString()
  );
  const [totalCost, setTotalCost] = useState<string>('');
  const [daysInMonth, setDaysInMonth] = useState<string>(
    getDaysInMonth(currentYear, currentMonth).toString()
  );
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Update days in month when month/year changes
  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    setDaysInMonth(getDaysInMonth(year, newMonth).toString());
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setDaysInMonth(getDaysInMonth(newYear, month).toString());
  };

  // Auto calculate costs when volume changes
  const handleVolumeChange = (value: string) => {
    setVolumeM3(value);

    if (autoCalculate && value) {
      const vol = parseFloat(value) || 0;
      const calculatedWaterCost = calculateWaterCost(
        vol,
        pricingSettings.tiers
      );
      const fixed = parseFloat(fixedCost) || pricingSettings.fixedCost;

      setWaterCost(calculatedWaterCost.toString());
      setTotalCost((calculatedWaterCost + fixed).toString());
    }
  };

  const handleFixedCostChange = (value: string) => {
    setFixedCost(value);

    if (autoCalculate && volumeM3) {
      const water = parseFloat(waterCost) || 0;
      const fixed = parseFloat(value) || 0;
      setTotalCost((water + fixed).toString());
    }
  };

  const handleSubmit = () => {
    const vol = parseFloat(volumeM3) || 0;
    const water =
      parseFloat(waterCost) || calculateWaterCost(vol, pricingSettings.tiers);
    const fixed = parseFloat(fixedCost) || pricingSettings.fixedCost;
    const total = parseFloat(totalCost) || water + fixed;
    const days = parseInt(daysInMonth) || getDaysInMonth(year, month);

    const record: HistoryRecord = {
      id: `manual-${year}-${month}-${Date.now()}`,
      month: formatMonthKey(year, month),
      monthDisplay: formatMonthDisplay(year, month),
      volumeM3: vol,
      waterCost: water,
      fixedCost: fixed,
      totalCost: total,
      daysInMonth: days,
      avgDailyUsage: vol / days,
    };

    onSubmit(record);
  };

  const isValid = volumeM3 && parseFloat(volumeM3) >= 0;

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <CardTitle>Input Manual</CardTitle>
        </div>
        <CardDescription>
          Masukkan data historis penggunaan air secara manual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month & Year Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Periode
          </label>
          <div className="flex gap-3">
            <select
              value={month}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
            >
              {MONTH_NAMES_ID.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="w-24 px-3 py-2 text-sm border rounded-md bg-background cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Volume Pemakaian
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={volumeM3}
              onChange={(e) => handleVolumeChange(e.target.value)}
              placeholder="Contoh: 15"
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
              min="0"
              step="0.01"
            />
            <span className="text-sm text-muted-foreground">m³</span>
          </div>
        </div>

        {/* Auto Calculate Toggle */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <input
            type="checkbox"
            id="autoCalculate"
            checked={autoCalculate}
            onChange={(e) => setAutoCalculate(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <label
            htmlFor="autoCalculate"
            className="text-sm cursor-pointer flex-1"
          >
            <span className="font-medium">Hitung otomatis</span>
            <span className="text-muted-foreground block text-xs">
              Biaya dihitung berdasarkan tarif yang sudah diatur
            </span>
          </label>
        </div>

        {/* Costs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="text-sm font-medium">Rincian Biaya</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Water Cost */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Biaya Air</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rp</span>
                <input
                  type="number"
                  value={waterCost}
                  onChange={(e) => setWaterCost(e.target.value)}
                  placeholder="0"
                  disabled={autoCalculate}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background disabled:opacity-50"
                  min="0"
                />
              </div>
            </div>

            {/* Fixed Cost */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Biaya Tetap
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rp</span>
                <input
                  type="number"
                  value={fixedCost}
                  onChange={(e) => handleFixedCostChange(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                  min="0"
                />
              </div>
            </div>

            {/* Total Cost */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Total Biaya
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rp</span>
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0"
                  disabled={autoCalculate}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background disabled:opacity-50"
                  min="0"
                />
              </div>
            </div>

            {/* Days in Month */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Hari dalam Bulan
              </label>
              <input
                type="number"
                value={daysInMonth}
                onChange={(e) => setDaysInMonth(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                min="1"
                max="31"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {volumeM3 && parseFloat(volumeM3) > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2">Preview Data</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Periode:</span>
              <span className="font-medium">
                {formatMonthDisplay(year, month)}
              </span>

              <span className="text-muted-foreground">Volume:</span>
              <span className="font-medium">
                {parseFloat(volumeM3).toFixed(2)} m³
              </span>

              <span className="text-muted-foreground">Total Biaya:</span>
              <span className="font-medium">
                {formatRupiah(parseFloat(totalCost) || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Kembali
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
            Simpan Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
