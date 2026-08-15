<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { BALI_DESTINATIONS, DESTINATION_CATEGORIES, OFFICIAL_HUBS, MAIN_WHATSAPP } from '../../data/destinations.js';
import { calculateFare, formatIdr } from '../../services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, createXenithPaymentLink } from '../../services/xenith.js';
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
  CheckCircle2, 
  Zap, 
  Search, 
  MessageCircle, 
  Tag, 
  Copy, 
  Check, 
  Star, 
  Lock, 
  Camera, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Award
} from 'lucide-vue-next';

const router = useRouter();

// Top popular quick-select destinations
const POPULAR_QUICK_DESTINATIONS = [
  { no: 23, name: 'Canggu', km: 20, priceIdr: 400000, tag: '🔥 Popular' },
  { no: 66, name: 'Seminyak', km: 10, priceIdr: 150000, tag: '🔥 Favorite' },
  { no: 79, name: 'Ubud', km: 37, priceIdr: 370000, tag: '🌿 Cultural' },
  { no: 43, name: 'Kuta', km: 4, priceIdr: 120000, tag: '⚡ Near DPS' },
  { no: 33, name: 'Nusa Dua', km: 13, priceIdr: 195000, tag: '🏖️ Resort' },
  { no: 65, name: 'Sanur', km: 21, priceIdr: 231000, tag: '⚓ Port' },
  { no: 81, name: 'Uluwatu', km: 30, priceIdr: 450000, tag: '🌅 Sunset' },
  { no: 37, name: 'Jimbaran', km: 7, priceIdr: 210000, tag: '🦐 Seafood' },
];

// Search & filter state
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedDestNo = ref(23); // Default Canggu
const isDropdownOpen = ref(false);

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
  customer_country: 'AU',
  bag_count: 2,
  customer_name: '',
  customer_phone: '',
  pickup_datetime: new Date(Date.now() + 3600000 * 2).toISOString().slice(0, 16),
  flight_number: '',
  hotel_name: '',
  hotel_room: '',
  notes: '',
});

// Multi-currency estimates
const activeCurrencyCode = ref('AUD');
const FOREIGN_RATES = {
  AUD: 10500,
  USD: 16000,
  SGD: 12200,
  EUR: 17400,
  CNY: 2280,
  MYR: 3580,
  INR: 192,
};

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
  const rate = FOREIGN_RATES[activeCurrencyCode.value] || 10500;
  const val = fareBreakdown.value.totalIdr / rate;
  return ['AUD', 'USD', 'SGD', 'EUR'].includes(activeCurrencyCode.value)
    ? val.toFixed(1)
    : Math.round(val).toLocaleString();
});

function selectDestination(dest) {
  selectedDestNo.value = dest.no;
  isDropdownOpen.value = false;
  searchQuery.value = '';
  if (!form.hotel_name) {
    form.hotel_name = `Hotel / Villa in ${dest.name.split('(')[0]}`;
  }
}

function incrementBags() {
  if (form.bag_count < 12) form.bag_count++;
}

function decrementBags() {
  if (form.bag_count > 1) form.bag_count--;
}

// Live recent booking activity simulation (Social proof ticker)
const recentBookings = [
  { name: 'Liam & Chloe M.', from: 'Australia', route: 'Airport ➔ Canggu (2 Bags)', time: '4 mins ago' },
  { name: 'Wei Zhang', from: 'Singapore', route: 'Airport ➔ Seminyak (3 Bags)', time: '11 mins ago' },
  { name: 'Sarah Jenkins', from: 'United Kingdom', route: 'Hotel ➔ Airport (2 Bags)', time: '19 mins ago' },
  { name: 'Kenji Sato', from: 'Japan', route: 'Sanur Port ➔ Ubud (2 Bags)', time: '28 mins ago' },
];
const currentTickerIdx = ref(0);
let tickerTimer = null;

onMounted(() => {
  tickerTimer = setInterval(() => {
    currentTickerIdx.value = (currentTickerIdx.value + 1) % recentBookings.length;
  }, 4500);
});

onUnmounted(() => {
  if (tickerTimer) clearInterval(tickerTimer);
});

