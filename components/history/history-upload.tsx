'use client';

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import type { HistoryPricingSettings, HistoryRecord } from '@/types/history';
import * as XLSX from 'xlsx';
import {
  formatMonthDisplay,
  formatMonthKey,
  calculateWaterCost,
  getDaysInMonth,
} from '@/lib/history';

interface HistoryUploadProps {
  pricingSettings: HistoryPricingSettings;
  onUploadComplete: (records: HistoryRecord[]) => void;
  onBack: () => void;
}

export function HistoryUpload({
  pricingSettings,
  onUploadComplete,
  onBack,
}: HistoryUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<HistoryRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setPreview(null);

    if (!file.name.match(/\.xlsx$/i)) {
      setError('Format file tidak didukung. Gunakan file Excel (.xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 10MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true, // Parse dates properly
        cellNF: false,
        cellText: false,
      });

      // Get first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        raw: false, // Get formatted values, not raw
        dateNF: 'yyyy-mm-dd', // Date format
      });

      if (data.length === 0) {
        setError('File tidak mengandung data yang valid');
        return;
      }

      // Detect data type and parse records
      const records: HistoryRecord[] = [];
      let dataType: 'daily' | 'monthly' | null = null;

      for (const row of data) {
        // Support multiple column name formats (case-insensitive)
        const dateValue = row.date || row.Date || row.DATE || row.Tanggal;
        const volumeValue =
          row.total_m3 ||
          row.Volume ||
          row.VOLUME ||
          row.volume ||
          row['Volume (m³)'];

        if (!dateValue || volumeValue === undefined || volumeValue === null)
          continue;

        let dateStr: string;

        // Handle different date formats
        if (dateValue instanceof Date) {
          // Already a Date object from Excel
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');

          // Check if it's first day of month (likely monthly data)
          if (day === '01') {
            dateStr = `${year}-${month}`;
          } else {
            dateStr = `${year}-${month}-${day}`;
          }
        } else if (typeof dateValue === 'string') {
          // Already a string, use as-is
          dateStr = dateValue.trim();
        } else if (typeof dateValue === 'number') {
          // Excel serial number (fallback)
          const excelEpoch = new Date(1899, 11, 30);
          const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000);

          const year = jsDate.getFullYear();
          const month = String(jsDate.getMonth() + 1).padStart(2, '0');
          const day = String(jsDate.getDate()).padStart(2, '0');

          if (day === '01') {
            dateStr = `${year}-${month}`;
          } else {
            dateStr = `${year}-${month}-${day}`;
          }
        } else {
          continue; // Skip invalid date types
        }

        const volume = Number(volumeValue);

        if (isNaN(volume) || volume < 0) continue;

        // Detect format: YYYY-MM-DD (daily) or YYYY-MM (monthly)
        const dailyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const monthlyMatch = dateStr.match(/^(\d{4})-(\d{2})$/);

        if (dailyMatch) {
          if (dataType === null) dataType = 'daily';
          if (dataType !== 'daily') {
            setError(
              'File mengandung campuran format tanggal. Gunakan satu format saja (harian atau bulanan)'
            );
            return;
          }

          // For daily data, we need to aggregate by month
          const [, year, month] = dailyMatch;
          const monthKey = `${year}-${month}`;

          // Check if month already exists in records
          let existingRecord = records.find((r) => r.month === monthKey);

          if (!existingRecord) {
            const y = parseInt(year);
            const m = parseInt(month) - 1;
            const days = getDaysInMonth(y, m);

            existingRecord = {
              id: `upload-${monthKey}-${Date.now()}`,
              month: monthKey,
              monthDisplay: formatMonthDisplay(y, m),
              volumeM3: 0,
              waterCost: 0,
              fixedCost: pricingSettings.fixedCost,
              totalCost: 0,
              daysInMonth: days,
              avgDailyUsage: 0,
            };
            records.push(existingRecord);
          }

          existingRecord.volumeM3 += volume;
        } else if (monthlyMatch) {
          if (dataType === null) dataType = 'monthly';
          if (dataType !== 'monthly') {
            setError(
              'File mengandung campuran format tanggal. Gunakan satu format saja (harian atau bulanan)'
            );
            return;
          }

          const [, year, month] = monthlyMatch;
          const y = parseInt(year);
          const m = parseInt(month) - 1;
          const monthKey = `${year}-${month}`;
          const days = getDaysInMonth(y, m);

          const waterCost = calculateWaterCost(volume, pricingSettings.tiers);
          const totalCost = waterCost + pricingSettings.fixedCost;

          records.push({
            id: `upload-${monthKey}-${Date.now()}`,
            month: monthKey,
            monthDisplay: formatMonthDisplay(y, m),
            volumeM3: volume,
            waterCost,
            fixedCost: pricingSettings.fixedCost,
            totalCost,
            daysInMonth: days,
            avgDailyUsage: volume / days,
          });
        } else {
          setError(
            `Format tanggal tidak valid: ${dateStr}. Gunakan YYYY-MM-DD (harian) atau YYYY-MM (bulanan)`
          );
          return;
        }
      }

      // If we aggregated daily data, calculate costs now
      if (dataType === 'daily') {
        records.forEach((record) => {
          const waterCost = calculateWaterCost(
            record.volumeM3,
            pricingSettings.tiers
          );
          record.waterCost = waterCost;
          record.totalCost = waterCost + record.fixedCost;
          record.avgDailyUsage = record.volumeM3 / record.daysInMonth;
        });
      }

      if (records.length === 0) {
        setError('Tidak ada data yang valid ditemukan dalam file');
        return;
      }

      // Sort by month
      records.sort((a, b) => a.month.localeCompare(b.month));

      setPreview(records);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Gagal memproses file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <CardTitle>Upload Data Historis</CardTitle>
        </div>
        <CardDescription>
          Upload file Excel (.xlsx) dengan data historis penggunaan air Anda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Download Template</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href="/templates/template_daily.xlsx"
              download
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Template Harian (Recommended)
              </Button>
            </a>
            <a
              href="/templates/template_monthly.xlsx"
              download
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Template Bulanan
              </Button>
            </a>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              💡 <strong>Rekomendasi:</strong> Gunakan data harian untuk
              prediksi lebih akurat
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-300 mt-1 ml-4 space-y-0.5">
              <li>• Data bulanan: akurasi ~85-90%</li>
              <li>• Data harian: akurasi ~90-95%</li>
            </ul>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25'
            }
            ${error ? 'border-destructive/50' : ''}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="space-y-3">
            <Upload
              className={`h-10 w-10 mx-auto ${
                isDragging ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <div>
              <p className="font-medium">
                {isDragging
                  ? 'Lepaskan file di sini'
                  : 'Drag & drop file Excel'}
              </p>
              <p className="text-sm text-muted-foreground">
                atau klik untuk memilih file (.xlsx)
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                {preview.length} data berhasil diparse
              </span>
            </div>

            <div className="max-h-60 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Bulan</th>
                    <th className="px-3 py-2 text-right">Volume (m³)</th>
                    <th className="px-3 py-2 text-right">Biaya Air</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="px-3 py-2">{record.monthDisplay}</td>
                      <td className="px-3 py-2 text-right">
                        {record.volumeM3.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {new Intl.NumberFormat('id-ID').format(
                          record.waterCost
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {new Intl.NumberFormat('id-ID').format(
                          record.totalCost
                        )}
                      </td>
                    </tr>
                  ))}
                  {preview.length > 5 && (
                    <tr className="border-t">
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-center text-muted-foreground"
                      >
                        ... dan {preview.length - 5} data lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Kembali
              </Button>
              <Button
                onClick={() => onUploadComplete(preview)}
                className="flex-1"
              >
                Simpan Data
              </Button>
            </div>
          </div>
        )}

        {/* Format Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">Format kolom yang didukung:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Bulan</strong>: &quot;Januari 2024&quot;, &quot;Jan
              2024&quot;, &quot;01/2024&quot;, atau &quot;2024-01&quot;
            </li>
            <li>
              <strong>M3</strong>: Volume pemakaian dalam meter kubik
            </li>
            <li>
              <strong>Biaya Air</strong>: Opsional - dihitung otomatis jika
              kosong
            </li>
            <li>
              <strong>Biaya Tetap</strong>: Opsional - menggunakan pengaturan
              default
            </li>
            <li>
              <strong>Total</strong>: Opsional - dihitung otomatis
            </li>
            <li>
              <strong>Hari</strong>: Opsional - dihitung otomatis dari bulan
            </li>
          </ul>
        </div>

        {!preview && (
          <Button variant="outline" onClick={onBack} className="w-full">
            Kembali ke Pengaturan Tarif
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
