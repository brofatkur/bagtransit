/**
 * Automated Verification Test Suite for Bali Luggage Pickup & Delivery
 * Validates 85 DPS Destinations, Catalog Pricing, and WhatsApp Order Dispatch
 */

import { BALI_DESTINATIONS, OFFICIAL_HUBS, MAIN_WHATSAPP } from '../src/data/destinations.js';
import { calculateFare, formatIdr } from '../src/services/pricing.js';
import { generateWhatsAppOrderMessage, getWhatsAppOrderUrl, WA_TEMPLATES } from '../src/services/whatsapp.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency } from '../src/services/xenith.js';
import { db } from '../src/services/db.js';

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

console.log('\n--- 1. TESTING 85 OFFICIAL DPS DESTINATIONS ---');
assert(BALI_DESTINATIONS.length === 85, `Total destinations count is exactly 85 (Found: ${BALI_DESTINATIONS.length})`);

// Test Destination #1 (Alas Kedaton)
const dest1 = BALI_DESTINATIONS.find(d => d.no === 1);
assert(dest1.name === "Alas Kedaton Monkey Forest" && dest1.km === 34 && dest1.priceIdr === 340000,
  `#1 Alas Kedaton Monkey Forest: 34 km @ Rp 340.000`);

// Test Destination #7 (Beachwalk)
const dest7 = BALI_DESTINATIONS.find(d => d.no === 7);
assert(dest7.km === 4 && dest7.priceIdr === 120000, `#7 Beachwalk: 4 km @ Rp 120.000`);

// Test Destination #23 (Canggu)
const dest23 = BALI_DESTINATIONS.find(d => d.no === 23);
assert(dest23.km === 20 && dest23.priceIdr === 400000, `#23 Canggu: 20 km @ Rp 400.000`);

// Test Destination #65 (Sanur Harbour)
const dest65 = BALI_DESTINATIONS.find(d => d.no === 65);
assert(dest65.km === 21 && dest65.priceIdr === 231000, `#65 Sanur Harbour: 21 km @ Rp 231.000`);

// Test Destination #66 (Seminyak Beach)
const dest66 = BALI_DESTINATIONS.find(d => d.no === 66);
assert(dest66.km === 10 && dest66.priceIdr === 150000, `#66 Seminyak Beach: 10 km @ Rp 150.000`);

// Test Destination #79 (Ubud)
const dest79 = BALI_DESTINATIONS.find(d => d.no === 79);
assert(dest79.km === 37 && dest79.priceIdr === 370000, `#79 Ubud: 37 km @ Rp 370.000`);

// Test Destination #85 (West Bali National Park)
const dest85 = BALI_DESTINATIONS.find(d => d.no === 85);
assert(dest85.km === 153 && dest85.priceIdr === 1530000, `#85 West Bali National Park: 153 km @ Rp 1.530.000`);

console.log('\n--- 2. TESTING PRICING ENGINE WITH CATALOG & EXTRA BAGS ---');
// 2 Bags to Canggu (Flat bundle included): Rp 400.000
const calcCanggu2Bags = calculateFare({ destination: dest23, bagCount: 2 });
assert(calcCanggu2Bags.totalIdr === 400000, `Canggu 2 bags = Rp 400.000 (Calculated: ${calcCanggu2Bags.totalIdr})`);
assert(calcCanggu2Bags.extraBags === 0, `0 extra bags for 2 bags`);

// 4 Bags to Canggu (2 included + 2 extra @ Rp 30.000 = Rp 460.000)
const calcCanggu4Bags = calculateFare({ destination: dest23, bagCount: 4 });
assert(calcCanggu4Bags.totalIdr === 460000, `Canggu 4 bags = Rp 460.000 (Calculated: ${calcCanggu4Bags.totalIdr})`);
assert(calcCanggu4Bags.extraBags === 2, `2 extra bags for 4 bags`);
assert(calcCanggu4Bags.extraBagTotal === 60000, `Extra bag total = Rp 60.000`);

// 1 Bag to Ubud (Flat bundle covers up to 2): Rp 370.000
const calcUbud1Bag = calculateFare({ destination: dest79, bagCount: 1 });
assert(calcUbud1Bag.totalIdr === 370000, `Ubud 1 bag = Rp 370.000`);

console.log('\n--- 3. TESTING WHATSAPP ORDER GENERATOR ---');
const sampleBooking = {
  booking_code: 'BT-20260815-1234',
  customer_name: 'Alexander Lee',
  customer_phone: '+628123456789',
  customer_country: 'SG',
  route_type: 'airport_to_hotel',
  pickup_location: 'Ngurah Rai Airport (DPS) Arrival Terminal Gate 3',
  pickup_datetime: new Date().toISOString(),
  dropoff_location: 'W Bali - Seminyak (Jl. Petitenget)',
  flight_number: 'SQ 944',
  hotel_name: 'W Bali - Seminyak',
  hotel_room: 'Villa #12',
  bag_count: 3,
  total_amount_idr: 180000,
  foreign_currency: 'SGD',
  foreign_amount: 15,
  payment_channel: 'WhatsApp Order',
};

const waMsg = generateWhatsAppOrderMessage(sampleBooking);
assert(waMsg.includes('BT-20260815-1234'), `WhatsApp order message includes booking code`);
assert(waMsg.includes('Alexander Lee'), `WhatsApp order message includes customer name`);
assert(waMsg.includes('W Bali - Seminyak'), `WhatsApp order message includes dropoff point`);
assert(waMsg.includes('3 Bag(s)'), `WhatsApp order message includes bag count`);
assert(waMsg.includes('Rp 180.000'), `WhatsApp order message includes formatted price`);

const waUrl = getWhatsAppOrderUrl(sampleBooking, MAIN_WHATSAPP);
assert(waUrl.startsWith(`https://wa.me/${MAIN_WHATSAPP}?text=`), `Direct WhatsApp URL points to ${MAIN_WHATSAPP}`);

console.log('\n--- 4. TESTING OFFICIAL HUBS ---');
assert(OFFICIAL_HUBS.length === 3, `3 official hubs (Kuta Airport, Sanur Harbour, Seminyak)`);
assert(OFFICIAL_HUBS[0].phoneClean === "6285172491244", `Main Kuta Airport Hub phone is +62 851-7249-1244`);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
