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
import { Plus, Trash2, Settings } from 'lucide-react';
import type {
  HistoryPricingSettings,
  HistoryPricingTier,
} from '@/types/history';
import { formatRupiah } from '@/lib/history';

interface HistoryPricingFormProps {
  initialSettings?: HistoryPricingSettings;
  onSettingsChange: (settings: HistoryPricingSettings) => void;
  onComplete: () => void;
}

const DEFAULT_SETTINGS: HistoryPricingSettings = {
  tiers: [
    { minVolume: 0, maxVolume: 10, pricePerM3: 3000 },
    { minVolume: 11, maxVolume: 20, pricePerM3: 4500 },
    { minVolume: 21, maxVolume: null, pricePerM3: 6000 },
  ],
  fixedCost: 5000,
};

export function HistoryPricingForm({
  initialSettings,
  onSettingsChange,
  onComplete,
}: HistoryPricingFormProps) {
  const [settings, setSettings] = useState<HistoryPricingSettings>(
    initialSettings ?? DEFAULT_SETTINGS
  );

  const updateTier = (
    index: number,
    field: keyof HistoryPricingTier,
    value: number | null
  ) => {
    const newTiers = [...settings.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };

    // Auto-update minVolume of next tier (maxVolume + 1)
    if (
      field === 'maxVolume' &&
      value !== null &&
      index < newTiers.length - 1
    ) {
      newTiers[index + 1] = { ...newTiers[index + 1], minVolume: value + 1 };
    }

    // Auto-update maxVolume of previous tier (minVolume - 1)
    if (field === 'minVolume' && value !== null && index > 0) {
      newTiers[index - 1] = { ...newTiers[index - 1], maxVolume: value - 1 };
    }

    const newSettings = { ...settings, tiers: newTiers };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const addTier = () => {
    const lastTier = settings.tiers[settings.tiers.length - 1];
    const newMaxVolume = lastTier.maxVolume ?? lastTier.minVolume + 10;

    // Update last tier's maxVolume
    const newTiers = [...settings.tiers];
    newTiers[newTiers.length - 1] = {
      ...lastTier,
      maxVolume: newMaxVolume,
    };

    // Add new tier (minVolume = previous maxVolume + 1)
    newTiers.push({
      minVolume: newMaxVolume + 1,
      maxVolume: null,
      pricePerM3: lastTier.pricePerM3 + 1500,
    });

    const newSettings = { ...settings, tiers: newTiers };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const removeTier = (index: number) => {
    if (settings.tiers.length <= 1) return;

    const newTiers = settings.tiers.filter((_, i) => i !== index);

    // Set last tier's maxVolume to null
    newTiers[newTiers.length - 1] = {
      ...newTiers[newTiers.length - 1],
      maxVolume: null,
    };

    const newSettings = { ...settings, tiers: newTiers };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const updateFixedCost = (value: number) => {
    const newSettings = { ...settings, fixedCost: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Pengaturan Tarif Air</CardTitle>
        </div>
        <CardDescription>
          Atur tarif air berdasarkan tingkat pemakaian (per m³) dan biaya tetap
          bulanan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tiered Pricing */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Tarif Bertingkat
          </h4>

          <div className="space-y-3">
            {settings.tiers.map((tier, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Dari (m³)
                  </label>
                  <input
                    type="number"
                    value={tier.minVolume}
                    onChange={(e) =>
                      updateTier(
                        index,
                        'minVolume',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background disabled:opacity-50"
                    disabled={index > 0 && index < settings.tiers.length - 1}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Sampai (m³)
                  </label>
                  <input
                    type="number"
                    value={tier.maxVolume ?? ''}
                    placeholder="∞"
                    onChange={(e) =>
                      updateTier(
                        index,
                        'maxVolume',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Harga/m³
                  </label>
                  <input
                    type="number"
                    value={tier.pricePerM3}
                    onChange={(e) =>
                      updateTier(
                        index,
                        'pricePerM3',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeTier(index)}
                  disabled={settings.tiers.length <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addTier}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Tingkat
          </Button>
        </div>

        {/* Fixed Cost */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">
            Biaya Tetap Bulanan
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Rp</span>
            <input
              type="number"
              value={settings.fixedCost}
              onChange={(e) => updateFixedCost(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium text-sm mb-3">
            Contoh Perhitungan (15 m³)
          </h4>
          <div className="space-y-1 text-sm">
            {settings.tiers.map((tier, index) => {
              const exampleVolume = 15;
              // Skip if volume hasn't reached this tier
              if (exampleVolume < tier.minVolume) return null;

              // For inclusive ranges (0-10, 11-20, 21-∞):
              // Tier starting at 0: effectiveMin = 0
              // Other tiers: effectiveMin = tierMin - 1
              const effectiveMin =
                tier.minVolume === 0 ? 0 : tier.minVolume - 1;
              const volumeInTier =
                Math.min(exampleVolume, tier.maxVolume ?? exampleVolume) -
                effectiveMin;
              const cost = volumeInTier * tier.pricePerM3;

              if (volumeInTier <= 0) return null;

              return (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tier.minVolume}-{tier.maxVolume ?? '∞'} m³: {volumeInTier}{' '}
                    m³ × {formatRupiah(tier.pricePerM3)}
                  </span>
                  <span>{formatRupiah(cost)}</span>
                </div>
              );
            })}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya tetap</span>
              <span>{formatRupiah(settings.fixedCost)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t mt-2">
              <span>Total</span>
              <span>
                {formatRupiah(
                  settings.tiers.reduce((total, tier) => {
                    const exampleVolume = 15;
                    if (exampleVolume < tier.minVolume) return total;
                    const effectiveMin =
                      tier.minVolume === 0 ? 0 : tier.minVolume - 1;
                    const volumeInTier =
                      Math.min(exampleVolume, tier.maxVolume ?? exampleVolume) -
                      effectiveMin;
                    return total + Math.max(0, volumeInTier) * tier.pricePerM3;
                  }, 0) + settings.fixedCost
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <Button onClick={onComplete} className="w-full">
          Lanjutkan Upload Data
        </Button>
      </CardContent>
    </Card>
  );
}
