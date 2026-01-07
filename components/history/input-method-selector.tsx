'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, PenLine, ArrowLeft } from 'lucide-react';

interface InputMethodSelectorProps {
  onSelectUpload: () => void;
  onSelectManual: () => void;
  onBack: () => void;
}

export function InputMethodSelector({
  onSelectUpload,
  onSelectManual,
  onBack,
}: InputMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tambah Data Historis</CardTitle>
        <CardDescription>
          Pilih metode untuk menambahkan data penggunaan air
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation Banner */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            💡 <strong>Rekomendasi:</strong> Gunakan data harian untuk prediksi
            lebih akurat
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 mt-1 ml-4 space-y-0.5">
            <li>• Data bulanan: akurasi ~85-90%</li>
            <li>• Data harian: akurasi ~90-95%</li>
          </ul>
        </div>

        {/* Upload Option */}
        <button
          onClick={onSelectUpload}
          className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Upload File XLSX</h3>
              <p className="text-sm text-muted-foreground">
                Import data dari file Excel (.xlsx). Cocok untuk menambahkan
                banyak data sekaligus. Mendukung format harian dan bulanan.
              </p>
            </div>
          </div>
        </button>

        {/* Manual Input Option */}
        <button
          onClick={onSelectManual}
          className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <PenLine className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                Input Manual (Beberapa Bulan)
              </h3>
              <p className="text-sm text-muted-foreground">
                Masukkan data beberapa bulan sekaligus secara manual. Cocok
                untuk menambahkan data bulanan dengan cepat.
              </p>
            </div>
          </div>
        </button>

        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="w-full mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </CardContent>
    </Card>
  );
}
