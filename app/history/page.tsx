'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { HistoryPricingForm } from '@/components/history/history-pricing-form';
import { HistoryUpload } from '@/components/history/history-upload';
import { HistoryManualInput } from '@/components/history/history-manual-input';
import { InputMethodSelector } from '@/components/history/input-method-selector';
import { HistoryTable } from '@/components/history/history-table';
import { HistoryChart } from '@/components/history/history-chart';
import { Button } from '@/components/ui/button';
import { History, Home, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import type { HistoryRecord, HistoryPricingSettings } from '@/types/history';
import {
  saveHistoryData,
  loadHistoryData,
  clearHistoryData,
} from '@/lib/history';

type Step = 'view' | 'pricing' | 'select-method' | 'upload' | 'manual';

const DEFAULT_PRICING: HistoryPricingSettings = {
  tiers: [
    { minVolume: 0, maxVolume: 10, pricePerM3: 3000 },
    { minVolume: 11, maxVolume: 20, pricePerM3: 4500 },
    { minVolume: 21, maxVolume: null, pricePerM3: 6000 },
  ],
  fixedCost: 5000,
};

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);
  const [step, setStep] = useState<Step>('view');
  const [records, setRecords] = useState<HistoryRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = loadHistoryData();
    return stored ? stored.records : [];
  });
  const [pricingSettings, setPricingSettings] =
    useState<HistoryPricingSettings>(() => {
      if (typeof window === 'undefined') return DEFAULT_PRICING;
      const stored = loadHistoryData();
      return stored ? stored.pricingSettings : DEFAULT_PRICING;
    });

  // Set isClient on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Save data to localStorage when records change
  useEffect(() => {
    if (records.length > 0) {
      saveHistoryData({ records, pricingSettings });
    }
  }, [records, pricingSettings]);

  const handlePricingChange = useCallback(
    (settings: HistoryPricingSettings) => {
      setPricingSettings(settings);
    },
    []
  );

  const handleUploadComplete = useCallback(
    (newRecords: HistoryRecord[]) => {
      // Merge new records with existing (avoid duplicates based on month)
      const existingMonths = new Set(records.map((r) => r.month));
      const uniqueNewRecords = newRecords.filter(
        (r) => !existingMonths.has(r.month)
      );

      const mergedRecords = [...records, ...uniqueNewRecords].sort((a, b) =>
        a.month.localeCompare(b.month)
      );

      setRecords(mergedRecords);
      setStep('view');
    },
    [records]
  );

  const handleManualSubmit = useCallback(
    (newRecord: HistoryRecord) => {
      // Check if record for this month already exists
      const existingIndex = records.findIndex(
        (r) => r.month === newRecord.month
      );

      if (existingIndex >= 0) {
        // Replace existing record
        const updatedRecords = [...records];
        updatedRecords[existingIndex] = newRecord;
        setRecords(
          updatedRecords.sort((a, b) => a.month.localeCompare(b.month))
        );
      } else {
        // Add new record
        setRecords((prev) =>
          [...prev, newRecord].sort((a, b) => a.month.localeCompare(b.month))
        );
      }

      setStep('view');
    },
    [records]
  );

  const handleDeleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data historis?')) {
      setRecords([]);
      clearHistoryData();
    }
  }, []);

  const startAddData = () => {
    setStep('pricing');
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto"></div>
          <p className="mt-6 text-lg font-medium text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <History className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Historis Penggunaan</h1>
                  <p className="text-sm text-muted-foreground">
                    Data penggunaan air periode sebelumnya
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step === 'view' && (
                <Button onClick={startAddData} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Data
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {step === 'pricing' && (
          <div className="max-w-xl mx-auto">
            <HistoryPricingForm
              initialSettings={pricingSettings}
              onSettingsChange={handlePricingChange}
              onComplete={() => setStep('select-method')}
            />
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setStep('view')}
            >
              Batal
            </Button>
          </div>
        )}

        {step === 'select-method' && (
          <div className="max-w-xl mx-auto">
            <InputMethodSelector
              onSelectUpload={() => setStep('upload')}
              onSelectManual={() => setStep('manual')}
              onBack={() => setStep('pricing')}
            />
          </div>
        )}

        {step === 'upload' && (
          <div className="max-w-xl mx-auto">
            <HistoryUpload
              pricingSettings={pricingSettings}
              onUploadComplete={handleUploadComplete}
              onBack={() => setStep('select-method')}
            />
          </div>
        )}

        {step === 'manual' && (
          <div className="max-w-xl mx-auto">
            <HistoryManualInput
              pricingSettings={pricingSettings}
              onSubmit={handleManualSubmit}
              onBack={() => setStep('select-method')}
            />
          </div>
        )}

        {step === 'view' && (
          <div className="space-y-6">
            {records.length === 0 ? (
              <div className="max-w-xl mx-auto">
                <div className="text-center py-12 bg-card border rounded-xl">
                  <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold mb-2">Belum Ada Data</h2>
                  <p className="text-muted-foreground mb-6">
                    Upload file CSV untuk melihat historis penggunaan air
                  </p>
                  <Button onClick={startAddData}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Data Historis
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Chart */}
                <HistoryChart records={records} />

                {/* Table */}
                <HistoryTable
                  records={records}
                  onDelete={handleDeleteRecord}
                  onClearAll={handleClearAll}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
