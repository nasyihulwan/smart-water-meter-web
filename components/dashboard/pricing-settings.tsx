'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PricingSettings,
  PriceTier,
  DEFAULT_PRICING_SETTINGS,
} from '@/types/pricing';
import { Settings, Plus, Trash2, Save } from 'lucide-react';

const STORAGE_KEY = 'water_meter_pricing_settings';

interface PricingSettingsCardProps {
  onSettingsChange: (settings: PricingSettings) => void;
  initialSettings?: PricingSettings;
}

export function PricingSettingsCard({
  onSettingsChange,
  initialSettings,
}: PricingSettingsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);

  // Initialize settings from localStorage or default
  const getInitialSettings = (): PricingSettings => {
    if (typeof window === 'undefined') {
      return initialSettings ?? DEFAULT_PRICING_SETTINGS;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as PricingSettings;
      } catch {
        return initialSettings ?? DEFAULT_PRICING_SETTINGS;
      }
    }
    return initialSettings ?? DEFAULT_PRICING_SETTINGS;
  };

  const [settings, setSettings] = useState<PricingSettings>(getInitialSettings);

  // Notify parent of initial settings on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      // Defer the callback to avoid the cascading renders warning
      const timeoutId = setTimeout(() => {
        onSettingsChange(settings);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [onSettingsChange, settings]);

  const handleTierChange = (
    index: number,
    field: keyof PriceTier,
    value: string
  ) => {
    const newTiers = [...settings.priceTiers];
    const numValue = parseFloat(value) || 0;

    if (field === 'maxVolume') {
      newTiers[index] = {
        ...newTiers[index],
        maxVolume: value === '' ? null : numValue,
      };
    } else {
      newTiers[index] = {
        ...newTiers[index],
        [field]: numValue,
      };
    }

    setSettings({ ...settings, priceTiers: newTiers });
    setHasChanges(true);
  };

  const handleAddTier = () => {
    const lastTier = settings.priceTiers[settings.priceTiers.length - 1];
    const newMinVolume = lastTier?.maxVolume ?? (lastTier ? lastTier.minVolume + 10 : 0);

    const newTier: PriceTier = {
      minVolume: newMinVolume,
      maxVolume: null,
      pricePerM3: lastTier?.pricePerM3 ?? 5000,
    };

    // Update the previous tier's maxVolume if it was null
    const newTiers = [...settings.priceTiers];
    if (newTiers.length > 0 && newTiers[newTiers.length - 1].maxVolume === null) {
      newTiers[newTiers.length - 1].maxVolume = newMinVolume;
    }

    setSettings({ ...settings, priceTiers: [...newTiers, newTier] });
    setHasChanges(true);
  };

  const handleRemoveTier = (index: number) => {
    if (settings.priceTiers.length <= 1) return;

    const newTiers = settings.priceTiers.filter((_, i) => i !== index);

    // If removing a tier, update the previous tier's maxVolume to null if it was the last
    if (index === settings.priceTiers.length - 1 && newTiers.length > 0) {
      newTiers[newTiers.length - 1].maxVolume = null;
    }

    setSettings({ ...settings, priceTiers: newTiers });
    setHasChanges(true);
  };

  const handleOperationalCostChange = (value: string) => {
    setSettings({
      ...settings,
      operationalCost: parseFloat(value) || 0,
    });
    setHasChanges(true);
  };

  const handlePaymentDueDayChange = (value: string) => {
    const day = parseInt(value) || 1;
    setSettings({
      ...settings,
      paymentDueDay: Math.min(28, Math.max(1, day)),
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    onSettingsChange(settings);
    setHasChanges(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Pengaturan Tarif Air</CardTitle>
          </div>
          <Button variant="ghost" size="sm">
            {isOpen ? '▲' : '▼'}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-6">
            {/* Price Tiers */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                Tarif Air per m³ (Bertingkat)
              </h4>
              <div className="space-y-3">
                {settings.priceTiers.map((tier, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tier.minVolume}
                        onChange={(e) =>
                          handleTierChange(index, 'minVolume', e.target.value)
                        }
                        className="w-16 px-2 py-1 text-sm border rounded bg-background"
                        min="0"
                      />
                      <span className="text-sm text-muted-foreground">-</span>
                      <input
                        type="number"
                        value={tier.maxVolume ?? ''}
                        onChange={(e) =>
                          handleTierChange(index, 'maxVolume', e.target.value)
                        }
                        placeholder="∞"
                        className="w-16 px-2 py-1 text-sm border rounded bg-background"
                        min="0"
                      />
                      <span className="text-sm text-muted-foreground">m³</span>
                    </div>
                    <span className="text-sm text-muted-foreground">=</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Rp</span>
                      <input
                        type="number"
                        value={tier.pricePerM3}
                        onChange={(e) =>
                          handleTierChange(index, 'pricePerM3', e.target.value)
                        }
                        className="w-24 px-2 py-1 text-sm border rounded bg-background"
                        min="0"
                      />
                      <span className="text-sm text-muted-foreground">/m³</span>
                    </div>
                    {settings.priceTiers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTier(index)}
                        className="ml-auto text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTier}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tier
              </Button>
            </div>

            {/* Operational Cost */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                Biaya Operasional / Beban (per bulan)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm">Rp</span>
                <input
                  type="number"
                  value={settings.operationalCost}
                  onChange={(e) => handleOperationalCostChange(e.target.value)}
                  className="w-32 px-2 py-1 text-sm border rounded bg-background"
                  min="0"
                />
              </div>
            </div>

            {/* Payment Due Day */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                Tanggal Jatuh Tempo Pembayaran
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm">Tanggal</span>
                <input
                  type="number"
                  value={settings.paymentDueDay}
                  onChange={(e) => handlePaymentDueDayChange(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border rounded bg-background"
                  min="1"
                  max="28"
                />
                <span className="text-sm text-muted-foreground">
                  setiap bulan
                </span>
              </div>
            </div>

            {/* Save Button */}
            {hasChanges && (
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Simpan Pengaturan
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Export function to load settings from localStorage
export function loadPricingSettings(): PricingSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_PRICING_SETTINGS;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as PricingSettings;
    } catch {
      return DEFAULT_PRICING_SETTINGS;
    }
  }
  return DEFAULT_PRICING_SETTINGS;
}
