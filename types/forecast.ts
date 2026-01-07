// Daily forecast data point
export interface DailyForecast {
  date: string; // "2026-01-07"
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

// Weekly forecast data point
export interface WeeklyForecast {
  week: string; // "2026-01-05/2026-01-11"
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

// Monthly forecast data point
export interface MonthlyForecast {
  month: string; // "2026-01"
  volumeInLiters: number;
  volumeInLiters_lower: number;
  volumeInLiters_upper: number;
}

// Metadata
export interface ForecastMetadata {
  model: string;
  trained_on: string;
  prediction_date: string;
  unit: string;
  note?: string;
}

// Full API response
export interface ForecastData {
  daily: DailyForecast[];
  weekly: WeeklyForecast[];
  monthly: MonthlyForecast[];
  metadata: ForecastMetadata;
}

export type ForecastPeriod = 'daily' | 'weekly' | 'monthly';
