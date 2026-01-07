import type { DailyForecast } from '@/types/forecast';

// Format volume for display (e.g., 1234.56 -> "1,234.6 L" or "1.23 m³")
export function formatVolume(
  liters: number,
  unit: 'liters' | 'm3' = 'liters'
): string {
  if (unit === 'm3') {
    return `${(liters / 1000).toFixed(2)} m³`;
  }
  return `${liters.toLocaleString('id-ID', { maximumFractionDigits: 1 })} L`;
}

// Calculate confidence percentage from lower/upper bounds
export function calculateConfidence(
  value: number,
  lower: number,
  upper: number
): number {
  const range = upper - lower;
  const deviation = Math.abs(value - (lower + upper) / 2);
  return Math.max(0, Math.min(100, 100 - (deviation / range) * 100));
}

// Get forecast for next N days
export function getNextNDays(
  daily: DailyForecast[],
  days: number
): DailyForecast[] {
  const today = new Date().toISOString().split('T')[0];
  return daily.filter((d) => d.date >= today).slice(0, days);
}

// Calculate total volume for a period
export function calculateTotalVolume(
  forecasts: { volumeInLiters: number }[]
): number {
  return forecasts.reduce((sum, f) => sum + f.volumeInLiters, 0);
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

// Format week range for display
export function formatWeekRange(weekString: string): string {
  const [start, end] = weekString.split('/');
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getDate()} - ${endDate.getDate()} ${endDate.toLocaleDateString(
    'id-ID',
    { month: 'short' }
  )}`;
}
