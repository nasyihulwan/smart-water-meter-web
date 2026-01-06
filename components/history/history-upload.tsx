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
import { parseCSV } from '@/lib/history';

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

    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Format file tidak didukung. Gunakan file CSV atau Excel.');
      return;
    }

    try {
      let content: string;

      if (file.name.endsWith('.csv')) {
        content = await file.text();
      } else {
        // For Excel files, we need to convert to CSV
        // Since we don't have xlsx library, show instruction to export as CSV
        setError(
          'Untuk file Excel, silakan export ke format CSV terlebih dahulu (File → Save As → CSV)'
        );
        return;
      }

      const records = parseCSV(content, pricingSettings);

      if (records.length === 0) {
        setError('Tidak ada data yang valid ditemukan dalam file');
        return;
      }

      setPreview(records);
    } catch (err) {
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

  const downloadTemplate = () => {
    const template = `Bulan,M3,Biaya Air,Biaya Tetap,Total,Hari
Januari 2024,15,52500,5000,57500,31
Februari 2024,12,42000,5000,47000,29
Maret 2024,18,67500,5000,72500,31`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_historis_air.csv';
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <CardTitle>Upload Data Historis</CardTitle>
        </div>
        <CardDescription>
          Upload file CSV dengan data historis penggunaan air Anda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="text-sm">
            <p className="font-medium">Butuh template?</p>
            <p className="text-muted-foreground">Download contoh format CSV</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
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
            accept=".csv,.xlsx,.xls"
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
                {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file CSV'}
              </p>
              <p className="text-sm text-muted-foreground">
                atau klik untuk memilih file
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
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
