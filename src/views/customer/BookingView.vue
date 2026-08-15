<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BALI_DESTINATIONS, DESTINATION_CATEGORIES, OFFICIAL_HUBS, MAIN_WHATSAPP } from '../../data/destinations.js';
import { calculateFare, formatIdr, DEFAULT_RATES } from '../../services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, formatCurrency, createXenithPaymentLink } from '../../services/xenith.js';
import { generateWhatsAppOrderMessage, getWhatsAppOrderUrl } from '../../services/whatsapp.js';
import { db } from '../../services/db.js';
import XenithPaymentModal from '../../components/XenithPaymentModal.vue';
import confetti from 'canvas-confetti';
import { 
  Luggage, 
  Plane, 
  Hotel, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Info, 
  CheckCircle2, 
  Zap,
  Anchor,
  Search,
  MessageCircle,
  Tag,
  Copy,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Building
} from 'lucide-vue-next';

const router = useRouter();

// Search & Category Filters for 85 Destinations
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedDestNo = ref(23); // Default to Canggu (No 23)

const filteredDestinations = computed(() => {
  let list = BALI_DESTINATIONS;

  if (selectedCategory.value === 'popular') {
    list = list.filter(d => d.popular);
  } else if (selectedCategory.value !== 'all') {
    list = list.filter(d => d.category === selectedCategory.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.category.toLowerCase().includes(q) ||
      d.no.toString() === q
    );
  }

  return list;
});

const activeDestination = computed(() => {
  return BALI_DESTINATIONS.find(d => d.no === selectedDestNo.value) || BALI_DESTINATIONS[22];
});

// Form state
const form = reactive({
  route_type: 'airport_to_hotel',
  customer_country: 'CN',
  bag_count: 2,
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  pickup_datetime: new Date(Date.now() + 3600000 * 2).toISOString().slice(0, 16),
  flight_number: '',
  hotel_name: '',
  hotel_room: '',
  notes: '',
  payment_preference: 'WhatsApp Order (Pay on Delivery / QRIS)',
});

// Currency Switcher Reference
const activeCurrencyCode = ref('USD');
const FOREIGN_RATES_ESTIMATE = {
  USD: 16000,
  AUD: 10500,
  EUR: 17400,
  SGD: 12200,
  CNY: 2280,
  MYR: 3580,
  PHP: 285,
  THB: 465,
};

// Live Fare Calculation (FR-1)
const fareBreakdown = computed(() => {
  return calculateFare({
    destination: activeDestination.value,
    bagCount: form.bag_count,
    extraBagFee: 30000,
    includedBags: 2,
    routeType: form.route_type,
  });
});

const convertedForeignAmount = computed(() => {
  const rate = FOREIGN_RATES_ESTIMATE[activeCurrencyCode.value] || 16000;
  const val = fareBreakdown.value.totalIdr / rate;
  return activeCurrencyCode.value === 'USD' || activeCurrencyCode.value === 'AUD' || activeCurrencyCode.value === 'EUR' || activeCurrencyCode.value === 'SGD'
    ? val.toFixed(1)
    : Math.round(val).toLocaleString();
});

function incrementBags() {
  if (form.bag_count < 15) form.bag_count++;
}

function decrementBags() {
  if (form.bag_count > 1) form.bag_count--;
}

function selectDestination(dest) {
  selectedDestNo.value = dest.no;
  if (!form.hotel_name) {
    form.hotel_name = `Hotel / Villa in ${dest.name.split('(')[0]}`;
  }
}

// Modal & Copied state
const showPaymentModal = ref(false);
const activeBooking = ref(null);
const paymentLinkData = ref(null);
const copiedText = ref(false);

