import type { BillingInterval, SchoolPlanOption } from '../services/api';

export const formatMoney = (cents: number, currency = 'USD') =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency });

/** "Up to 150 students", or "No student limit". */
export const limitLabel = (studentLimit: number | null) =>
  studentLimit === null ? 'No student limit' : `Up to ${studentLimit.toLocaleString('en-US')} students`;

/** "$49.00 / month", or "Custom" when the price is agreed with each school. */
export function planPriceLabel(plan: Pick<SchoolPlanOption, 'monthlyPriceCents' | 'annualPriceCents' | 'customPricing' | 'currency'>, interval: BillingInterval) {
  const cents = interval === 'YEAR' ? plan.annualPriceCents : plan.monthlyPriceCents;
  return plan.customPricing || cents === null ? 'Custom' : `${formatMoney(cents, plan.currency)} / ${interval === 'YEAR' ? 'year' : 'month'}`;
}

/** What a subscription costs: "$990.00 / year", or "Price not set". */
export const priceLabel = (priceCents: number | null, interval: BillingInterval | null, currency = 'USD') =>
  priceCents === null ? 'Price not set' : `${formatMoney(priceCents, currency)} / ${interval === 'YEAR' ? 'year' : 'month'}`;