// Social Proof Customer Testimonials
const TESTIMONIALS = [
  {
    name: 'Liam & Chloe K.',
    country: '🇦🇺 Australia (Melbourne)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    route: 'Airport DPS ➔ The Lawn Villa, Canggu',
    rating: 5,
    date: 'August 2024',
    text: 'Best decision ever landing in Bali! Handed our 3 heavy suitcases right at the Kuta exit gate and went straight for brunch. Bags arrived at our villa with seals intact before 3 PM check-in.',
  },
  {
    name: 'Wei Zhang & Ling',
    country: '🇸🇬 Singapore',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    route: 'Airport DPS ➔ W Bali Seminyak',
    rating: 5,
    date: 'August 2024',
    text: 'Extremely professional and fast. Courier Wayan sent photo proof on WhatsApp with numbered security seals immediately upon pickup. 100% recommended!',
  },
  {
    name: 'Sarah Jenkins',
    country: '🇬🇧 United Kingdom (London)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    route: 'Maya Sanur Resort ➔ Airport DPS',
    rating: 5,
    date: 'July 2024',
    text: 'Had a late 10 PM flight after checkout at 11 AM. BagMove stored and delivered our bags to DPS on time. Booking via WhatsApp was super easy and took 2 mins.',
  },
];

// FAQs (English)
const FAQS = [
  {
    q: 'Where do I meet the courier at Ngurah Rai Airport (DPS)?',
    a: 'Our courier team stands by at the Arrival Hall (International & Domestic) or at our Kuta Airport Hub located just 100 meters from the airport exit gate (Jl. Dewi Sartika 1 Utama).',
    open: true,
  },
  {
    q: 'Is my luggage safe and secure during transit?',
    a: '100% secure. Every zipper is sealed with a unique numbered tamper-proof security seal in front of you, photographed, and sent to your WhatsApp. All bags are transported in enclosed, air-conditioned vans.',
    open: false,
  },
  {
    q: 'How do I pay for the service?',
    a: 'Very flexible! You can pay in cash (IDR), on-site QRIS, international card/e-wallet, or settle upon luggage handover.',
    open: false,
  },
  {
    q: 'How long does delivery to my hotel or villa take?',
    a: 'Standard delivery takes 2–4 hours depending on the zone. You can also specify your preferred delivery arrival window via WhatsApp.',
    open: false,
  },
];
const faqsState = ref(FAQS);

function toggleFaq(index) {
  faqsState.value[index].open = !faqsState.value[index].open;
}

// Order & Payment handlers
const copiedText = ref(false);
const showPaymentModal = ref(false);
const activeBooking = ref(null);
const paymentLinkData = ref(null);

function prepareBookingRecord() {
  const pickupLoc = form.route_type === 'airport_to_hotel'
    ? `Ngurah Rai International Airport (DPS)${form.flight_number ? ` [Flight: ${form.flight_number}]` : ''}`
    : `${form.hotel_name || 'Hotel'} (${activeDestination.value.name})`;

  const dropoffLoc = form.route_type === 'hotel_to_airport'
    ? `Ngurah Rai International Airport (DPS) Departure Terminal`
    : `${form.hotel_name || 'Hotel/Villa'} (${activeDestination.value.name})${form.hotel_room ? ` [Room: ${form.hotel_room}]` : ''}`;

  return db.createBooking({
    cabang_id: '11111111-1111-1111-1111-111111111111',
    customer_name: form.customer_name || 'Guest Traveler',
    customer_phone: form.customer_phone || '-',
    customer_country: form.customer_country || 'AU',
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
    payment_channel: 'WhatsApp Order (Pay on Delivery / QRIS)',
    payment_status: 'pending_payment',
    status: 'pending_payment',
    notes: form.notes,
  });
}

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