function prepareBookingRecord() {
  const pickupLoc = form.route_type === 'airport_to_hotel'
    ? `Ngurah Rai International Airport (DPS) — Flight ${form.flight_number || 'TBD'}`
    : `${form.hotel_name || 'Hotel'} (${activeDestination.value.name})`;

  const dropoffLoc = form.route_type === 'hotel_to_airport'
    ? `Ngurah Rai International Airport (DPS) Departure Terminal`
    : `${form.hotel_name || 'Hotel/Villa'} (${activeDestination.value.name})${form.hotel_room ? ` [Room: ${form.hotel_room}]` : ''}`;

  return db.createBooking({
    cabang_id: '11111111-1111-1111-1111-111111111111',
    pricing_zone_id: null,
    customer_name: form.customer_name || 'Guest Traveler',
    customer_phone: form.customer_phone || '-',
    customer_email: form.customer_email || '',
    customer_country: form.customer_country || 'ID',
    route_type: form.route_type,
    pickup_location: pickupLoc,
    pickup_datetime: new Date(form.pickup_datetime).toISOString(),
    dropoff_location: dropoffLoc,
    flight_number: form.flight_number,
    hotel_name: form.hotel_name || activeDestination.value.name,
    hotel_room: form.hotel_room,
    hotel_booking_name: form.customer_name,
    bag_count: form.bag_count,
    price_breakdown: fareBreakdown.value,
    total_amount_idr: fareBreakdown.value.totalIdr,
    foreign_currency: activeCurrencyCode.value,
    foreign_amount: Number(convertedForeignAmount.value.replace(/,/g, '')),
    payment_channel: form.payment_preference,
    payment_status: 'pending_payment',
    status: 'pending_payment',
    notes: form.notes,
  });
}

// 1-Click WhatsApp Direct Order (Primary MVP Flow)
function handleWhatsAppOrder() {
  const booking = prepareBookingRecord();
  activeBooking.value = booking;

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
  });

  const waUrl = getWhatsAppOrderUrl(booking, MAIN_WHATSAPP);
  window.open(waUrl, '_blank');
}

// Copy WhatsApp Order Text
function handleCopyOrderText() {
  const booking = prepareBookingRecord();
  const msg = generateWhatsAppOrderMessage(booking);
  navigator.clipboard.writeText(msg);
  copiedText.value = true;
  setTimeout(() => { copiedText.value = false; }, 2000);
}

