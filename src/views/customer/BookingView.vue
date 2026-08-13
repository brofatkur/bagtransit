<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { db } from '../../services/db.js';
import { calculateFare, formatIdr, DEFAULT_RATES } from '../../services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, formatCurrency, createXenithPaymentLink } from '../../services/xenith.js';
import XenithPaymentModal from '../../components/XenithPaymentModal.vue';
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
  HelpCircle,
  QrCode,
  Tag
} from 'lucide-vue-next';

const router = useRouter();

// Available Hubs
const branches = computed(() => db.getBranches());
const selectedBranchId = ref(branches.value[0]?.id || '11111111-1111-1111-1111-111111111111');

// Available Pricing Zones for active hub
const pricingZones = computed(() => db.getPricingZones(selectedBranchId.value));
const selectedZoneId = ref(pricingZones.value[0]?.id || '');

watch(pricingZones, (newZones) => {
  if (newZones.length && !newZones.some(z => z.id === selectedZoneId.value)) {
    selectedZoneId.value = newZones[0].id;
  }
}, { immediate: true });

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
});

// Current selected zone object
const activeZone = computed(() => {
  return pricingZones.value.find(z => z.id === selectedZoneId.value) || pricingZones.value[0];
});

// Selected Country Payment Meta
const activeCountry = computed(() => {
  return COUNTRY_PAYMENT_MAP[form.customer_country] || COUNTRY_PAYMENT_MAP.CN;
});

// Live Fare Calculation (FR-1)
const fareBreakdown = computed(() => {
  const zone = activeZone.value;
  return calculateFare({
    distanceKm: zone?.estimated_km || 10,
    bagCount: form.bag_count,
    customRates: zone || DEFAULT_RATES,
  });
});

// Foreign Currency Amount
const foreignAmount = computed(() => {
  return convertIdrToCurrency(fareBreakdown.value.totalIdr, activeCountry.value.currency);
});

// Modal state
const showPaymentModal = ref(false);
const activeBooking = ref(null);
const paymentLinkData = ref(null);
const isSubmitting = ref(false);

function incrementBags() {
  if (form.bag_count < 10) form.bag_count++;
}

function decrementBags() {
  if (form.bag_count > 1) form.bag_count--;
}

