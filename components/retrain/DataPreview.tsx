'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Calendar, Droplets } from 'lucide-react';

interface DataPreviewProps {
  data: Array<{ date: string; total_m3: number }>;
  dataType: 'daily' | 'monthly';
  validationResult: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function DataPreview({
  data,
  dataType,
  validationResult,
}: DataPreviewProps) {
  // Calculate statistics
  const totalRows = data.length;
  const dateRange = {
    start: data[0]?.date || '',
    end: data[data.length - 1]?.date || '',
  };
  const totalVolume = data.reduce((sum, row) => sum + row.total_m3, 0);
  const averageVolume = totalVolume / totalRows;

  // Preview data (first 10 rows)
  const previewData = data.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Rows</p>
          </div>
          <p className="text-2xl font-bold">{totalRows}</p>
          <Badge variant="secondary" className="mt-2">
            {dataType}
          </Badge>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Date Range</p>
          </div>
          <p className="text-sm font-medium">{dateRange.start}</p>
          <p className="text-sm text-muted-foreground">to {dateRange.end}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </div>
          <p className="text-2xl font-bold">{totalVolume.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">m³</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Average</p>
          </div>
          <p className="text-2xl font-bold">{averageVolume.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            m³/{dataType === 'daily' ? 'day' : 'month'}
          </p>
        </Card>
      </div>

      {/* Validation Warnings */}
      {validationResult.warnings.length > 0 && (
        <Card className="p-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Validation Warnings:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-sm text-yellow-800 dark:text-yellow-200"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Volume (m³)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {previewData.map((row, index) => (
                <tr key={index} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{row.date}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {row.total_m3.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 10 && (
          <div className="px-4 py-3 bg-muted/50 text-center text-sm text-muted-foreground">
            Showing first 10 of {data.length} rows
          </div>
        )}
      </Card>
    </div>
  );
}
