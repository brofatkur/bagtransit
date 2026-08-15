/**
 * Pricing Engine — Official DPS Airport & 85 Bali Destinations
 * Bali Luggage Pickup & Delivery (PT Bonanza Tujuh Samudera / ASA Group)
 * 
 * Formula:
 * - Airport to Destination / Destination to Airport:
 *   Base Catalog Price (covers 1-2 bags) + (max(0, bagCount - includedBags) * extraBagFee)
 */

import { BALI_DESTINATIONS } from '../data/destinations.js';

export const DEFAULT_RATES = {
  includedBags: 2,     // 2 bags included in flat bundle
  extraBagFee: 30000,  // Rp 30,000 per extra bag (> 2 bags)
};

/**
 * Calculate fare breakdown using official destination catalog or custom distance
 * 
 * @param {Object} params
 * @param {Object|number|string} params.destination - Destination object from BALI_DESTINATIONS, destination number, or distanceKm
 * @param {number} [params.bagCount=2] - Total luggage items (min 1)
 * @param {number} [params.extraBagFee=30000] - Extra bag fee per item
 * @param {string} [params.routeType='airport_to_hotel'] - Route type
 * @returns {Object} Complete calculation breakdown in IDR
 */
export function calculateFare({
  destination = null,
  distanceKm = null,
  bagCount = 2,
  extraBagFee = 30000,
  includedBags = 2,
  routeType = 'airport_to_hotel',
  customBasePrice = null,
}) {
  const validBagCount = Math.max(1, parseInt(bagCount) || 1);
  const extraBags = Math.max(0, validBagCount - includedBags);
  const extraBagTotal = extraBags * extraBagFee;

  let matchedDest = null;
  if (typeof destination === 'object' && destination?.priceIdr) {
    matchedDest = destination;
  } else if (typeof destination === 'number') {
    matchedDest = BALI_DESTINATIONS.find(d => d.no === destination);
  } else if (typeof destination === 'string') {
    matchedDest = BALI_DESTINATIONS.find(d => d.name.toLowerCase() === destination.toLowerCase())
      || BALI_DESTINATIONS.find(d => d.name.toLowerCase().includes(destination.toLowerCase()));
  }

  let baseTripPrice = 0;
  let km = 0;
  let destinationName = '';

  if (matchedDest) {
    baseTripPrice = matchedDest.priceIdr;
    km = matchedDest.km;
    destinationName = matchedDest.name;
  } else if (customBasePrice != null && Number(customBasePrice) > 0) {
    baseTripPrice = Number(customBasePrice);
    km = parseFloat(distanceKm) || 10;
    destinationName = 'Custom Destination';
  } else if (distanceKm != null) {
    km = Math.max(1, parseFloat(distanceKm) || 10);
    // Linear fallback
    baseTripPrice = Math.max(100000, Math.round(100000 + (km * 10000)));
    destinationName = `Distance ${km} km`;
  } else {
    // Default to Kuta / Airport area
    const defaultDest = BALI_DESTINATIONS.find(d => d.no === 43) || BALI_DESTINATIONS[0];
    baseTripPrice = defaultDest.priceIdr;
    km = defaultDest.km;
    destinationName = defaultDest.name;
  }

  const totalIdr = baseTripPrice + extraBagTotal;

  return {
    destinationName,
    km,
    baseTripPrice,
    includedBags,
    bagCount: validBagCount,
    extraBags,
    extraBagFee,
    extraBagTotal,
    totalIdr,
    routeType,
  };
}

/**
 * Format number to IDR currency string
 * @param {number} amount
 * @returns {string} e.g. "Rp 120.000"
 */
export function formatIdr(amount) {
  if (amount == null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}
