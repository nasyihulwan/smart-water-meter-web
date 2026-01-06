export interface HistoryPricingTier {
  minVolume: number; // in m³
  maxVolume: number | null; // null means unlimited
  pricePerM3: number; // in Rupiah
}

export interface HistoryPricingSettings {
  tiers: HistoryPricingTier[];
  fixedCost: number; // biaya tetap bulanan
}

export interface HistoryRecord {
  id: string;
  month: string; // Format: "2024-01" (YYYY-MM)
  monthDisplay: string; // Format: "Januari 2024"
  volumeM3: number;
  waterCost: number;
  fixedCost: number;
  totalCost: number;
  daysInMonth: number;
  avgDailyUsage: number; // m³ per day
}

export interface HistoryData {
  records: HistoryRecord[];
  pricingSettings: HistoryPricingSettings;
  uploadedAt: string;
}

// Indonesian month names mapping
export const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

export const MONTH_NAMES_ID: string[] = [
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

export type ChartPeriod =
  | '6months'
  | '12months'
  | '24months'
  | 'all'
  | 'custom';

export type FilterMode = 'preset' | 'month-range';
