/**
 * Database & Storage Service with RLS-Aware Queries (FR-1, FR-2, FR-5)
 * BagTransit (Your Bags Move. You Explore.)
 * 
 * Supports local reactive state, localStorage persistence, and Insforge/Postgres API sync.
 */

import { reactive } from 'vue';
import { calculateFare } from './pricing.js';
import { sendWhatsAppNotification } from './whatsapp.js';

const STORAGE_KEY = 'bagtransit_db_v1';

// Initial Seed Data
const INITIAL_BRANCHES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'DPS-AIRPORT',
    name: 'Kuta Airport Hub (Ngurah Rai)',
    hub_type: 'airport',
    address: 'Jl. Dewi Sartika No.2A, Tuban, Kuta (100m from Airport Exit Gate)',
    phone: '+628179344777',
    is_active: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SANUR-PORT',
    name: 'Sanur Harbour Hub (Pelabuhan Sanur)',
    hub_type: 'harbour',
    address: 'Jl. Hang Tuah No.45, Sanur Kaja (Near Fastboat Harbour to Nusa Penida/Lembongan)',
    phone: '+628179344888',
    is_active: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    code: 'UBUD-CENTRAL',
    name: 'Ubud Transit Hub',
    hub_type: 'city',
    address: 'Jl. Monkey Forest No.18, Ubud, Gianyar',
    phone: '+628179344999',
    is_active: true,
  },
];

const INITIAL_PRICING_ZONES = [
  // Kuta Airport Hub Zones
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Kuta / Tuban / Legian',
    zone_code: 'KUTA',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 5,
    is_active: true,
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Seminyak / Kerobokan / Petitenget',
    zone_code: 'SEMINYAK',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 11,
    is_active: true,
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Canggu / Pererenan / Berawa',
    zone_code: 'CANGGU',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 18,
    is_active: true,
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Jimbaran / Kedonganan',
    zone_code: 'JIMBARAN',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 7,
    is_active: true,
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Nusa Dua / Tanjung Benoa',
    zone_code: 'NUSA_DUA',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 14,
    is_active: true,
  },
  {
    id: 'a6666666-6666-6666-6666-666666666666',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Sanur / Denpasar Selatan',
    zone_code: 'SANUR',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 15,
    is_active: true,
  },
  {
    id: 'a7777777-7777-7777-7777-777777777777',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Uluwatu / Pecatu / Ungasan',
    zone_code: 'ULUWATU',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 20,
    is_active: true,
  },
  {
    id: 'a8888888-8888-8888-8888-888888888888',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    zone_name: 'Ubud Central / Sayan / Tegallalang',
    zone_code: 'UBUD',
    base_fare: 100000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 36,
    is_active: true,
  },
  // Sanur Harbour Hub Zones
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    zone_name: 'Sanur Beach / Harbour Area',
    zone_code: 'SANUR_LOCAL',
    base_fare: 80000,
    per_km_rate: 15000,
    extra_bag_fee: 25000,
    included_bags: 2,
    estimated_km: 3,
    is_active: true,
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    zone_name: 'Denpasar City / Renon',
    zone_code: 'DENPASAR',
    base_fare: 80000,
    per_km_rate: 15000,
    extra_bag_fee: 25000,
    included_bags: 2,
    estimated_km: 8,
    is_active: true,
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    zone_name: 'Ubud / Sukawati',
    zone_code: 'UBUD_SANUR',
    base_fare: 90000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 22,
    is_active: true,
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    zone_name: 'Kuta / Airport Transfer',
    zone_code: 'KUTA_SANUR',
    base_fare: 90000,
    per_km_rate: 15000,
    extra_bag_fee: 30000,
    included_bags: 2,
    estimated_km: 15,
    is_active: true,
  },
];

const INITIAL_COURIERS = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    name: 'Wayan Gede',
    phone: '+628123456701',
    vehicle_type: 'Daihatsu GranMax Van',
    vehicle_plate: 'DK 8291 AB',
    status: 'available',
    rating: 4.98,
    active_orders: 1,
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    name: 'Ketut Suardika',
    phone: '+628123456702',
    vehicle_type: 'Toyota Avanza MPV',
    vehicle_plate: 'DK 7312 CD',
    status: 'available',
    rating: 4.95,
    active_orders: 0,
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    name: 'Gede Sumarta',
    phone: '+628123456703',
    vehicle_type: 'Suzuki APV Van',
    vehicle_plate: 'DK 6420 EF',
    status: 'available',
    rating: 4.92,
    active_orders: 1,
  },
];

