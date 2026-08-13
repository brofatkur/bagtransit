/**
 * Automated Verification Test Suite for BagTransit Platform MVP
 * Validates PRD Requirements FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 & Acceptance Criteria
 */

import { calculateFare, DEFAULT_RATES, formatIdr } from '../src/services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, formatCurrency } from '../src/services/xenith.js';
import { db } from '../src/services/db.js';
import { WA_TEMPLATES } from '../src/services/whatsapp.js';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

console.log('\n--- 1. TESTING PRICING ENGINE (FR-1) ---');
// Test Default Formula: baseFare 100k, perKm 15k, extraBag 30k, includedBags 2
// Distance: 11 km (Seminyak), BagCount: 3
// Base: 100,000 | Distance: 11 * 15,000 = 165,000 | ExtraBag: (3 - 2) * 30,000 = 30,000 | Total: 295,000
const calc1 = calculateFare({ distanceKm: 11, bagCount: 3 });
assert(calc1.totalIdr === 295000, `Seminyak 11km with 3 bags equals IDR 295,000 (Calculated: ${calc1.totalIdr})`);
assert(calc1.extraBags === 1, `Extra bags count is 1 for 3 bags`);
assert(calc1.includedBags === 2, `Included bags is 2`);

// Test 2 Bags (Within flat bundle - no extra fee)
const calc2 = calculateFare({ distanceKm: 5, bagCount: 2 });
assert(calc2.totalIdr === 175000, `Kuta 5km with 2 bags equals IDR 175,000 (Calculated: ${calc2.totalIdr})`);
assert(calc2.extraBagFareTotal === 0, `No extra bag fee charged for 2 bags`);

// Test Custom Branch Rates Override (FR-1.3)
const customRates = { base_fare: 80000, per_km_rate: 12000, extra_bag_fee: 25000, included_bags: 2 };
const calc3 = calculateFare({ distanceKm: 10, bagCount: 4, customRates });
// 80,000 + (10 * 12,000 = 120,000) + (2 * 25,000 = 50,000) = 250,000
assert(calc3.totalIdr === 250000, `Custom branch rates correctly override defaults (Calculated: ${calc3.totalIdr})`);

console.log('\n--- 2. TESTING XENITH PAY COUNTRY & FX CONVERSION (FR-3) ---');
const priorityCountries = ['CN', 'MY', 'PH', 'VN', 'IN', 'TH'];
priorityCountries.forEach(code => {
  const meta = COUNTRY_PAYMENT_MAP[code];
  assert(meta != null, `Country ${code} exists in COUNTRY_PAYMENT_MAP`);
  assert(meta.channel != null, `Country ${code} mapped to channel: ${meta.channel}`);
  const converted = convertIdrToCurrency(295000, meta.currency);
  assert(converted > 0, `Converted 295,000 IDR to ${meta.currency}: ${converted}`);
});

console.log('\n--- 3. TESTING DATABASE RLS QUERIES & ISOLATION (FR-5, AC 2) ---');
db.resetToDefaults();
const kutaBranchId = '11111111-1111-1111-1111-111111111111';
const sanurBranchId = '22222222-2222-2222-2222-222222222222';

const kutaAdminBookings = db.getBookings({ role: 'admin', cabangId: kutaBranchId });
const sanurAdminBookings = db.getBookings({ role: 'admin', cabangId: sanurBranchId });
const superAdminBookings = db.getBookings({ role: 'super_admin' });

assert(kutaAdminBookings.every(b => b.cabang_id === kutaBranchId), `Admin Kuta ONLY sees Kuta bookings (RLS isolation)`);
assert(sanurAdminBookings.every(b => b.cabang_id === sanurBranchId), `Admin Sanur ONLY sees Sanur bookings (RLS isolation)`);
assert(superAdminBookings.length >= kutaAdminBookings.length + sanurAdminBookings.length, `Super Admin sees cross-branch bookings`);

console.log('\n--- 4. TESTING PRICING ZONE UPDATE WITHOUT CODE DEPLOY (FR-5.2, AC 3) ---');
const kutaZones = db.getPricingZones(kutaBranchId);
const firstZone = kutaZones[0];
const originalBase = firstZone.base_fare;

// Super Admin edits base fare
db.updatePricingZone(firstZone.id, { base_fare: 120000 });
const updatedZone = db.getPricingZoneById(firstZone.id);
assert(updatedZone.base_fare === 120000, `Pricing zone base_fare updated to Rp 120,000`);

// Verify next booking uses new rate
const newBookingCalc = calculateFare({ distanceKm: updatedZone.estimated_km, bagCount: 2, customRates: updatedZone });
assert(newBookingCalc.baseFare === 120000, `Next booking instantly uses updated base fare`);

console.log('\n--- 5. TESTING WHATSAPP NOTIFICATION TEMPLATES (FR-6) ---');
const testBooking = {
  booking_code: 'BT-20260812-9999',
  customer_name: 'David Lee',
  customer_phone: '+6591234567',
  route_type: 'airport_to_hotel',
  pickup_location: 'Ngurah Rai Airport',
  dropoff_location: 'Ayana Resort Jimbaran',
  bag_count: 2,
  foreign_currency: 'MYR',
  foreign_amount: 85.00,
  payment_channel: 'DuitNow QR',
};

const waConfirmed = WA_TEMPLATES.confirmed(testBooking);
assert(waConfirmed.includes('BT-20260812-9999'), `WhatsApp confirmation includes booking code`);
assert(waConfirmed.includes('David Lee'), `WhatsApp confirmation includes customer name`);

const waDelivered = WA_TEMPLATES.delivered(testBooking, 'https://example.com/proof.jpg');
assert(waDelivered.includes('Delivered Safely'), `WhatsApp delivery message formatted`);
assert(waDelivered.includes('https://example.com/proof.jpg'), `WhatsApp delivery includes proof photo`);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