// Phase 2 Online Payment Gateway (Xenith Pay)
async function handleOnlinePayment() {
  const booking = prepareBookingRecord();
  activeBooking.value = booking;

  try {
    const res = await createXenithPaymentLink({
      booking_code: booking.booking_code,
      customer_name: form.customer_name || 'Guest Traveler',
      customer_phone: form.customer_phone || '-',
      foreign_currency: COUNTRY_PAYMENT_MAP[form.customer_country]?.currency || 'CNY',
      foreign_amount: convertIdrToCurrency(fareBreakdown.value.totalIdr, COUNTRY_PAYMENT_MAP[form.customer_country]?.currency || 'CNY'),
      payment_channel: COUNTRY_PAYMENT_MAP[form.customer_country]?.channel || 'Alipay',
      total_amount_idr: fareBreakdown.value.totalIdr,
    });
    paymentLinkData.value = res.data;
  } catch (e) {
    paymentLinkData.value = {
      reference: `XEN-${booking.booking_code}`,
      currency: 'CNY',
      amount: 150,
      paymentChannel: 'Alipay',
    };
  }

  showPaymentModal.value = true;
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] pb-28 pt-4 sm:pt-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
    
    <!-- Hero Brand Banner -->
    <div class="glass-card rounded-3xl p-5 sm:p-8 border border-brand-500/20 shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
        <img 
          src="/icons/logo.png" 
          alt="Bali BagMove" 
          class="h-16 sm:h-20 object-contain rounded-2xl shadow-xl shadow-brand-500/20"
        />
        <div class="space-y-1">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles class="w-3 h-3 text-brand-400" />
            <span>Pricelist Resmi • 85 Destinasi Bali</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            Bali <span class="gradient-text-brand">BagMove</span>
          </h1>
          <p class="text-xs sm:text-sm text-slate-300 font-medium">
            Enjoy Bali, Luggage-Free. • Acuan Airport Ngurah Rai (DPS)
          </p>
          <div class="text-[11px] text-slate-400">
            PT Bonanza Tujuh Samudera (BTS) • Hub: Kuta Airport, Sanur Harbour & Seminyak
          </div>
        </div>
      </div>

      <!-- Quick Trust Metric -->
      <div class="hidden lg:flex flex-col items-end gap-1.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Layanan Terpercaya</span>
        <div class="text-lg font-bold text-white flex items-center gap-1.5">
          <ShieldCheck class="w-5 h-5 text-brand-400" />
          <span>100% Aman & Bersegel</span>
        </div>
        <span class="text-[10px] text-emerald-400 font-medium">Order Instant Langsung ke WhatsApp</span>
      </div>

    </div>

    <!-- Main Grid: Booking Calculator & Destination Selector -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Column: Interactive Calculator & Details (7 cols) -->
      <div class="lg:col-span-7 space-y-5">
        
        <!-- Step 1: Select Route -->
        <div class="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-3">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">1</span>
            Pilih Rute Pengantaran Koper
          </label>

          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              @click="form.route_type = 'airport_to_hotel'"
              class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
              :class="form.route_type === 'airport_to_hotel' ? 'bg-brand-500/20 border-brand-500 text-white shadow-glow-brand ring-1 ring-brand-500' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <Plane class="w-5 h-5 text-brand-400" />
              <span class="text-xs font-bold leading-tight">Airport ➔ Hotel</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_airport'"
              class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
              :class="form.route_type === 'hotel_to_airport' ? 'bg-brand-500/20 border-brand-500 text-white shadow-glow-brand ring-1 ring-brand-500' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <Hotel class="w-5 h-5 text-brand-400" />
              <span class="text-xs font-bold leading-tight">Hotel ➔ Airport</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_hotel'"
              class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
              :class="form.route_type === 'hotel_to_hotel' ? 'bg-brand-500/20 border-brand-500 text-white shadow-glow-brand ring-1 ring-brand-500' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <Luggage class="w-5 h-5 text-brand-400" />
              <span class="text-xs font-bold leading-tight">Hotel ➔ Hotel</span>
            </button>
          </div>
        </div>

        <!-- Step 2: 85 Destination Selector & Search -->
        <div class="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">2</span>
              Pilih Destinasi Tujuan (85 Tempat di Bali)
            </label>
            <span class="text-[11px] text-brand-400 font-mono font-bold">
              {{ activeDestination.km }} km • {{ formatIdr(activeDestination.priceIdr) }}
            </span>
          </div>

          <!-- Search Input -->
          <div class="relative">
            <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari lokasi: Canggu, Seminyak, Ubud, Lovina, Sanur, Nusa Dua..."
              class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              v-for="cat in DESTINATION_CATEGORIES"
              :key="cat.id"
              type="button"
              @click="selectedCategory = cat.id"
              class="px-2.5 py-1 rounded-xl font-medium border transition-colors whitespace-nowrap text-[11px]"
              :class="selectedCategory === cat.id ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>

          <!-- Active Selected Destination Card -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-r from-brand-950/80 to-slate-900 border border-brand-500/40 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                #{{ activeDestination.no }}
              </div>
              <div>
                <span class="text-xs font-bold text-white block">{{ activeDestination.name }}</span>
                <span class="text-[10px] text-slate-400">Jarak dari Airport DPS: <strong class="text-brand-300">{{ activeDestination.km }} km</strong></span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block">Tarif Katalog (1-2 Koper):</span>
              <span class="text-sm font-bold font-mono text-brand-400">{{ formatIdr(activeDestination.priceIdr) }}</span>
            </div>
          </div>

          <!-- Destination List Grid (Scrollable) -->
          <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            <button
              v-for="dest in filteredDestinations"
              :key="dest.no"
              type="button"
              @click="selectDestination(dest)"
              class="w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between text-xs group"
              :class="selectedDestNo === dest.no ? 'bg-brand-500/20 border border-brand-500/50 text-white font-bold' : 'bg-slate-950/60 border border-slate-800/80 text-slate-300 hover:bg-slate-900'"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-mono text-slate-500 w-5">#{{ dest.no }}</span>
                <span class="truncate">{{ dest.name }}</span>
                <span v-if="dest.popular" class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">🔥 Populer</span>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0 ml-2 font-mono">
                <span class="text-[10px] text-slate-400">{{ dest.km }} km</span>
                <span class="text-brand-400 font-semibold">{{ formatIdr(dest.priceIdr) }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 3: Bag Count Stepper -->
        <div class="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-3">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">3</span>
            Jumlah Koper (Luggage Quantity)
          </label>

          <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white">Jumlah Bagasi:</span>
                <span class="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold font-mono">
                  {{ form.bag_count }} Koper
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                <span class="text-emerald-400 font-semibold">1-2 Koper Flat Bundle</span> sudah termasuk di tarif dasar.
                <span v-if="form.bag_count > 2" class="text-amber-400">
                  +{{ form.bag_count - 2 }} koper extra @ Rp 30.000/koper.
                </span>
              </p>
            </div>

            <div class="flex items-center gap-2.5">
              <button
                type="button"
                @click="decrementBags"
                class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-base flex items-center justify-center transition-colors"
              >
                -
              </button>
              <span class="text-base font-bold font-mono text-white w-5 text-center">
                {{ form.bag_count }}
              </span>
              <button
                type="button"
                @click="incrementBags"
                class="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-base flex items-center justify-center transition-colors shadow-md shadow-brand-500/20"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Step 4: Customer Details & Pickup Time -->
        <div class="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-3.5">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">4</span>
            Data Tamu & Detail Pengantaran
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">Nama Lengkap Tamu</label>
              <input
                v-model="form.customer_name"
                type="text"
                placeholder="e.g. John Smith / Wei Zhang"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">Nomor WhatsApp Tamu</label>
              <input
                v-model="form.customer_phone"
                type="tel"
                placeholder="+62 / +86 / +61..."
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">
                {{ form.route_type === 'airport_to_hotel' ? 'Nomor Penerbangan (Flight No.)' : 'Nama Hotel / Villa Jemput' }}
              </label>
              <input
                v-if="form.route_type === 'airport_to_hotel'"
                v-model="form.flight_number"
                type="text"
                placeholder="e.g. SQ 944 / GA 402 / MH 715"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
              <input
                v-else
                v-model="form.hotel_name"
                type="text"
                placeholder="e.g. W Bali Seminyak / Maya Sanur"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">
                {{ form.route_type === 'airport_to_hotel' ? 'Nama Hotel / Villa Tujuan' : 'Nomor Kamar / Nama Booking' }}
              </label>
              <input
                v-if="form.route_type === 'airport_to_hotel'"
                v-model="form.hotel_name"
                type="text"
                placeholder="e.g. Ayana Resort Jimbaran / Villa Echo Canggu"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
              <input
                v-else
                v-model="form.hotel_room"
                type="text"
                placeholder="e.g. Room 304 / Villa 2B"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Tanggal & Jam Pickup / Tiba</label>
            <input
              v-model="form.pickup_datetime"
              type="datetime-local"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>
        </div>

      </div>

      <!-- Right Column: Live Price Card & 1-Click WhatsApp CTA (5 cols) -->
      <div class="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
        
        <!-- Live Invoice Summary Card -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-brand-500/30 shadow-2xl space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 class="font-display font-bold text-sm text-white flex items-center gap-2">
              <Tag class="w-4 h-4 text-brand-400" />
              Rincian Perhitungan Biaya
            </h3>
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
              Update 24 Ags 2024
            </span>
          </div>

          <!-- Route & Dest Info -->
          <div class="space-y-2.5 text-xs text-slate-300">
            <div class="flex items-start justify-between gap-2">
              <span class="text-slate-400">Destinasi:</span>
              <strong class="text-white text-right font-medium">{{ activeDestination.name }}</strong>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400">Jarak Tempuh:</span>
              <span class="font-mono text-slate-200">{{ activeDestination.km }} km dari Airport DPS</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400">Tarif Dasar (1-2 Koper):</span>
              <span class="font-mono font-bold text-white">{{ formatIdr(fareBreakdown.baseTripPrice) }}</span>
            </div>

            <div v-if="fareBreakdown.extraBags > 0" class="flex items-center justify-between text-amber-300">
              <span>Extra Koper ({{ fareBreakdown.extraBags }} × Rp 30.000):</span>
              <span class="font-mono font-bold">+{{ formatIdr(fareBreakdown.extraBagTotal) }}</span>
            </div>

            <!-- Total Price Highlight Box -->
            <div class="pt-3 border-t border-slate-800 space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Biaya (IDR)</span>
                <span class="text-2xl sm:text-3xl font-display font-black text-brand-400 font-mono">
                  {{ formatIdr(fareBreakdown.totalIdr) }}
                </span>
              </div>

              <!-- Currency Switcher Reference Pill -->
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-slate-400">Estimasi Valas:</span>
                  <select
                    v-model="activeCurrencyCode"
                    class="bg-slate-900 border border-slate-700 text-[10px] text-brand-300 font-bold rounded px-1.5 py-0.5 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="MYR">MYR (RM)</option>
                  </select>
                </div>
                <span class="font-mono font-bold text-white">
                  ≈ {{ activeCurrencyCode }} {{ convertedForeignAmount }}
                </span>
              </div>
            </div>
          </div>

          <!-- PRIMARY CTA: 1-Click WhatsApp Direct Order -->
          <div class="space-y-2 pt-2">
            <button
              type="button"
              @click="handleWhatsAppOrder"
              class="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 hover:from-whatsapp-600 hover:to-whatsapp-700 text-white font-display font-extrabold text-sm sm:text-base shadow-xl shadow-whatsapp-500/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle class="w-5 h-5 fill-current" />
              <span>Pesan Sekarang via WhatsApp</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="handleCopyOrderText"
                class="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check v-if="copiedText" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedText ? 'Format Disalin!' : 'Salin Format Pesan' }}</span>
              </button>

              <button
                type="button"
                @click="handleOnlinePayment"
                class="py-2.5 px-3 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/40 text-brand-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap class="w-3.5 h-3.5 text-brand-400" />
                <span>Fase 2: Bayar Online</span>
              </button>
            </div>
          </div>

          <!-- Direct Phone Dispatch Note -->
          <div class="pt-2 text-center text-[10px] text-slate-400">
            WhatsApp Hotline: <strong class="text-white">+62 851-7249-1244</strong> • CS Standby 24/7
          </div>
        </div>

        <!-- Official Hub Locations Info -->
        <div class="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Building class="w-4 h-4 text-brand-400" />
            Lokasi Hub & Kantor Resmi Bali
          </h4>

          <div class="space-y-2 text-[11px] text-slate-300">
            <div v-for="hub in OFFICIAL_HUBS" :key="hub.id" class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div class="flex items-center justify-between font-bold text-white">
                <span>{{ hub.name }}</span>
                <a :href="`https://wa.me/${hub.phoneClean}`" target="_blank" class="text-brand-400 hover:underline font-mono text-[10px]">
                  {{ hub.phone }}
                </a>
              </div>
              <p class="text-slate-400 text-[10px] mt-0.5">{{ hub.address }}</p>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Sticky Mobile Bottom Bar for Instant Booking -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-slate-950/95 backdrop-blur-md border-t border-brand-500/30 flex items-center justify-between gap-3 shadow-2xl">
      <div class="flex flex-col">
        <span class="text-[10px] text-slate-400">Total ({{ activeDestination.name.split('(')[0] }}):</span>
        <span class="text-lg font-display font-black text-brand-400 font-mono">
          {{ formatIdr(fareBreakdown.totalIdr) }}
        </span>
      </div>

      <button
        type="button"
        @click="handleWhatsAppOrder"
        class="py-3 px-5 rounded-xl bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white font-bold text-xs shadow-lg shadow-whatsapp-500/30 flex items-center gap-2 flex-shrink-0"
      >
        <MessageCircle class="w-4 h-4 fill-current" />
        <span>Pesan via WhatsApp</span>
      </button>
    </div>

    <!-- Xenith Payment Modal (Phase 2) -->
    <XenithPaymentModal
      v-if="showPaymentModal && activeBooking"
      :booking="activeBooking"
      :payment-data="paymentLinkData"
      @close="showPaymentModal = false"
      @paid="showPaymentModal = false"
    />

  </div>
</template>