const INITIAL_USERS = [
  {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'asa@asagroup.id',
    phone: '+628113900100',
    full_name: 'Asa (Direktur PT Bonanza Tujuh Samudera / BTS)',
    role: 'super_admin',
    cabang_id: null,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    email: 'admin.kuta@bagtransit.id',
    phone: '+628179344777',
    full_name: 'Budi Santoso (Admin Cabang Kuta)',
    role: 'admin',
    cabang_id: '11111111-1111-1111-1111-111111111111',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'admin.sanur@bagtransit.id',
    phone: '+628179344888',
    full_name: 'Made Aryana (Admin Cabang Sanur)',
    role: 'admin',
    cabang_id: '22222222-2222-2222-2222-222222222222',
  },
];

const INITIAL_BOOKINGS = [
  {
    id: 'bk-demo-1',
    booking_code: 'BT-20260812-7891',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    pricing_zone_id: 'a2222222-2222-2222-2222-222222222222',
    customer_id: null,
    customer_name: 'Wei Zhang (张伟)',
    customer_phone: '+8613800138000',
    customer_email: 'weizhang@gmail.com',
    customer_country: 'CN',
    route_type: 'airport_to_hotel',
    pickup_location: 'Ngurah Rai International Airport (DPS) - Arrival Gate B3',
    pickup_datetime: new Date(Date.now() - 3600000 * 3).toISOString(),
    dropoff_location: 'W Bali - Seminyak (Jl. Petitenget)',
    dropoff_datetime: new Date(Date.now() + 3600000 * 2).toISOString(),
    flight_number: 'MU 781 (China Eastern)',
    hotel_name: 'W Bali - Seminyak',
    hotel_room: 'Villa #214',
    hotel_booking_name: 'Wei Zhang',
    bag_count: 3,
    extra_bags: 1,
    bag_photos: ['https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=600&auto=format&fit=crop&q=80'],
    price_breakdown: {
      baseFare: 100000,
      perKmRate: 15000,
      distanceKm: 11,
      distanceFare: 165000,
      extraBags: 1,
      includedBags: 2,
      extraBagFee: 30000,
      extraBagFareTotal: 30000,
      totalIdr: 295000,
      bagCount: 3,
    },
    total_amount_idr: 295000,
    foreign_currency: 'CNY',
    foreign_amount: 129.39,
    payment_channel: 'Alipay',
    payment_status: 'paid',
    status: 'in_transit',
    assigned_courier_id: 'c1111111-1111-1111-1111-111111111111',
    notes: 'Fragile luggage with camera gear. Security seals attached.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'bk-demo-2',
    booking_code: 'BT-20260812-4521',
    cabang_id: '11111111-1111-1111-1111-111111111111',
    pricing_zone_id: 'a3333333-3333-3333-3333-333333333333',
    customer_id: null,
    customer_name: 'Nurul Huda binti Azman',
    customer_phone: '+60123456789',
    customer_email: 'nurul.azman@yahoo.com',
    customer_country: 'MY',
    route_type: 'airport_to_hotel',
    pickup_location: 'Ngurah Rai International Airport (DPS) - Pick Up Zone A',
    pickup_datetime: new Date(Date.now() - 3600000 * 1).toISOString(),
    dropoff_location: 'The Lawn Beach Club Villa, Canggu',
    dropoff_datetime: new Date(Date.now() + 3600000 * 4).toISOString(),
    flight_number: 'AK 378 (AirAsia)',
    hotel_name: 'The Lawn Beach Club Villa',
    hotel_room: 'Suite Ocean 3',
    hotel_booking_name: 'Nurul Huda',
    bag_count: 2,
    extra_bags: 0,
    bag_photos: ['https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&auto=format&fit=crop&q=80'],
    price_breakdown: {
      baseFare: 100000,
      perKmRate: 15000,
      distanceKm: 18,
      distanceFare: 270000,
      extraBags: 0,
      includedBags: 2,
      extraBagFee: 30000,
      extraBagFareTotal: 0,
      totalIdr: 370000,
      bagCount: 2,
    },
    total_amount_idr: 370000,
    foreign_currency: 'MYR',
    foreign_amount: 103.35,
    payment_channel: 'DuitNow QR',
    payment_status: 'paid',
    status: 'picked_up',
    assigned_courier_id: 'c1111111-1111-1111-1111-111111111111',
    notes: '2 Large Samsonite Suitcases.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'bk-demo-3',
    booking_code: 'BT-20260812-9904',
    cabang_id: '22222222-2222-2222-2222-222222222222',
    pricing_zone_id: 'b1111111-1111-1111-1111-111111111111',
    customer_id: null,
    customer_name: 'John Paul Santos',
    customer_phone: '+639171234567',
    customer_email: 'jpsantos@gmail.com',
    customer_country: 'PH',
    route_type: 'hotel_to_airport',
    pickup_location: 'Maya Sanur Resort & Spa',
    pickup_datetime: new Date(Date.now() - 3600000 * 5).toISOString(),
    dropoff_location: 'Ngurah Rai International Airport (DPS) - Departure Terminal Gate 2',
    dropoff_datetime: new Date(Date.now() - 3600000 * 1).toISOString(),
    flight_number: 'PR 538 (Philippine Airlines)',
    hotel_name: 'Maya Sanur Resort',
    hotel_room: 'Room 302',
    hotel_booking_name: 'John Paul Santos',
    bag_count: 2,
    extra_bags: 0,
    bag_photos: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80'],
    price_breakdown: {
      baseFare: 80000,
      perKmRate: 15000,
      distanceKm: 15,
      distanceFare: 225000,
      extraBags: 0,
      includedBags: 2,
      extraBagFee: 25000,
      extraBagFareTotal: 0,
      totalIdr: 305000,
      bagCount: 2,
    },
    total_amount_idr: 305000,
    foreign_currency: 'PHP',
    foreign_amount: 1070.0,
    payment_channel: 'GCash',
    payment_status: 'paid',
    status: 'delivered',
    assigned_courier_id: 'c3333333-3333-3333-3333-333333333333',
    notes: 'Left with airport concierge BagTransit counter.',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

const INITIAL_STATUS_LOGS = [
  {
    id: 'log-1',
    booking_id: 'bk-demo-1',
    old_status: 'pending_payment',
    new_status: 'confirmed',
    actor_id: 'system',
    actor_role: 'system',
    notes: 'Payment confirmed via Xenith Pay (Alipay CNY 129.39)',
    proof_photo_url: null,
    whatsapp_sent: true,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'log-2',
    booking_id: 'bk-demo-1',
    old_status: 'confirmed',
    new_status: 'assigned',
    actor_id: '88888888-8888-8888-8888-888888888888',
    actor_role: 'admin',
    notes: 'Assigned to courier Wayan Gede (GranMax DK 8291 AB)',
    proof_photo_url: null,
    whatsapp_sent: true,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'log-3',
    booking_id: 'bk-demo-1',
    old_status: 'assigned',
    new_status: 'picked_up',
    actor_id: 'c1111111-1111-1111-1111-111111111111',
    actor_role: 'courier',
    notes: 'Bags collected from airport arrival hall. 3 security seals attached: #BT-091, #BT-092, #BT-093.',
    proof_photo_url: 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=600&auto=format&fit=crop&q=80',
    whatsapp_sent: true,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'log-4',
    booking_id: 'bk-demo-1',
    old_status: 'picked_up',
    new_status: 'in_transit',
    actor_id: 'c1111111-1111-1111-1111-111111111111',
    actor_role: 'courier',
    notes: 'En route to Seminyak via Sunset Road.',
    proof_photo_url: null,
    whatsapp_sent: true,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// Helper to load or initialize state
function loadInitialState() {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          branches: parsed.branches || INITIAL_BRANCHES,
          pricing_zones: parsed.pricing_zones || INITIAL_PRICING_ZONES,
          couriers: parsed.couriers || INITIAL_COURIERS,
          users: parsed.users || INITIAL_USERS,
          bookings: parsed.bookings || INITIAL_BOOKINGS,
          status_logs: parsed.status_logs || INITIAL_STATUS_LOGS,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved state, using defaults', e);
    }
  }
  return {
    branches: INITIAL_BRANCHES,
    pricing_zones: INITIAL_PRICING_ZONES,
    couriers: INITIAL_COURIERS,
    users: INITIAL_USERS,
    bookings: INITIAL_BOOKINGS,
    status_logs: INITIAL_STATUS_LOGS,
  };
}

export const dbState = reactive(loadInitialState());

function persist() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
    } catch (e) {
      console.error('Storage quota exceeded or error saving state', e);
    }
  }
}

