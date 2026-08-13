<script setup>
import { ref, reactive, computed } from 'vue';
import { db } from '../services/db.js';
import { calculateFare, formatIdr } from '../services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, formatCurrency } from '../services/xenith.js';
import { useAuth } from '../stores/auth.js';
import { 
  X, 
  PlusCircle, 
  Luggage, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  DollarSign,
  CheckCircle2
} from 'lucide-vue-next';

const props = defineProps({
  cabangId: {
    type: String,
    required: true,
  },
  branchName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'created']);
const { user } = useAuth();

const availableZones = computed(() => {
  return db.getPricingZones(props.cabangId);
});

const form = reactive({
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  customer_country: 'CN',
  route_type: 'airport_to_hotel',
  pricing_zone_id: availableZones.value[0]?.id || '',
  pickup_location: '',
  dropoff_location: '',
  flight_number: '',
  hotel_name: '',
  hotel_room: '',
  bag_count: 2,
  payment_channel: 'Cash / On-Site QRIS',
  payment_status: 'paid',
  status: 'confirmed',
  notes: 'Manual Walk-in / Phone reservation',
});

// Set default locations on route change
function handleRouteChange() {
  if (form.route_type === 'airport_to_hotel') {
    form.pickup_location = 'Ngurah Rai Airport (DPS) Arrival Hall';
    form.dropoff_location = 'Hotel / Villa in ' + (selectedZone.value?.zone_name || 'Bali');
  } else if (form.route_type === 'hotel_to_airport') {
    form.pickup_location = 'Hotel / Villa in ' + (selectedZone.value?.zone_name || 'Bali');
    form.dropoff_location = 'Ngurah Rai Airport (DPS) Departure Hall';
  } else {
    form.pickup_location = 'Hotel A';
    form.dropoff_location = 'Hotel B';
  }
}

const selectedZone = computed(() => {
  return availableZones.value.find(z => z.id === form.pricing_zone_id) || availableZones.value[0];
});

const fareBreakdown = computed(() => {
  const zone = selectedZone.value;
  return calculateFare({
    distanceKm: zone?.estimated_km || 10,
    bagCount: form.bag_count,
    customRates: zone,
  });
});

const foreignCurrency = computed(() => {
  return COUNTRY_PAYMENT_MAP[form.customer_country]?.currency || 'CNY';
});

const foreignAmount = computed(() => {
  return convertIdrToCurrency(fareBreakdown.value.totalIdr, foreignCurrency.value);
});

const isSubmitting = ref(false);

async function handleCreate() {
  isSubmitting.value = true;
  try {
    const booking = db.createBooking({
      cabang_id: props.cabangId,
      pricing_zone_id: selectedZone.value?.id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      customer_country: form.customer_country,
      route_type: form.route_type,
      pickup_location: form.pickup_location || 'Customer Pickup Point',
      pickup_datetime: new Date().toISOString(),
      dropoff_location: form.dropoff_location || 'Customer Destination',
      flight_number: form.flight_number,
      hotel_name: form.hotel_name,
      hotel_room: form.hotel_room,
      hotel_booking_name: form.customer_name,
      bag_count: Number(form.bag_count),
      price_breakdown: fareBreakdown.value,
      total_amount_idr: fareBreakdown.value.totalIdr,
      foreign_currency: foreignCurrency.value,
      foreign_amount: foreignAmount.value,
      payment_channel: form.payment_channel,
      payment_status: form.payment_status,
      status: form.status,
      notes: form.notes,
    });

    emit('created', booking);
    emit('close');
  } catch (err) {
    console.error('Failed to create manual booking:', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
    <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="p-5 sm:p-6 bg-gradient-to-br from-brand-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <PlusCircle class="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Buat Booking Walk-in / Manual</h3>
            <p class="text-xs text-slate-400">
              Cabang: <span class="text-brand-300 font-semibold">{{ branchName }}</span>
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleCreate" class="p-6 overflow-y-auto space-y-4 flex-1">
        
        <!-- Customer Info -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Nama Tamu</label>
            <input
              v-model="form.customer_name"
              type="text"
              required
              placeholder="e.g. John Doe"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">No. WhatsApp</label>
            <input
              v-model="form.customer_phone"
              type="tel"
              required
              placeholder="+62 / +86..."
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Asal Negara</label>
            <select
              v-model="form.customer_country"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            >
              <option v-for="(info, code) in COUNTRY_PAYMENT_MAP" :key="code" :value="code">
                {{ info.icon }} {{ info.countryName }} ({{ info.currency }})
              </option>
            </select>
          </div>
        </div>

        <!-- Route & Zone -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Tipe Rute</label>
            <select
              v-model="form.route_type"
              @change="handleRouteChange"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            >
              <option value="airport_to_hotel">✈️ Airport ➔ Hotel / Villa</option>
              <option value="hotel_to_airport">🏨 Hotel / Villa ➔ Airport</option>
              <option value="hotel_to_hotel">🧳 Hotel ➔ Hotel</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Zona Tujuan / Asal</label>
            <select
              v-model="form.pricing_zone_id"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            >
              <option v-for="z in availableZones" :key="z.id" :value="z.id">
                {{ z.zone_name }} (~{{ z.estimated_km }} km)
              </option>
            </select>
          </div>
        </div>

        <!-- Locations -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Lokasi Jemput (Pickup)</label>
            <input
              v-model="form.pickup_location"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Lokasi Antar (Dropoff)</label>
            <input
              v-model="form.dropoff_location"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <!-- Bag Count & Payment Method -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Jumlah Koper</label>
            <input
              v-model.number="form.bag_count"
              type="number"
              min="1"
              max="20"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Metode Bayar</label>
            <select
              v-model="form.payment_channel"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            >
              <option value="Cash / On-Site">💵 Cash di Counter</option>
              <option value="QRIS / EDC">📱 QRIS / EDC</option>
              <option value="Xenith Pay Online">🌐 Xenith Pay Online</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Status Awal</label>
            <select
              v-model="form.status"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            >
              <option value="confirmed">Confirmed</option>
              <option value="picked_up">Picked Up (Di Counter)</option>
              <option value="pending_payment">Pending Payment</option>
            </select>
          </div>
        </div>

        <!-- Live Total Breakdown -->
        <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span class="text-[11px] text-slate-400">Total Tarif IDR:</span>
            <div class="text-base font-bold text-brand-400 font-mono">{{ formatIdr(fareBreakdown.totalIdr) }}</div>
          </div>
          <div class="text-right">
            <span class="text-[11px] text-slate-400">Foreign Equiv:</span>
            <div class="text-xs font-bold text-white font-mono">{{ formatCurrency(foreignAmount, foreignCurrency) }}</div>
          </div>
        </div>

        <!-- Submit Buttons -->
        <div class="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Buat Booking Sekarang' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
