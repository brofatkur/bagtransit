<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../../services/db.js';
import { formatIdr } from '../../services/pricing.js';
import { formatCurrency, COUNTRY_PAYMENT_MAP } from '../../services/xenith.js';
import { getWhatsAppConciergeLink } from '../../services/whatsapp.js';
import { 
  Search, 
  Luggage, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  Phone, 
  MessageCircle, 
  UserCheck, 
  Image, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const searchQuery = ref('');
const searchedBooking = ref(null);
const statusLogs = ref([]);
const notFound = ref(false);

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Confirmed', desc: 'Payment verified & booking queued' },
  { key: 'assigned', label: 'Courier Assigned', desc: 'Driver dispatched for collection' },
  { key: 'picked_up', label: 'Picked Up', desc: 'Security seals attached & loaded' },
  { key: 'in_transit', label: 'In Transit', desc: 'On the road to destination' },
  { key: 'delivered', label: 'Delivered', desc: 'Safely handed over with photo proof' },
];

function loadBookingByCode(code) {
  if (!code) return;
  const booking = db.getBookingByCode(code.trim());
  if (booking) {
    searchedBooking.value = booking;
    searchQuery.value = booking.booking_code;
    statusLogs.value = db.getStatusLogs(booking.id);
    notFound.value = false;
  } else {
    searchedBooking.value = null;
    notFound.value = true;
  }
}

onMounted(() => {
  const codeParam = route.query.code;
  if (codeParam) {
    loadBookingByCode(codeParam);
  } else {
    // Load default demo booking
    const defaultBooking = db.getBookings()[0];
    if (defaultBooking) {
      loadBookingByCode(defaultBooking.booking_code);
    }
  }
});

watch(() => route.query.code, (newCode) => {
  if (newCode) loadBookingByCode(newCode);
});

function handleSearch() {
  if (!searchQuery.value.trim()) return;
  loadBookingByCode(searchQuery.value.trim());
  router.replace({ query: { code: searchQuery.value.trim() } });
}

const assignedCourier = computed(() => {
  if (!searchedBooking.value?.assigned_courier_id) return null;
  return db.getCourierById(searchedBooking.value.assigned_courier_id);
});

const currentStepIndex = computed(() => {
  if (!searchedBooking.value) return 0;
  const status = searchedBooking.value.status;
  if (status === 'pending_payment') return -1;
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx !== -1 ? idx : 0;
});

