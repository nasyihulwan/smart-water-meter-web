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
              <h3 className="font-semibold mb-1">Upload File CSV</h3>
              <p className="text-sm text-muted-foreground">
                Import data dari file CSV atau Excel. Cocok untuk menambahkan
                banyak data sekaligus.
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
              <h3 className="font-semibold mb-1">Input Manual</h3>
              <p className="text-sm text-muted-foreground">
                Masukkan data satu per satu secara manual. Cocok untuk
                menambahkan data bulanan.
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