/**
 * DB Query Interface implementing Row-Level Security logic
 */
export const db = {
  // Reset database to seed
  resetToDefaults() {
    dbState.branches = JSON.parse(JSON.stringify(INITIAL_BRANCHES));
    dbState.pricing_zones = JSON.parse(JSON.stringify(INITIAL_PRICING_ZONES));
    dbState.couriers = JSON.parse(JSON.stringify(INITIAL_COURIERS));
    dbState.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    dbState.bookings = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
    dbState.status_logs = JSON.parse(JSON.stringify(INITIAL_STATUS_LOGS));
    persist();
  },

  // 1. Branches
  getBranches() {
    return dbState.branches.filter(b => b.is_active);
  },

  getBranchById(id) {
    return dbState.branches.find(b => b.id === id);
  },

  // 2. Pricing Zones
  getPricingZones(cabangId = null) {
    if (!cabangId) return dbState.pricing_zones;
    return dbState.pricing_zones.filter(z => z.cabang_id === cabangId && z.is_active);
  },

  getPricingZoneById(id) {
    return dbState.pricing_zones.find(z => z.id === id);
  },

  updatePricingZone(id, updates) {
    const idx = dbState.pricing_zones.findIndex(z => z.id === id);
    if (idx !== -1) {
      dbState.pricing_zones[idx] = {
        ...dbState.pricing_zones[idx],
        ...updates,
        base_fare: Number(updates.base_fare ?? dbState.pricing_zones[idx].base_fare),
        per_km_rate: Number(updates.per_km_rate ?? dbState.pricing_zones[idx].per_km_rate),
        extra_bag_fee: Number(updates.extra_bag_fee ?? dbState.pricing_zones[idx].extra_bag_fee),
        updated_at: new Date().toISOString(),
      };
      persist();
      return dbState.pricing_zones[idx];
    }
    return null;
  },

  // 3. Couriers
  getCouriers(cabangId = null) {
    if (!cabangId) return dbState.couriers;
    return dbState.couriers.filter(c => c.cabang_id === cabangId);
  },

  getCourierById(id) {
    return dbState.couriers.find(c => c.id === id);
  },

  // 4. Bookings (with RLS enforcement)
  getBookings({ role = 'super_admin', cabangId = null, customerId = null } = {}) {
    // Super Admin: sees all branches
    if (role === 'super_admin') {
      return [...dbState.bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    // Branch Admin: strictly filtered to own cabang_id (RLS boundary)
    if (role === 'admin') {
      if (!cabangId) return [];
      return dbState.bookings
        .filter(b => b.cabang_id === cabangId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    // Customer: own bookings only
    if (role === 'customer' && customerId) {
      return dbState.bookings
        .filter(b => b.customer_id === customerId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return [];
  },

  getBookingByCode(code) {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    return dbState.bookings.find(b => b.booking_code.toUpperCase() === cleanCode);
  },

  getBookingById(id) {
    return dbState.bookings.find(b => b.id === id);
  },

  createBooking(bookingData) {
    const bookingId = 'bk-' + Math.random().toString(36).substring(2, 9);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `BT-${dateStr}-${randNum}`;

    const newBooking = {
      id: bookingId,
      booking_code: bookingCode,
      cabang_id: bookingData.cabang_id,
      pricing_zone_id: bookingData.pricing_zone_id || null,
      customer_id: bookingData.customer_id || null,
      customer_name: bookingData.customer_name,
      customer_phone: bookingData.customer_phone,
      customer_email: bookingData.customer_email || '',
      customer_country: bookingData.customer_country,
      route_type: bookingData.route_type,
      pickup_location: bookingData.pickup_location,
      pickup_datetime: bookingData.pickup_datetime || new Date().toISOString(),
      dropoff_location: bookingData.dropoff_location,
      dropoff_datetime: bookingData.dropoff_datetime || null,
      flight_number: bookingData.flight_number || '',
      hotel_name: bookingData.hotel_name || '',
      hotel_room: bookingData.hotel_room || '',
      hotel_booking_name: bookingData.hotel_booking_name || bookingData.customer_name,
      bag_count: Number(bookingData.bag_count) || 1,
      extra_bags: Math.max(0, (Number(bookingData.bag_count) || 1) - 2),
      bag_photos: bookingData.bag_photos || [],
      price_breakdown: bookingData.price_breakdown,
      total_amount_idr: bookingData.total_amount_idr,
      foreign_currency: bookingData.foreign_currency,
      foreign_amount: bookingData.foreign_amount,
      payment_channel: bookingData.payment_channel,
      payment_status: bookingData.payment_status || 'pending_payment',
      status: bookingData.status || 'pending_payment',
      assigned_courier_id: bookingData.assigned_courier_id || null,
      notes: bookingData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dbState.bookings.unshift(newBooking);

    // Add initial status log
    dbState.status_logs.push({
      id: 'log-' + Date.now(),
      booking_id: bookingId,
      old_status: null,
      new_status: newBooking.status,
      actor_id: 'customer',
      actor_role: 'customer',
      notes: 'Booking created',
      proof_photo_url: null,
      whatsapp_sent: false,
      created_at: new Date().toISOString(),
    });

    persist();
    return newBooking;
  },

  async updateBookingStatus(bookingId, newStatus, {
    actorId = 'system',
    actorRole = 'admin',
    proofPhotoUrl = null,
    notes = '',
    courierId = null,
  } = {}) {
    const booking = dbState.bookings.find(b => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const oldStatus = booking.status;
    booking.status = newStatus;
    if (newStatus === 'confirmed' || newStatus === 'paid') {
      booking.payment_status = 'paid';
    }
    if (courierId) {
      booking.assigned_courier_id = courierId;
    }
    booking.updated_at = new Date().toISOString();

    const courier = booking.assigned_courier_id
      ? dbState.couriers.find(c => c.id === booking.assigned_courier_id)
      : null;

    // Trigger WhatsApp notification (FR-6)
    let waSent = false;
    let waMessageId = null;
    try {
      const waRes = await sendWhatsAppNotification({
        booking,
        status: newStatus,
        courier,
        proofUrl: proofPhotoUrl,
      });
      if (waRes) {
        waSent = true;
        waMessageId = waRes.messageId || 'wa_' + Date.now();
      }
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e);
    }

    // Write to status_logs
    const logEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      booking_id: bookingId,
      old_status: oldStatus,
      new_status: newStatus,
      actor_id: actorId,
      actor_role: actorRole,
      notes: notes || `Status transitioned to ${newStatus}`,
      proof_photo_url: proofPhotoUrl || null,
      whatsapp_sent: waSent,
      whatsapp_message_id: waMessageId,
      created_at: new Date().toISOString(),
    };
    dbState.status_logs.push(logEntry);

    persist();
    return { booking, log: logEntry };
  },

  assignCourier(bookingId, courierId, actorId = 'admin') {
    const booking = dbState.bookings.find(b => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    booking.assigned_courier_id = courierId;
    booking.updated_at = new Date().toISOString();

    const courier = dbState.couriers.find(c => c.id === courierId);
    const nextStatus = booking.status === 'pending_payment' || booking.status === 'confirmed'
      ? 'assigned'
      : booking.status;

    return this.updateBookingStatus(bookingId, nextStatus, {
      actorId,
      actorRole: 'admin',
      courierId,
      notes: `Assigned to courier ${courier?.name || courierId} (${courier?.vehicle_plate || ''})`,
    });
  },

  getStatusLogs(bookingId) {
    return dbState.status_logs
      .filter(l => l.booking_id === bookingId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  getStats(role = 'super_admin', cabangId = null) {
    const bookings = this.getBookings({ role, cabangId });
    const today = new Date().toISOString().slice(0, 10);

    const todayBookings = bookings.filter(b => b.created_at.startsWith(today));
    const paidBookings = bookings.filter(b => b.payment_status === 'paid');
    const totalRevenueIdr = paidBookings.reduce((sum, b) => sum + (Number(b.total_amount_idr) || 0), 0);
    const activeDeliveries = bookings.filter(b => ['assigned', 'picked_up', 'in_transit'].includes(b.status)).length;
    const completedDeliveries = bookings.filter(b => b.status === 'delivered').length;

    return {
      totalBookings: bookings.length,
      todayBookingsCount: todayBookings.length,
      totalRevenueIdr,
      activeDeliveries,
      completedDeliveries,
      activeCouriers: dbState.couriers.filter(c => !cabangId || c.cabang_id === cabangId).length,
      branchesCount: dbState.branches.filter(b => b.is_active).length,
    };
  },
};
