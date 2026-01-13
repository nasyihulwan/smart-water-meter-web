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
import { Card } from '@/components/ui/card';
import {
  History,
  Home,
  Upload,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import type { HistoryRecord, HistoryPricingSettings } from '@/types/history';
import {
  saveHistoryData,
  loadHistoryData,
  clearHistoryData,
} from '@/lib/history';
import {
  triggerBackgroundTraining,
  checkPendingProcessing,
  markNeedsProcessing,
} from '@/lib/history-training';

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

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [hasPendingProcessing, setHasPendingProcessing] = useState(false);

  // Set isClient on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
    setHasPendingProcessing(checkPendingProcessing());
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

  const processData = async (newRecords: HistoryRecord[]) => {
    setIsProcessing(true);
    setProcessingMessage('Memproses data untuk prediksi...');

    try {
      const result = await triggerBackgroundTraining(newRecords);

      if (result.success) {
        setProcessingMessage('Data berhasil diproses!');
        markNeedsProcessing(false);
        setHasPendingProcessing(false);

        // Show success for 2 seconds
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingMessage('');
        }, 2000);
      } else {
        // Handle failure gracefully
        setProcessingMessage(result.message);
        markNeedsProcessing(true);
        setHasPendingProcessing(true);

        // Show error for 4 seconds
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingMessage('');
        }, 4000);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingMessage(
        'Sistem sedang tidak dapat memproses data. Data Anda tetap tersimpan dan dapat dicoba lagi nanti.'
      );
      markNeedsProcessing(true);
      setHasPendingProcessing(true);

      setTimeout(() => {
        setIsProcessing(false);
        setProcessingMessage('');
      }, 4000);
    }
  };

  const handleUploadComplete = useCallback(
    async (newRecords: HistoryRecord[]) => {
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

      // Trigger background training
      await processData(mergedRecords);
    },
    [records]
  );

  const handleManualSubmit = useCallback(
    async (newRecords: HistoryRecord[]) => {
      // Merge with existing records
      const existingMonthsMap = new Map(records.map((r) => [r.month, r]));

      // Update or add new records
      newRecords.forEach((newRecord) => {
        existingMonthsMap.set(newRecord.month, newRecord);
      });

      const mergedRecords = Array.from(existingMonthsMap.values()).sort(
        (a, b) => a.month.localeCompare(b.month)
      );

      setRecords(mergedRecords);
      setStep('view');

      // Trigger background training
      await processData(mergedRecords);
    },
    [records]
  );

  const handleClearAll = useCallback(async () => {
    if (
      confirm(
        'Apakah Anda yakin ingin menghapus semua data historis dan prediksi?'
      )
    ) {
      setRecords([]);
      clearHistoryData();

      // Clear forecast data
      try {
        await fetch('/api/clear-forecast', { method: 'DELETE' });
      } catch (error) {
        console.error('Failed to clear forecast:', error);
      }
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
              <Link href="/retrain">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retrain
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Pending Processing Banner */}
        {hasPendingProcessing && step === 'view' && (
          <Card className="mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-200">
                  Ada Data yang Perlu Diproses
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Data Anda telah tersimpan, tetapi belum diproses untuk
                  prediksi. Klik tombol di bawah untuk memproses data sekarang.
                </p>
                <Button
                  onClick={async () => {
                    if (records.length > 0) {
                      await processData(records);
                    }
                  }}
                  className="mt-3 bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  Proses Sekarang
                </Button>
              </div>
            </div>
          </Card>
        )}

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
                <HistoryTable records={records} onClearAll={handleClearAll} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Memproses Data</h3>
              <p className="text-muted-foreground">{processingMessage}</p>
              {processingMessage.includes('Memproses') && (
                <p className="text-sm text-muted-foreground mt-2">
                  Mohon tunggu, proses ini dapat memakan waktu 30-60 detik
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
