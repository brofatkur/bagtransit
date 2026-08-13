/**
 * Pricing Engine — Single Source of Truth (FR-1)
 * BagTransit (Your Bags Move. You Explore.)
 * 
 * Formula:
 * total = baseFare + (distanceKm * perKmRate) + (max(0, bagCount - includedBags) * extraBagFee)
 */

export const DEFAULT_RATES = {
  baseFare: 100000,    // IDR 100,000 (Flat base covers up to 2 bags)
  perKmRate: 15000,    // IDR 15,000 / km
  extraBagFee: 30000,  // IDR 30,000 / extra bag (> 2 bags)
  includedBags: 2,     // 2 bags included in base fare
};

/**
 * Calculate fare breakdown according to FR-1
 * 
 * @param {Object} params
 * @param {number} params.distanceKm - Distance in kilometers
 * @param {number} params.bagCount - Total number of luggage items (min 1)
 * @param {Object} [params.customRates] - Optional custom rates from branch/pricing_zone
 * @returns {Object} Pricing breakdown and total IDR
 */
export function calculateFare({ distanceKm = 0, bagCount = 1, customRates = null }) {
  const rates = {
    baseFare: Number(customRates?.baseFare ?? customRates?.base_fare ?? DEFAULT_RATES.baseFare),
    perKmRate: Number(customRates?.perKmRate ?? customRates?.per_km_rate ?? DEFAULT_RATES.perKmRate),
    extraBagFee: Number(customRates?.extraBagFee ?? customRates?.extra_bag_fee ?? DEFAULT_RATES.extraBagFee),
    includedBags: Number(customRates?.includedBags ?? customRates?.included_bags ?? DEFAULT_RATES.includedBags),
  };

  const validBagCount = Math.max(1, parseInt(bagCount) || 1);
  const validDistanceKm = Math.max(0, parseFloat(distanceKm) || 0);

  const extraBags = Math.max(0, validBagCount - rates.includedBags);
  const distanceFare = Math.round(validDistanceKm * rates.perKmRate);
  const extraBagFareTotal = Math.round(extraBags * rates.extraBagFee);
  const totalIdr = Math.round(rates.baseFare + distanceFare + extraBagFareTotal);

  return {
    baseFare: rates.baseFare,
    perKmRate: rates.perKmRate,
    distanceKm: validDistanceKm,
    distanceFare,
    extraBags,
    includedBags: rates.includedBags,
    extraBagFee: rates.extraBagFee,
    extraBagFareTotal,
    totalIdr,
    bagCount: validBagCount,
  };
}

/**
 * Format number to IDR currency string
 * @param {number} amount
 * @returns {string} e.g. "Rp 190.000"
 */
export function formatIdr(amount) {
  if (amount == null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}
