'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { HistoryRecord } from '@/types/history';
import { formatRupiah } from '@/lib/history';

interface HistoryTableProps {
  records: HistoryRecord[];
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

type SortField = 'month' | 'volumeM3' | 'totalCost' | 'avgDailyUsage';
type SortDirection = 'asc' | 'desc';

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  }
  return sortDirection === 'asc' ? (
    <ArrowUp className="h-4 w-4 ml-1" />
  ) : (
    <ArrowDown className="h-4 w-4 ml-1" />
  );
}

export function HistoryTable({
  records,
  onDelete,
  onClearAll,
}: HistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'month':
        comparison = a.month.localeCompare(b.month);
        break;
      case 'volumeM3':
        comparison = a.volumeM3 - b.volumeM3;
        break;
      case 'totalCost':
        comparison = a.totalCost - b.totalCost;
        break;
      case 'avgDailyUsage':
        comparison = a.avgDailyUsage - b.avgDailyUsage;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calculate totals
  const totals = records.reduce(
    (acc, record) => ({
      volumeM3: acc.volumeM3 + record.volumeM3,
      waterCost: acc.waterCost + record.waterCost,
      fixedCost: acc.fixedCost + record.fixedCost,
      totalCost: acc.totalCost + record.totalCost,
    }),
    { volumeM3: 0, waterCost: 0, fixedCost: 0, totalCost: 0 }
  );

  const avgMonthly = records.length > 0 ? totals.volumeM3 / records.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5 text-primary" />
            <CardTitle>Data Historis</CardTitle>
          </div>
          {onClearAll && records.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Table className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data historis</p>
            <p className="text-sm">Upload file CSV untuk menambahkan data</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Periode</p>
                <p className="text-lg font-semibold">{records.length} bulan</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-lg font-semibold">
                  {totals.volumeM3.toFixed(1)} m³
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Rata-rata/Bulan</p>
                <p className="text-lg font-semibold">
                  {avgMonthly.toFixed(1)} m³
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Biaya</p>
                <p className="text-lg font-semibold">
                  {formatRupiah(totals.totalCost)}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th
                      className="px-3 py-3 text-left cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('month')}
                    >
                      <span className="flex items-center">
                        Bulan
                        <SortIcon
                          field="month"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </span>
                    </th>
                    <th
                      className="px-3 py-3 text-right cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('volumeM3')}
                    >
                      <span className="flex items-center justify-end">
                        Volume (m³)
                        <SortIcon
                          field="volumeM3"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-3 text-right hidden md:table-cell">
                      Biaya Air
                    </th>
                    <th className="px-3 py-3 text-right hidden md:table-cell">
                      Biaya Tetap
                    </th>
                    <th
                      className="px-3 py-3 text-right cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('totalCost')}
                    >
                      <span className="flex items-center justify-end">
                        Total
                        <SortIcon
                          field="totalCost"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </span>
                    </th>
                    <th
                      className="px-3 py-3 text-right hidden lg:table-cell cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('avgDailyUsage')}
                    >
                      <span className="flex items-center justify-end">
                        Avg/Hari
                        <SortIcon
                          field="avgDailyUsage"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </span>
                    </th>
                    {onDelete && <th className="px-3 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr key={record.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-3 font-medium">
                        {record.monthDisplay}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {record.volumeM3.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right hidden md:table-cell">
                        {formatRupiah(record.waterCost)}
                      </td>
                      <td className="px-3 py-3 text-right hidden md:table-cell">
                        {formatRupiah(record.fixedCost)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatRupiah(record.totalCost)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground hidden lg:table-cell">
                        {record.avgDailyUsage.toFixed(3)} m³
                      </td>
                      {onDelete && (
                        <td className="px-3 py-3">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(record.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 font-medium">
                  <tr className="border-t-2">
                    <td className="px-3 py-3">Total</td>
                    <td className="px-3 py-3 text-right">
                      {totals.volumeM3.toFixed(2)} m³
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      {formatRupiah(totals.waterCost)}
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      {formatRupiah(totals.fixedCost)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatRupiah(totals.totalCost)}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell"></td>
                    {onDelete && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
