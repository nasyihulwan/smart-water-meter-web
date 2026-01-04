export interface PriceTier {
  minVolume: number; // in m³
  maxVolume: number | null; // null means unlimited
  pricePerM3: number; // in Rupiah
}

export interface PricingSettings {
  priceTiers: PriceTier[];
  operationalCost: number; // monthly fixed cost in Rupiah
  paymentDueDay: number; // day of month (1-28)
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  priceTiers: [
    { minVolume: 0, maxVolume: 10, pricePerM3: 3000 },
    { minVolume: 10, maxVolume: 20, pricePerM3: 4500 },
    { minVolume: 20, maxVolume: null, pricePerM3: 6000 },
  ],
  operationalCost: 5000,
  paymentDueDay: 20,
};

export type ConsumptionPeriod = 'today' | 'this_week' | 'this_month';
