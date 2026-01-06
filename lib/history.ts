import type {
  HistoryRecord,
  HistoryPricingSettings,
  HistoryPricingTier,
} from '@/types/history';

/**
 * Parse Indonesian month name to month index (0-11)
 */
export function parseIndonesianMonth(monthStr: string): number {
  const normalized = monthStr.toLowerCase().trim();

  // Direct mapping
  const monthMap: Record<string, number> = {
    januari: 0,
    jan: 0,
    februari: 1,
    feb: 1,
    maret: 2,
    mar: 2,
    april: 3,
    apr: 3,
    mei: 4,
    may: 4,
    juni: 5,
    jun: 5,
    juli: 6,
    jul: 6,
    agustus: 7,
    agu: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    oktober: 9,
    okt: 9,
    oct: 9,
    november: 10,
    nov: 10,
    desember: 11,
    des: 11,
    dec: 11,
  };

  return monthMap[normalized] ?? -1;
}

/**
 * Parse month string in various formats
 * Supports: "Januari 2024", "Jan 2024", "01/2024", "2024-01", etc.
 */
export function parseMonthString(
  monthStr: string
): { month: number; year: number } | null {
  const str = monthStr.trim();

  // Try YYYY-MM format
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1]),
      month: parseInt(isoMatch[2]) - 1,
    };
  }

  // Try MM/YYYY or MM-YYYY format
  const numericMatch = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (numericMatch) {
    return {
      month: parseInt(numericMatch[1]) - 1,
      year: parseInt(numericMatch[2]),
    };
  }

  // Try "Month Year" format (Indonesian or English)
  const textMatch = str.match(/^([a-zA-Z]+)\s*(\d{4})$/);
  if (textMatch) {
    const monthIndex = parseIndonesianMonth(textMatch[1]);
    if (monthIndex >= 0) {
      return {
        month: monthIndex,
        year: parseInt(textMatch[2]),
      };
    }
  }

  // Try "Year Month" format
  const reverseMatch = str.match(/^(\d{4})\s+([a-zA-Z]+)$/);
  if (reverseMatch) {
    const monthIndex = parseIndonesianMonth(reverseMatch[2]);
    if (monthIndex >= 0) {
      return {
        month: monthIndex,
        year: parseInt(reverseMatch[1]),
      };
    }
  }

  return null;
}

/**
 * Get days in a specific month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format month for display in Indonesian
 */