async function handleBookingSubmit() {
  if (!form.customer_name || !form.customer_phone) {
    alert('Please provide your name and WhatsApp contact number.');
    return;
  }

  isSubmitting.value = true;

  try {
    const pickupLoc = form.route_type === 'airport_to_hotel'
      ? `Ngurah Rai International Airport (DPS) Arrival Terminal — Flight ${form.flight_number || 'TBD'}`
      : `${form.hotel_name || 'Hotel'} (${activeZone.value?.zone_name || 'Bali'})`;

    const dropoffLoc = form.route_type === 'hotel_to_airport'
      ? `Ngurah Rai International Airport (DPS) Departure Hall`
      : `${form.hotel_name || 'Hotel / Villa'} (${activeZone.value?.zone_name || 'Bali'})${form.hotel_room ? ` Room: ${form.hotel_room}` : ''}`;

    const newBooking = db.createBooking({
      cabang_id: selectedBranchId.value,
      pricing_zone_id: activeZone.value?.id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      customer_country: form.customer_country,
      route_type: form.route_type,
      pickup_location: pickupLoc,
      pickup_datetime: new Date(form.pickup_datetime).toISOString(),
      dropoff_location: dropoffLoc,
      flight_number: form.flight_number,
      hotel_name: form.hotel_name,
      hotel_room: form.hotel_room,
      hotel_booking_name: form.customer_name,
      bag_count: form.bag_count,
      price_breakdown: fareBreakdown.value,
      total_amount_idr: fareBreakdown.value.totalIdr,
      foreign_currency: activeCountry.value.currency,
      foreign_amount: foreignAmount.value,
      payment_channel: activeCountry.value.channel,
      payment_status: 'pending_payment',
      status: 'pending_payment',
      notes: form.notes,
    });

    // Create Xenith Payment Link through backend (FR-3.2)
    let xenithRes = null;
    try {
      xenithRes = await createXenithPaymentLink({
        booking_code: newBooking.booking_code,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        foreign_currency: activeCountry.value.currency,
        foreign_amount: foreignAmount.value,
        payment_channel: activeCountry.value.channel,
        total_amount_idr: fareBreakdown.value.totalIdr,
      });
    } catch (e) {
      console.warn('Using client fallback for payment link', e);
      xenithRes = {
        data: {
          reference: `XEN-${newBooking.booking_code}`,
          currency: activeCountry.value.currency,
          amount: foreignAmount.value,
          paymentChannel: activeCountry.value.channel,
        }
      };
    }

    activeBooking.value = newBooking;
    paymentLinkData.value = xenithRes.data;
    showPaymentModal.value = true;
  } catch (error) {
    console.error('Failed to submit booking:', error);
    alert('Something went wrong. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    
    <!-- Hero Banner -->
    <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4 shadow-sm">
        <Sparkles class="w-3.5 h-3.5 text-brand-400" />
        <span>Hands-Free Bali Travel • 100% Insured Delivery</span>
      </div>
      
      <h1 class="text-3xl sm:text-5xl font-display font-black text-white tracking-tight leading-tight">
        Your Bags Move. <span class="gradient-text-brand">You Explore.</span>
      </h1>
      
      <p class="mt-3.5 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
        Seamless luggage delivery between Ngurah Rai Airport, Sanur Harbour & South Bali villas. Land in Bali, leave your bags with us, and start exploring right away.
      </p>

      <!-- Value Props Pills -->
      <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
        <div class="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <CheckCircle2 class="w-4 h-4 text-brand-400" />
          <span>Flat Bundle: 2 Bags Included</span>
        </div>
        <div class="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <CheckCircle2 class="w-4 h-4 text-ocean-400" />
          <span>Pay in Home Currency (Alipay/GCash)</span>
        </div>
        <div class="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <CheckCircle2 class="w-4 h-4 text-amber-400" />
          <span>Live WhatsApp Status Updates</span>
        </div>
      </div>
    </div>

    <!-- Booking Card Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left Column: Interactive Booking Wizard (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          
          <!-- Subtle Accent Background Glow -->
          <div class="absolute -top-24 -right-24 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <form @submit.prevent="handleBookingSubmit" class="space-y-6 relative">
            
            <!-- Step 1: Select Route Type -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">1</span>
                  Select Delivery Route
                </label>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <!-- Airport -> Hotel -->
                <button
                  type="button"
                  @click="form.route_type = 'airport_to_hotel'"
                  class="p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between"
                  :class="form.route_type === 'airport_to_hotel' ? 'bg-brand-500/15 border-brand-500/60 shadow-glow-brand ring-1 ring-brand-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <Plane class="w-5 h-5 mb-2" :class="form.route_type === 'airport_to_hotel' ? 'text-brand-400' : 'text-slate-400'" />
                  <div>
                    <div class="text-xs font-bold text-white">Airport ➔ Hotel</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Direct from Arrival Gate</div>
                  </div>
                </button>

                <!-- Hotel -> Airport -->
                <button
                  type="button"
                  @click="form.route_type = 'hotel_to_airport'"
                  class="p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between"
                  :class="form.route_type === 'hotel_to_airport' ? 'bg-ocean-500/15 border-ocean-500/60 shadow-glow-ocean ring-1 ring-ocean-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <Hotel class="w-5 h-5 mb-2" :class="form.route_type === 'hotel_to_airport' ? 'text-ocean-400' : 'text-slate-400'" />
                  <div>
                    <div class="text-xs font-bold text-white">Hotel ➔ Airport</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Collect at Departures</div>
                  </div>
                </button>

                <!-- Hotel -> Hotel -->
                <button
                  type="button"
                  @click="form.route_type = 'hotel_to_hotel'"
                  class="p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between"
                  :class="form.route_type === 'hotel_to_hotel' ? 'bg-amber-500/15 border-amber-500/60 shadow-glow-sunset ring-1 ring-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <Luggage class="w-5 h-5 mb-2" :class="form.route_type === 'hotel_to_hotel' ? 'text-amber-400' : 'text-slate-400'" />
                  <div>
                    <div class="text-xs font-bold text-white">Hotel ➔ Hotel</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Between Bali Villas</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Step 2: Hub & Destination Zone -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <!-- Ready Hub Selector -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                  <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">2</span>
                  Transit Hub
                </label>
                <select
                  v-model="selectedBranchId"
                  class="w-full px-3.5 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:border-brand-500 outline-none"
                >
                  <option v-for="b in branches" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </option>
                </select>
                <span class="text-[10px] text-slate-500 mt-1 block">
                  Kuta (Airport) & Sanur (Harbour) hubs ready
                </span>
              </div>

              <!-- Destination Zone Picker -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                  <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">3</span>
                  Destination Zone
                </label>
                <select
                  v-model="selectedZoneId"
                  class="w-full px-3.5 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:border-brand-500 outline-none"
                >
                  <option v-for="z in pricingZones" :key="z.id" :value="z.id">
                    {{ z.zone_name }} (~{{ z.estimated_km }} km)
                  </option>
                </select>
                <span class="text-[10px] text-brand-400 mt-1 block font-medium">
                  Estimated distance: {{ activeZone?.estimated_km || 10 }} km
                </span>
              </div>
            </div>

            <!-- Step 3: Bag Count Stepper (Bundled Pricing Highlight) -->
            <div>
              <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">4</span>
                Luggage Quantity
              </label>

              <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white">Number of Bags:</span>
                    <span class="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold">
                      {{ form.bag_count }} {{ form.bag_count > 1 ? 'Bags' : 'Bag' }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    <span class="text-emerald-400 font-semibold">1–2 Bags Covered</span> by flat Base Fare (Rp {{ (activeZone?.base_fare || 100000).toLocaleString() }}).
                    <span v-if="form.bag_count > 2" class="text-amber-400">
                      +{{ form.bag_count - 2 }} extra bag(s) @ Rp {{ (activeZone?.extra_bag_fee || 30000).toLocaleString() }}/bag.
                    </span>
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    @click="decrementBags"
                    class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span class="text-lg font-bold font-mono text-white w-6 text-center">
                    {{ form.bag_count }}
                  </span>
                  <button
                    type="button"
                    @click="incrementBags"
                    class="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-lg flex items-center justify-center transition-colors shadow-md shadow-brand-500/20"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 4: Tourist Country & Home Payment Method (FR-3.1) -->
            <div>
              <label class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs">5</span>
                Select Your Home Country & Payment Method
              </label>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  v-for="(info, code) in COUNTRY_PAYMENT_MAP"
                  :key="code"
                  type="button"
                  @click="form.customer_country = code"
                  class="p-3 rounded-2xl border text-left transition-all flex flex-col justify-between"
                  :class="form.customer_country === code ? 'bg-gradient-to-br from-slate-900 to-brand-950/40 border-brand-500/80 shadow-glow-brand ring-1 ring-brand-500/60' : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-2xl">{{ info.icon }}</span>
                    <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {{ info.currency }}
                    </span>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-white">{{ info.countryName }}</div>
                    <div class="text-[10px] text-brand-400 font-medium truncate mt-0.5">{{ info.channelDisplayName }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Step 5: Customer Contact & Flight/Hotel Details -->
            <div class="space-y-3.5 pt-2 border-t border-slate-800">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                  <input
                    v-model="form.customer_name"
                    type="text"
                    required
                    placeholder="e.g. Wei Zhang / John Doe"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Number (with Country Code)</label>
                  <input
                    v-model="form.customer_phone"
                    type="tel"
                    required
                    placeholder="+86 / +60 / +63..."
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">
                    {{ form.route_type === 'airport_to_hotel' ? 'Arrival Flight Number' : 'Hotel Name' }}
                  </label>
                  <input
                    v-if="form.route_type === 'airport_to_hotel'"
                    v-model="form.flight_number"
                    type="text"
                    placeholder="e.g. MU 781 / SQ 944"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                  <input
                    v-else
                    v-model="form.hotel_name"
                    type="text"
                    placeholder="e.g. W Bali Seminyak / Maya Sanur"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">
                    {{ form.route_type === 'airport_to_hotel' ? 'Destination Hotel / Villa' : 'Room Number / Booking Name' }}
                  </label>
                  <input
                    v-if="form.route_type === 'airport_to_hotel'"
                    v-model="form.hotel_name"
                    type="text"
                    required
                    placeholder="e.g. Ayana Resort Jimbaran"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                  <input
                    v-else
                    v-model="form.hotel_room"
                    type="text"
                    placeholder="e.g. Villa 214"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <!-- Submit Button (Mobile & Desktop) -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-500 via-emerald-500 to-ocean-500 hover:from-brand-600 hover:to-ocean-600 text-slate-950 font-display font-extrabold text-base shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span>Book & Pay with {{ activeCountry.channel }}</span>
              <ArrowRight class="w-5 h-5" />
            </button>

          </form>

        </div>
      </div>

      <!-- Right Column: Live Fare Summary & Guarantee Card (5 cols) -->
      <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
        
        <!-- Live Price Card (FR-1, FR-3) -->
        <div class="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <h3 class="font-display font-bold text-base text-white flex items-center gap-2">
              <Tag class="w-4 h-4 text-brand-400" />
              Fare Breakdown (IDR & {{ activeCountry.currency }})
            </h3>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
              No Hidden Fees
            </span>
          </div>

          <!-- Formula List -->
          <div class="space-y-3 text-xs text-slate-300">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span>Base Fare (Covers 1–{{ fareBreakdown.includedBags }} Bags)</span>
                <span class="text-[10px] text-slate-500">Flat</span>
              </div>
              <span class="font-mono font-semibold text-white">{{ formatIdr(fareBreakdown.baseFare) }}</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span>Distance Fare ({{ fareBreakdown.distanceKm }} km × {{ formatIdr(fareBreakdown.perKmRate) }})</span>
              </div>
              <span class="font-mono font-semibold text-white">{{ formatIdr(fareBreakdown.distanceFare) }}</span>
            </div>

            <div v-if="fareBreakdown.extraBags > 0" class="flex items-center justify-between text-amber-300">
              <span>Extra Luggage ({{ fareBreakdown.extraBags }} × {{ formatIdr(fareBreakdown.extraBagFee) }})</span>
              <span class="font-mono font-semibold">+{{ formatIdr(fareBreakdown.extraBagFareTotal) }}</span>
            </div>

            <!-- Total Box -->
            <div class="pt-4 border-t border-slate-800 space-y-1.5">
              <div class="flex items-baseline justify-between">
                <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total IDR</span>
                <span class="text-xl font-display font-black text-white font-mono">
                  {{ formatIdr(fareBreakdown.totalIdr) }}
                </span>
              </div>

              <!-- Foreign Currency Box -->
              <div class="p-3.5 rounded-2xl bg-gradient-to-br from-brand-950/80 to-slate-900 border border-brand-500/40 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="text-2xl">{{ activeCountry.icon }}</span>
                  <div>
                    <span class="text-[10px] text-brand-300 uppercase tracking-wider font-bold block">You Pay In {{ activeCountry.currency }}</span>
                    <span class="text-lg sm:text-xl font-display font-extrabold text-brand-400 font-mono">
                      {{ formatCurrency(foreignAmount, activeCountry.currency) }}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-[11px] text-slate-300 font-semibold block">{{ activeCountry.channel }}</span>
                  <span class="text-[10px] text-slate-500">Xenith Direct Rail</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Trust Badges -->
          <div class="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div class="flex items-start gap-2">
              <ShieldCheck class="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <span>Tamper-proof numbered security seals</span>
            </div>
            <div class="flex items-start gap-2">
              <Clock class="w-4 h-4 text-ocean-400 flex-shrink-0 mt-0.5" />
              <span>Real-time WhatsApp notifications</span>
            </div>
          </div>
        </div>

        <!-- How It Works Card -->
        <div class="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">How BagTransit Works in Bali</h4>
          
          <div class="space-y-3 text-xs text-slate-300">
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
              <p><strong class="text-white">Book Online:</strong> Choose your route, bags, and pay in your home currency via Alipay/GCash/PromptPay.</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-ocean-500/20 text-ocean-400 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
              <p><strong class="text-white">Drop Luggage:</strong> Meet our airport counter staff (100m from Ngurah Rai exit) or leave with hotel concierge.</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
              <p><strong class="text-white">Explore Hands-Free:</strong> Your bags are securely delivered to your hotel room with photo verification on WhatsApp.</p>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Xenith Payment Modal -->
    <XenithPaymentModal
      v-if="showPaymentModal && activeBooking"
      :booking="activeBooking"
      :payment-data="paymentLinkData"
      @close="showPaymentModal = false"
      @paid="showPaymentModal = false"
    />

  </div>
</template>