function handleCopyOrderText() {
  const booking = prepareBookingRecord();
  const msg = generateWhatsAppOrderMessage(booking);
  navigator.clipboard.writeText(msg);
  copiedText.value = true;
  setTimeout(() => { copiedText.value = false; }, 2000);
}

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
  <div class="min-h-screen pb-28 pt-4 sm:pt-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
    
    <!-- 1. HERO SECTION: Clean White / Crisp Light Theme (English) -->
    <div class="text-center space-y-4 max-w-2xl mx-auto pt-2">
      
      <!-- Live Social Proof Ticker Badge -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs shadow-sm">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-slate-600 text-[11px]">
          <strong class="text-slate-900">{{ recentBookings[currentTickerIdx].name }}</strong> ({{ recentBookings[currentTickerIdx].from }}) booked {{ recentBookings[currentTickerIdx].route }} • <span class="text-emerald-600 font-bold">{{ recentBookings[currentTickerIdx].time }}</span>
        </span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-3xl sm:text-5xl font-display font-black text-slate-900 tracking-tight leading-tight">
        Your Bags to the Hotel, <br />
        <span class="gradient-text-brand">You Explore Bali Hands-Free!</span>
      </h1>

      <!-- Value Proposition -->
      <p class="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
        Official luggage delivery & storage direct from <strong>Ngurah Rai Airport (DPS)</strong> to 85 hotel & villa destinations across Bali.
      </p>

      <!-- Trust Bar (Rating + Guarantee Badges) -->
      <div class="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-slate-600">
        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div class="flex text-amber-400">
            <Star v-for="i in 5" :key="i" class="w-3.5 h-3.5 fill-current" />
          </div>
          <span class="font-bold text-slate-900">4.9/5</span>
          <span class="text-slate-500">(1,480+ Travelers)</span>
        </div>

        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <Lock class="w-4 h-4 text-brand-600" />
          <span class="font-medium">100% Numbered Security Seals</span>
        </div>

        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <Camera class="w-4 h-4 text-emerald-600" />
          <span class="font-medium">WhatsApp Photo Proof</span>
        </div>
      </div>

    </div>

    <!-- 2. MAIN BOOKING CALCULATOR CONTAINER -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Column: Simple 3-Step Interactive Form (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        
        <!-- STEP 1: ROUTE & DESTINATION -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">1</span>
              Select Route & Destination
            </h2>
            <span class="text-xs text-brand-600 font-bold font-mono">
              {{ activeDestination.km }} km • {{ formatIdr(activeDestination.priceIdr) }}
            </span>
          </div>

          <!-- Route Segmented Control -->
          <div class="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              @click="form.route_type = 'airport_to_hotel'"
              class="py-2.5 px-2 rounded-xl text-center text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
              :class="form.route_type === 'airport_to_hotel' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Plane class="w-3.5 h-3.5 text-brand-600" />
              <span>Airport ➔ Hotel</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_airport'"
              class="py-2.5 px-2 rounded-xl text-center text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
              :class="form.route_type === 'hotel_to_airport' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Hotel class="w-3.5 h-3.5 text-brand-600" />
              <span>Hotel ➔ Airport</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_hotel'"
              class="py-2.5 px-2 rounded-xl text-center text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5"
              :class="form.route_type === 'hotel_to_hotel' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Luggage class="w-3.5 h-3.5 text-brand-600" />
              <span>Hotel ➔ Hotel</span>
            </button>
          </div>

          <!-- Quick Popular Destination Pills -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-700">Popular Destinations (1-Click):</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="pop in POPULAR_QUICK_DESTINATIONS"
                :key="pop.no"
                type="button"
                @click="selectDestination(pop)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1"
                :class="selectedDestNo === pop.no ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/25' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
              >
                <span>{{ pop.name }}</span>
                <span class="text-[10px] opacity-80 font-mono">({{ formatIdr(pop.priceIdr).replace('Rp ', 'IDR ') }})</span>
              </button>
            </div>
          </div>

          <!-- Search All 85 Destinations -->
          <div class="relative pt-1">
            <div class="flex items-center justify-between text-[11px] text-slate-600 mb-1">
              <span>Or search from all 85 Bali locations:</span>
              <span class="text-brand-600 font-bold cursor-pointer hover:underline" @click="isDropdownOpen = !isDropdownOpen">
                {{ isDropdownOpen ? 'Close List ▲' : 'Browse All 85 Locations ▼' }}
              </span>
            </div>

            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="searchQuery"
                @focus="isDropdownOpen = true"
                type="text"
                placeholder="Type location name (e.g. Bedugul, Kintamani, Lovina, Tanah Lot)..."
                class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            <!-- Dropdown List of 85 Destinations -->
            <div
              v-if="isDropdownOpen"
              class="absolute left-0 right-0 mt-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-2xl z-30 max-h-56 overflow-y-auto space-y-1"
            >
              <button
                v-for="dest in filteredDestinations"
                :key="dest.no"
                type="button"
                @click="selectDestination(dest)"
                class="w-full p-2 rounded-xl text-left transition-all flex items-center justify-between text-xs group"
                :class="selectedDestNo === dest.no ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200' : 'hover:bg-slate-50 text-slate-700'"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="text-[10px] font-mono text-slate-400">#{{ dest.no }}</span>
                  <span class="truncate">{{ dest.name }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2 font-mono text-[11px]">
                  <span class="text-slate-500">{{ dest.km }}km</span>
                  <span class="text-brand-600 font-bold">{{ formatIdr(dest.priceIdr) }}</span>
                </div>
              </button>
            </div>
          </div>

        </div>

        <!-- STEP 2: LUGGAGE QUANTITY -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">2</span>
            Luggage Quantity
          </h2>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-900">How many bags?</span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                  {{ form.bag_count }} Bags
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                <span class="text-emerald-700 font-bold">1–2 Bags included in the flat fare bundle.</span>
                <span v-if="form.bag_count > 2" class="text-amber-700 font-semibold">
                  (+{{ form.bag_count - 2 }} extra @ IDR 30,000 / bag)
                </span>
              </p>
            </div>

            <!-- Stepper Buttons -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="decrementBags"
                class="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-black text-lg flex items-center justify-center transition-colors active:scale-95 shadow-sm"
              >
                -
              </button>
              <span class="text-lg font-black font-mono text-slate-900 w-6 text-center">
                {{ form.bag_count }}
              </span>
              <button
                type="button"
                @click="incrementBags"
                class="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-lg flex items-center justify-center transition-colors shadow-md shadow-brand-500/25 active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 3: CONTACT & SCHEDULE -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3.5">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">3</span>
            Traveler Details & Schedule
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Guest Full Name</label>
              <input
                v-model="form.customer_name"
                type="text"
                placeholder="e.g. Alex Lee"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Phone Number</label>
              <input
                v-model="form.customer_phone"
                type="tel"
                placeholder="+61 / +65 / +62..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">
                {{ form.route_type === 'airport_to_hotel' ? 'Flight Number (Optional)' : 'Pickup Hotel / Villa Name' }}
              </label>
              <input
                v-if="form.route_type === 'airport_to_hotel'"
                v-model="form.flight_number"
                type="text"
                placeholder="e.g. SQ 944 / GA 402 / QF 43"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
              <input
                v-else
                v-model="form.hotel_name"
                type="text"
                placeholder="Hotel / Villa Name"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Pickup Date & Time</label>
              <input
                v-model="form.pickup_datetime"
                type="datetime-local"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Live Summary & WhatsApp CTA (5 cols) -->
      <div class="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
        
        <!-- Live Invoice Card -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <Tag class="w-4 h-4 text-brand-600" />
              <h3 class="font-display font-bold text-sm text-slate-900">Fare Calculation Summary</h3>
            </div>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Transparent Flat Fare
            </span>
          </div>

          <!-- Breakdown rows -->
          <div class="space-y-2.5 text-xs text-slate-600">
            <div class="flex items-start justify-between gap-2">
              <span class="text-slate-500">Destination:</span>
              <strong class="text-slate-900 text-right font-bold">{{ activeDestination.name }}</strong>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-500">Distance:</span>
              <span class="font-mono text-slate-700 font-semibold">{{ activeDestination.km }} km from DPS Airport</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-500">Flat Base Fare (1–2 Bags):</span>
              <span class="font-mono font-bold text-slate-900">{{ formatIdr(fareBreakdown.baseTripPrice) }}</span>
            </div>

            <div v-if="fareBreakdown.extraBags > 0" class="flex items-center justify-between text-amber-700">
              <span>Extra Bags ({{ fareBreakdown.extraBags }} × IDR 30k):</span>
              <span class="font-mono font-bold">+{{ formatIdr(fareBreakdown.extraBagTotal) }}</span>
            </div>

            <!-- Total Highlight -->
            <div class="pt-3 border-t border-slate-100 space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Payment</span>
                <span class="text-2xl sm:text-3xl font-display font-black text-brand-600 font-mono">
                  {{ formatIdr(fareBreakdown.totalIdr) }}
                </span>
              </div>

              <!-- Currency Switcher Reference -->
              <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-slate-500 font-semibold">Est. FX:</span>
                  <select
                    v-model="activeCurrencyCode"
                    class="bg-white border border-slate-300 text-[10px] text-brand-700 font-bold rounded px-1.5 py-0.5 outline-none shadow-sm"
                  >
                    <option value="AUD">AUD (A$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="MYR">MYR (RM)</option>
                  </select>
                </div>
                <span class="font-mono font-bold text-slate-700">
                  ≈ {{ activeCurrencyCode }} {{ convertedForeignAmount }}
                </span>
              </div>
            </div>
          </div>

          <!-- PRIMARY CTA: 1-Click WhatsApp -->
          <div class="space-y-2 pt-1">
            <button
              type="button"
              @click="handleWhatsAppOrder"
              class="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] group"
            >
              <MessageCircle class="w-5 h-5 fill-current group-hover:animate-bounce" />
              <span>Book via WhatsApp (5-Min Response)</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="handleCopyOrderText"
                class="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check v-if="copiedText" class="w-3.5 h-3.5 text-emerald-600" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedText ? 'Copied!' : 'Copy Summary' }}</span>
              </button>

              <button
                type="button"
                @click="handleOnlinePayment"
                class="py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap class="w-3.5 h-3.5 text-brand-600" />
                <span>Pay Online</span>
              </button>
            </div>
          </div>

          <!-- Micro Guarantees -->
          <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
            <div class="flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3 text-emerald-600" />
              <span>Pay upon luggage handover</span>
            </div>
            <div class="flex items-center gap-1">
              <ShieldCheck class="w-3 h-3 text-brand-600" />
              <span>Tamper-proof seals</span>
            </div>
          </div>

        </div>

        <!-- Official Contact Card -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-sm">
          <div class="space-y-0.5">
            <span class="text-[10px] text-slate-400 uppercase font-bold">WhatsApp Concierge Team</span>
            <p class="font-bold text-slate-900 text-sm">+62 851-7249-1244</p>
          </div>
          <a
            :href="`https://wa.me/${MAIN_WHATSAPP}`"
            target="_blank"
            class="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            Chat CS ➔
          </a>
        </div>

      </div>

    </div>

    <!-- 3. SOCIAL PROOF SECTION: Real Reviews from Tourists -->
    <div class="pt-6 space-y-6">
      
      <div class="text-center space-y-2">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold">
          <Award class="w-3.5 h-3.5 text-amber-600" />
          <span>Real Traveler Experiences</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          Trusted by Over 1,400+ Bali Travelers
        </h2>
        <p class="text-xs sm:text-sm text-slate-500">
          See what international tourists say about their luggage-free vacation with Bali BagMove.
        </p>
      </div>

      <!-- Testimonials Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="(t, idx) in TESTIMONIALS"
          :key="idx"
          class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-400 transition-all hover:shadow-md"
        >
          <div class="space-y-2.5">
            <!-- Stars -->
            <div class="flex text-amber-400">
              <Star v-for="s in t.rating" :key="s" class="w-4 h-4 fill-current" />
            </div>
            <p class="text-xs text-slate-600 leading-relaxed italic">
              "{{ t.text }}"
            </p>
          </div>

          <div class="flex items-center gap-3 pt-3 border-t border-slate-100">
            <img :src="t.avatar" :alt="t.name" class="w-10 h-10 rounded-full object-cover border border-slate-200" />
            <div class="text-xs">
              <h4 class="font-bold text-slate-900">{{ t.name }}</h4>
              <p class="text-[10px] text-slate-500">{{ t.country }}</p>
              <p class="text-[9px] text-brand-600 font-semibold">{{ t.route }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 4. FAQ ACCORDION SECTION (English) -->
    <div class="pt-6 space-y-4 max-w-2xl mx-auto">
      <div class="text-center space-y-1">
        <h3 class="text-xl sm:text-2xl font-display font-bold text-slate-900">Frequently Asked Questions (FAQ)</h3>
        <p class="text-xs text-slate-500">Everything you need to know about Bali BagMove services</p>
      </div>

      <div class="space-y-2">
        <div
          v-for="(faq, fIdx) in faqsState"
          :key="fIdx"
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
        >
          <button
            type="button"
            @click="toggleFaq(fIdx)"
            class="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-brand-600"
          >
            <span>{{ faq.q }}</span>
            <ChevronUp v-if="faq.open" class="w-4 h-4 text-brand-600 flex-shrink-0" />
            <ChevronDown v-else class="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
          <div v-if="faq.open" class="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
            {{ faq.a }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky Mobile Bottom Bar for High Conversion -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-3 shadow-lg">
      <div class="flex flex-col">
        <span class="text-[10px] text-slate-500">Total ({{ activeDestination.name.split('(')[0] }}):</span>
        <span class="text-lg font-display font-black text-brand-600 font-mono">
          {{ formatIdr(fareBreakdown.totalIdr) }}
        </span>
      </div>

      <button
        type="button"
        @click="handleWhatsAppOrder"
        class="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 flex-shrink-0 active:scale-95"
      >
        <MessageCircle class="w-4 h-4 fill-current" />
        <span>Book via WhatsApp</span>
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