export function formatMonthDisplay(year: number, month: number): string {
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${monthNames[month]} ${year}`;
}

/**
 * Format month for sorting/storage (YYYY-MM)
 */
export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Parse number from string (handles Indonesian format with comma as decimal)
 */
export function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;

  // Remove thousand separators (.) and replace decimal comma with dot
  const cleaned = value
    .toString()
    .trim()
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse CSV content to records
 */
export function parseCSV(
  content: string,
  pricingSettings: HistoryPricingSettings
): HistoryRecord[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('File CSV harus memiliki header dan minimal 1 baris data');
  }

  // Parse header to find column indices
  const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());

  const colIndex = {
    bulan: header.findIndex(
      (h) => h.includes('bulan') || h.includes('month') || h.includes('periode')
    ),
    m3: header.findIndex(
      (h) => h === 'm3' || h.includes('volume') || h.includes('kubik')
    ),
    biayaAir: header.findIndex(
      (h) =>
        h.includes('biaya air') ||
        h.includes('water cost') ||
        (h.includes('biaya') && !h.includes('tetap'))
    ),
    biayaTetap: header.findIndex(
      (h) =>
        h.includes('tetap') || h.includes('fixed') || h.includes('abonemen')
    ),
    total: header.findIndex((h) => h.includes('total') || h.includes('jumlah')),
    hari: header.findIndex((h) => h.includes('hari') || h.includes('days')),
  };

  // Validate required columns
  if (colIndex.bulan === -1) {
    throw new Error('Kolom "Bulan" tidak ditemukan dalam file');
  }
  if (colIndex.m3 === -1) {
    throw new Error('Kolom "M3" atau "Volume" tidak ditemukan dalam file');
  }

  const records: HistoryRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());

    if (cols.length < 2 || !cols[colIndex.bulan]) continue;

    const monthParsed = parseMonthString(cols[colIndex.bulan]);
    if (!monthParsed) {
      console.warn(
        `Skipping row ${i + 1}: Invalid month format "${cols[colIndex.bulan]}"`
      );
      continue;
    }

    const { year, month } = monthParsed;
    const volumeM3 = parseNumber(cols[colIndex.m3]);
    const daysInMonth =
      colIndex.hari >= 0 && cols[colIndex.hari]
        ? parseNumber(cols[colIndex.hari])
        : getDaysInMonth(year, month);

    // Use provided costs or calculate from pricing settings
    const waterCost =
      colIndex.biayaAir >= 0 && cols[colIndex.biayaAir]
        ? parseNumber(cols[colIndex.biayaAir])
        : calculateWaterCost(volumeM3, pricingSettings.tiers);

    const fixedCost =
      colIndex.biayaTetap >= 0 && cols[colIndex.biayaTetap]
        ? parseNumber(cols[colIndex.biayaTetap])
        : pricingSettings.fixedCost;

    const totalCost =
      colIndex.total >= 0 && cols[colIndex.total]
        ? parseNumber(cols[colIndex.total])
        : waterCost + fixedCost;

    records.push({
      id: `${year}-${month}-${i}`,
      month: formatMonthKey(year, month),
      monthDisplay: formatMonthDisplay(year, month),
      volumeM3,
      waterCost,
      fixedCost,
      totalCost,
      daysInMonth,
      avgDailyUsage: volumeM3 / daysInMonth,
    });
  }

  // Sort by month (oldest first)
  records.sort((a, b) => a.month.localeCompare(b.month));

  return records;
}

/**
 * Calculate water cost based on tiered pricing
 * Tiers use inclusive ranges: 0-10, 11-20, 21-...
 * For 49 m³ with tiers (0-10, 11-20, 21-∞):
 *   Tier 1: 10 m³, Tier 2: 10 m³, Tier 3: 29 m³
 */
export function calculateWaterCost(
  volumeM3: number,
  tiers: HistoryPricingTier[]
): number {
  let totalCost = 0;
  const sortedTiers = [...tiers].sort((a, b) => a.minVolume - b.minVolume);

  for (const tier of sortedTiers) {
    const tierMin = tier.minVolume;
    const tierMax = tier.maxVolume ?? Infinity;

    // Skip if volume hasn't reached this tier
    if (volumeM3 < tierMin) continue;

    // For inclusive ranges (0-10, 11-20, 21-∞):
    // Tier starting at 0: effectiveMin = 0
    // Other tiers: effectiveMin = tierMin - 1 (previous tier's maxVolume)
    const effectiveMin = tierMin === 0 ? 0 : tierMin - 1;
    const volumeInTier = Math.min(volumeM3, tierMax) - effectiveMin;

    if (volumeInTier > 0) {
      totalCost += volumeInTier * tier.pricePerM3;
    }
  }

  return Math.round(totalCost);
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Filter records by period
 */
export function filterRecordsByPeriod(
  records: HistoryRecord[],
  period: '6months' | '12months' | '24months' | 'all' | 'custom',
  customRange?: { startMonth: string; endMonth: string }
): HistoryRecord[] {
  if (period === 'all') return records;

  if (period === 'custom' && customRange) {
    return records.filter(
      (r) =>
        r.month >= customRange.startMonth && r.month <= customRange.endMonth
    );
  }

  const months = period === '6months' ? 6 : period === '12months' ? 12 : 24;

  // Get the latest record's date
  if (records.length === 0) return [];

  const sortedRecords = [...records].sort((a, b) =>
    b.month.localeCompare(a.month)
  );
  const latestMonth = sortedRecords[0].month;
  const [latestYear, latestMonthNum] = latestMonth.split('-').map(Number);

  // Calculate cutoff date
  const cutoffDate = new Date(latestYear, latestMonthNum - 1 - months, 1);
  const cutoffKey = formatMonthKey(
    cutoffDate.getFullYear(),
    cutoffDate.getMonth()
  );

  return records.filter((r) => r.month > cutoffKey);
}

/**
 * Get available months from records for filter dropdown
 */
export function getAvailableMonths(
  records: HistoryRecord[]
): { key: string; display: string }[] {
  const months = [...new Set(records.map((r) => r.month))].sort();
  return months.map((month) => {
    const [year, monthNum] = month.split('-').map(Number);
    return {
      key: month,
      display: formatMonthDisplay(year, monthNum - 1),
    };
  });
}

/**
 * Save history data to localStorage
 */
export function saveHistoryData(data: {
  records: HistoryRecord[];
  pricingSettings: HistoryPricingSettings;
}) {
  const historyData = {
    ...data,
    uploadedAt: new Date().toISOString(),
  };
  localStorage.setItem('water_history_data', JSON.stringify(historyData));
}

/**
 * Load history data from localStorage
 */
export function loadHistoryData(): {
  records: HistoryRecord[];
  pricingSettings: HistoryPricingSettings;
} | null {
  const stored = localStorage.getItem('water_history_data');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear history data from localStorage
 */
export function clearHistoryData() {
  localStorage.removeItem('water_history_data');
}
