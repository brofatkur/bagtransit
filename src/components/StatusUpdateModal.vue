<script setup>
import { ref, reactive, computed } from 'vue';
import { db } from '../services/db.js';
import { useAuth } from '../stores/auth.js';
import { 
  X, 
  Send, 
  Camera, 
  CheckCircle, 
  Truck, 
  UserCheck, 
  Image, 
  AlertCircle,
  MessageSquare,
  Sparkles
} from 'lucide-vue-next';

const props = defineProps({
  booking: {
    type: Object,
    required: true,
  },
  availableCouriers: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'updated']);
const { user } = useAuth();

const nextStatus = ref(getRecommendedNextStatus(props.booking.status));
const selectedCourierId = ref(props.booking.assigned_courier_id || (props.availableCouriers[0]?.id || ''));
const proofPhotoUrl = ref('');
const operationalNotes = ref('');
const isSubmitting = ref(false);

const SAMPLE_PROOF_PHOTOS = [
  {
    name: 'Airport Arrival Luggage Collection',
    url: 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Hotel Concierge Handover',
    url: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Security Seals Attached',
    url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
  },
];

function getRecommendedNextStatus(current) {
  if (current === 'pending_payment') return 'confirmed';
  if (current === 'confirmed') return 'assigned';
  if (current === 'assigned') return 'picked_up';
  if (current === 'picked_up') return 'in_transit';
  if (current === 'in_transit') return 'delivered';
  return current;
}

function selectSamplePhoto(url) {
  proofPhotoUrl.value = url;
}

async function handleUpdate() {
  isSubmitting.value = true;
  try {
    const res = await db.updateBookingStatus(props.booking.id, nextStatus.value, {
      actorId: user.value?.id || 'admin',
      actorRole: user.value?.role || 'admin',
      courierId: selectedCourierId.value || props.booking.assigned_courier_id,
      proofPhotoUrl: proofPhotoUrl.value || null,
      notes: operationalNotes.value || `Updated status to ${nextStatus.value}`,
    });

    emit('updated', res);
    emit('close');
  } catch (err) {
    console.error('Failed to update status', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
    <div class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="p-5 sm:p-6 bg-gradient-to-br from-amber-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Truck class="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Update Status & Dispatch (FR-5.3)</h3>
            <p class="text-xs text-slate-400">
              Kode: <span class="font-mono text-amber-300 font-semibold">{{ booking.booking_code }}</span> • {{ booking.customer_name }}
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

      <!-- Form -->
      <form @submit.prevent="handleUpdate" class="p-6 space-y-5">
        
        <!-- Status Transition Selector -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Status Baru</label>
          <select
            v-model="nextStatus"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm text-white font-medium outline-none"
          >
            <option value="confirmed">🎉 Booking Confirmed (Sudah Bayar)</option>
            <option value="assigned">🛵 Courier Assigned (Kurir Ditugaskan)</option>
            <option value="picked_up">🧳 Luggage Picked Up (Koper Telah Diambil)</option>
            <option value="in_transit">🚚 In Transit (Dalam Perjalanan ke Tujuan)</option>
            <option value="delivered">✅ Delivered (Telah Diterima Concierge / Customer)</option>
            <option value="cancelled">❌ Cancelled (Dibatalkan)</option>
          </select>
        </div>

        <!-- Courier Assignment -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Kurir Armada Cabang</label>
          <select
            v-model="selectedCourierId"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm text-white font-medium outline-none"
          >
            <option value="">-- Belum Ditugaskan --</option>
            <option v-for="c in availableCouriers" :key="c.id" :value="c.id">
              {{ c.name }} • {{ c.vehicle_type }} ({{ c.vehicle_plate }})
            </option>
          </select>
        </div>

        <!-- Proof Photo Section -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">
            Foto Bukti Serah Terima / Pickup (Opsional)
          </label>
          
          <input
            v-model="proofPhotoUrl"
            type="url"
            placeholder="https://..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs font-mono text-slate-200 outline-none mb-2"
          />

          <!-- Quick Sample Photos -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              v-for="photo in SAMPLE_PROOF_PHOTOS"
              :key="photo.name"
              type="button"
              @click="selectSamplePhoto(photo.url)"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap"
              :class="proofPhotoUrl === photo.url ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
            >
              📸 {{ photo.name }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Catatan Operasional</label>
          <textarea
            v-model="operationalNotes"
            rows="2"
            placeholder="Contoh: Nomor segel keamanan #BT-102 & #BT-103 terpasang rapi."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-white outline-none"
          ></textarea>
        </div>

        <!-- WhatsApp Dispatch Notice -->
        <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
          <MessageSquare class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div class="text-[11px] text-emerald-300 leading-relaxed">
            <strong class="font-semibold text-emerald-200">WhatsApp Notification:</strong> Pesan update dalam bahasa Inggris otomatis dikirim ke <strong>{{ booking.customer_phone }}</strong> saat status disimpan.
          </div>
        </div>

        <!-- Actions -->
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
            class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Send class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Memproses...' : 'Update & Kirim WhatsApp' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