function getStatusBadgeColor(status) {
  switch (status) {
    case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'in_transit': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'picked_up': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'assigned': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoStr;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
    
    <!-- Top Search Header -->
    <div class="text-center max-w-2xl mx-auto mb-8">
      <h1 class="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">
        Live Luggage <span class="gradient-text-brand">Tracking</span>
      </h1>
      <p class="mt-2 text-xs sm:text-sm text-slate-500">
        Enter your Bali BagMove Booking Code to track real-time delivery status, courier info, and photo proof.
      </p>

      <!-- Search Bar -->
      <form @submit.prevent="handleSearch" class="mt-6 flex items-center gap-2 max-w-md mx-auto">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="e.g. BT-20260812-7891"
            class="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-brand-500 text-sm text-slate-900 font-mono uppercase tracking-wider outline-none shadow-sm"
          />
        </div>
        <button
          type="submit"
          class="px-5 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-colors flex items-center gap-1.5"
        >
          <span>Track</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </form>

      <!-- Quick Demo Code Pills -->
      <div class="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span>Try Demo:</span>
        <button
          v-for="demoCode in ['BT-20260812-7891', 'BT-20260812-4521', 'BT-20260812-9904']"
          :key="demoCode"
          @click="loadBookingByCode(demoCode)"
          class="text-brand-600 hover:underline font-mono font-semibold"
        >
          {{ demoCode.split('-')[2] }}
        </button>
      </div>
    </div>

    <!-- Booking Not Found -->
    <div
      v-if="notFound"
      class="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-sm"
    >
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
        <AlertCircle class="w-6 h-6" />
      </div>
      <h3 class="text-base font-bold text-slate-900">Booking Not Found</h3>
      <p class="text-xs text-slate-500">
        No booking matched "<strong class="text-slate-800">{{ searchQuery }}</strong>". Please double check your booking code from your confirmation WhatsApp message.
      </p>
      <a
        :href="getWhatsAppConciergeLink(searchQuery)"
        target="_blank"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
      >
        <MessageCircle class="w-4 h-4" />
        Ask WhatsApp Support
      </a>
    </div>

    <!-- Active Booking Tracking View -->
    <div v-else-if="searchedBooking" class="space-y-6">
      
      <!-- Top Overview Header Card -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-3">
              <span class="font-mono text-lg sm:text-xl font-black text-slate-900 tracking-wide">
                {{ searchedBooking.booking_code }}
              </span>
              <span
                class="text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider"
                :class="getStatusBadgeColor(searchedBooking.status)"
              >
                {{ searchedBooking.status.replace('_', ' ') }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Guest: <strong class="text-slate-800">{{ searchedBooking.customer_name }}</strong> • {{ searchedBooking.customer_phone }}
            </p>
          </div>

          <!-- WhatsApp Support Button -->
          <a
            :href="getWhatsAppConciergeLink(searchedBooking.booking_code)"
            target="_blank"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-colors self-start sm:self-auto"
          >
            <MessageCircle class="w-4 h-4 fill-current" />
            <span>Chat CS on WhatsApp</span>
          </a>
        </div>

        <!-- Route & Details Row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
          <!-- From -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Pickup Location</span>
            <div class="text-slate-900 font-medium flex items-start gap-2">
              <MapPin class="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <span>{{ searchedBooking.pickup_location }}</span>
            </div>
          </div>

          <!-- To -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Destination</span>
            <div class="text-slate-900 font-medium flex items-start gap-2">
              <MapPin class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{{ searchedBooking.dropoff_location }}</span>
            </div>
          </div>

          <!-- Luggage & Paid -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Luggage & Amount</span>
            <div class="flex items-center justify-between">
              <span class="text-slate-900 font-semibold flex items-center gap-1.5">
                <Luggage class="w-4 h-4 text-amber-600" />
                {{ searchedBooking.bag_count }} Bag(s)
              </span>
              <span class="font-mono text-brand-700 font-bold">
                {{ formatIdr(searchedBooking.total_amount_idr) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Visual Progress Timeline -->
        <div class="mt-8 pt-8 border-t border-slate-100">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-6">Delivery Progress</h3>
          
          <div class="relative">
            <!-- Line Background -->
            <div class="hidden sm:block absolute top-1/2 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
            
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
              <div
                v-for="(step, idx) in STATUS_STEPS"
                :key="step.key"
                class="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2"
              >
                <!-- Dot / Check -->
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  :class="idx <= currentStepIndex ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 ring-4 ring-white' : 'bg-slate-100 border border-slate-300 text-slate-400'"
                >
                  <CheckCircle2 v-if="idx <= currentStepIndex" class="w-5 h-5" />
                  <span v-else>{{ idx + 1 }}</span>
                </div>

                <!-- Label -->
                <div>
                  <p class="text-xs font-bold" :class="idx <= currentStepIndex ? 'text-slate-900' : 'text-slate-400'">
                    {{ step.label }}
                  </p>
                  <p class="text-[10px] text-slate-500 hidden sm:block mt-0.5">{{ step.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Courier & Proof Photo Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Courier Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <UserCheck class="w-4 h-4 text-brand-600" />
              Assigned Courier & Vehicle
            </h4>
            <span v-if="assignedCourier" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Verified Driver
            </span>
          </div>

          <div v-if="assignedCourier" class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-2xl font-bold text-white shadow-md shadow-brand-500/20">
              {{ assignedCourier.name.charAt(0) }}
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-900">{{ assignedCourier.name }}</span>
                <span class="text-xs text-amber-500 font-semibold">★ {{ assignedCourier.rating }}</span>
              </div>
              <p class="text-xs text-slate-500">
                {{ assignedCourier.vehicle_type }} • <span class="font-mono text-slate-800 font-semibold">{{ assignedCourier.vehicle_plate }}</span>
              </p>
              <p class="text-xs text-brand-600 font-medium">{{ assignedCourier.phone }}</p>
            </div>
          </div>

          <div v-else class="text-center py-6 text-slate-400 text-xs">
            <Clock class="w-6 h-6 mx-auto mb-2 opacity-50 text-slate-300" />
            <span>Courier will be assigned shortly by branch dispatch.</span>
          </div>
        </div>

        <!-- Delivery Proof Photo -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Image class="w-4 h-4 text-brand-600" />
              Verified Luggage Proof Photos
            </h4>
            <span class="text-[10px] text-slate-500">Tamper-Proof Seals</span>
          </div>

          <div v-if="statusLogs.some(l => l.proof_photo_url)" class="space-y-3">
            <div
              v-for="log in statusLogs.filter(l => l.proof_photo_url)"
              :key="log.id"
              class="relative rounded-2xl overflow-hidden border border-slate-200 group"
            >
              <img :src="log.proof_photo_url" alt="Delivery Proof" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-3.5">
                <div class="text-xs text-white">
                  <span class="font-bold capitalize">{{ log.new_status.replace('_', ' ') }} Photo Proof</span>
                  <span class="text-[10px] text-slate-200 block">{{ formatDate(log.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-6 text-slate-400 text-xs">
            <Luggage class="w-6 h-6 mx-auto mb-2 opacity-50 text-slate-300" />
            <span>Photos of luggage with tamper seals will appear here upon collection & delivery.</span>
          </div>
        </div>

      </div>

      <!-- Status Audit History Timeline -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Clock class="w-4 h-4 text-slate-400" />
          Event & WhatsApp Notification Log
        </h4>

        <div class="space-y-2.5">
          <div
            v-for="log in statusLogs"
            :key="log.id"
            class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between text-xs"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 capitalize">{{ log.new_status.replace('_', ' ') }}</span>
                <span v-if="log.whatsapp_sent" class="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  WhatsApp Sent
                </span>
              </div>
              <p class="text-slate-600 text-[11px]">{{ log.notes }}</p>
            </div>
            <span class="text-[10px] text-slate-500 font-mono">{{ formatDate(log.created_at) }}</span>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
