import type { PriceTier, PricingSettings } from '@/types/pricing';

/**
 * Calculate water cost based on tiered pricing
 * @param volumeInLiters - Water consumption in liters
 * @param priceTiers - Array of price tiers
 * @returns Total cost in Rupiah
 */
export function calculateWaterCost(
  volumeInLiters: number,
  priceTiers: PriceTier[]
): number {
  // Convert liters to m³
  const volumeInM3 = volumeInLiters / 1000;

  let remainingVolume = volumeInM3;
  let totalCost = 0;

  // Sort tiers by minVolume to ensure correct calculation
  const sortedTiers = [...priceTiers].sort((a, b) => a.minVolume - b.minVolume);

  for (const tier of sortedTiers) {
    if (remainingVolume <= 0) break;

    const tierMin = tier.minVolume;
    const tierMax = tier.maxVolume ?? Infinity;
    const tierRange = tierMax - tierMin;

    // Calculate volume in this tier
    let volumeInTier: number;

    if (volumeInM3 <= tierMin) {
      // Haven't reached this tier yet
      continue;
    } else if (volumeInM3 > tierMax) {
      // Use full tier range
      volumeInTier = tierRange;
    } else {
      // Partial tier usage
      volumeInTier = volumeInM3 - tierMin;
    }

    totalCost += volumeInTier * tier.pricePerM3;
    remainingVolume -= volumeInTier;
  }

  return Math.round(totalCost);
}

/**
 * Calculate total bill including operational cost
 * @param volumeInLiters - Water consumption in liters
 * @param settings - Pricing settings
 * @returns Object with water cost, operational cost, and total
 */
export function calculateTotalBill(
  volumeInLiters: number,
  settings: PricingSettings
): {
  waterCost: number;
  operationalCost: number;
  total: number;
  volumeInM3: number;
} {
  const waterCost = calculateWaterCost(volumeInLiters, settings.priceTiers);
  const operationalCost = settings.operationalCost;
  const total = waterCost + operationalCost;
  const volumeInM3 = volumeInLiters / 1000;

  return {
    waterCost,
    operationalCost,
    total,
    volumeInM3,
  };
}

/**
 * Format currency to Indonesian Rupiah
 * @param amount - Amount in Rupiah
 * @returns Formatted string
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
 * Get billing period dates based on payment due day
 * @param paymentDueDay - Day of month for payment due
 * @returns Object with start and end dates of current billing period
 */
export function getBillingPeriod(paymentDueDay: number): {
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
} {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= paymentDueDay) {
    // Current billing period started this month
    startDate = new Date(currentYear, currentMonth, paymentDueDay);
    endDate = new Date(currentYear, currentMonth + 1, paymentDueDay - 1);
  } else {
    // Current billing period started last month
    startDate = new Date(currentYear, currentMonth - 1, paymentDueDay);
    endDate = new Date(currentYear, currentMonth, paymentDueDay - 1);
  }

  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    startDate,
    endDate,
    daysRemaining: Math.max(0, daysRemaining),
  };
}
