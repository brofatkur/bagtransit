<script setup>
import { ref, reactive, computed } from 'vue';
import { db } from '../services/db.js';
import { formatIdr } from '../services/pricing.js';
import { 
  X, 
  Save, 
  Sliders, 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Layers, 
  CheckCircle2,
  AlertTriangle 
} from 'lucide-vue-next';

const props = defineProps({
  zone: {
    type: Object,
    required: true,
  },
  branchName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'saved']);

const form = reactive({
  zone_name: props.zone.zone_name,
  base_fare: props.zone.base_fare,
  per_km_rate: props.zone.per_km_rate,
  extra_bag_fee: props.zone.extra_bag_fee,
  included_bags: props.zone.included_bags,
  estimated_km: props.zone.estimated_km,
  is_active: props.zone.is_active,
});

const isSaving = ref(false);
const showSuccess = ref(false);

// Live preview calculation for standard 2 bags vs 4 bags
const preview2Bags = computed(() => {
  return Number(form.base_fare) + (Number(form.estimated_km) * Number(form.per_km_rate));
});

const preview4Bags = computed(() => {
  const extra = Math.max(0, 4 - Number(form.included_bags));
  return preview2Bags.value + (extra * Number(form.extra_bag_fee));
});

async function handleSave() {
  isSaving.value = true;
  try {
    const updated = db.updatePricingZone(props.zone.id, {
      zone_name: form.zone_name,
      base_fare: Number(form.base_fare),
      per_km_rate: Number(form.per_km_rate),
      extra_bag_fee: Number(form.extra_bag_fee),
      included_bags: Number(form.included_bags),
      estimated_km: Number(form.estimated_km),
      is_active: Boolean(form.is_active),
    });

    showSuccess.value = true;
    setTimeout(() => {
      emit('saved', updated);
      emit('close');
    }, 900);
  } catch (e) {
    console.error('Failed to update zone rates', e);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
    <div class="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 bg-gradient-to-br from-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Sliders class="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Edit Tarif Zone (FR-5.2)</h3>
            <p class="text-xs text-slate-400">
              {{ branchName }} • <span class="text-indigo-300 font-semibold">{{ form.zone_name }}</span>
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

      <!-- Modal Body -->
      <form @submit.prevent="handleSave" class="p-6 space-y-5">
        
        <div v-if="showSuccess" class="p-4 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center gap-3 text-brand-300">
          <CheckCircle2 class="w-5 h-5 text-brand-400 flex-shrink-0" />
          <p class="text-xs font-semibold">Tarif berhasil diperbarui & langsung aktif di booking baru!</p>
        </div>

        <!-- Zone Name & Distance -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Nama Zona</label>
            <input
              v-model="form.zone_name"
              type="text"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white font-medium outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Estimasi Jarak (KM)</label>
            <input
              v-model.number="form.estimated_km"
              type="number"
              step="0.1"
              min="0"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white font-medium outline-none"
            />
          </div>
        </div>

        <!-- Rate Inputs -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <!-- Base Fare -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">Base Fare (IDR)</label>
            <input
              v-model.number="form.base_fare"
              type="number"
              step="5000"
              min="0"
              required
              class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-mono font-semibold text-white outline-none"
            />
            <span class="text-[10px] text-slate-500 mt-1 block">Cover 1-{{ form.included_bags }} koper</span>
          </div>

          <!-- Per KM Rate -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">Per-KM Rate (IDR)</label>
            <input
              v-model.number="form.per_km_rate"
              type="number"
              step="1000"
              min="0"
              required
              class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-mono font-semibold text-white outline-none"
            />
            <span class="text-[10px] text-slate-500 mt-1 block">Tarif per kilometer</span>
          </div>

          <!-- Extra Bag Fee -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">Extra Bag Fee (IDR)</label>
            <input
              v-model.number="form.extra_bag_fee"
              type="number"
              step="5000"
              min="0"
              required
              class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-mono font-semibold text-white outline-none"
            />
            <span class="text-[10px] text-slate-500 mt-1 block">Per koper tambahan</span>
          </div>
        </div>

        <!-- Live Preview Card -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Simulasi Booking 2 Koper (Bundle Standar):</span>
            <strong class="text-white font-mono">{{ formatIdr(preview2Bags) }}</strong>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Simulasi Booking 4 Koper (Bundle + 2 Extra):</span>
            <strong class="text-brand-400 font-mono">{{ formatIdr(preview4Bags) }}</strong>
          </div>
          <div class="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
            Formula: Base ({{ formatIdr(form.base_fare) }}) + [{{ form.estimated_km }}km × {{ formatIdr(form.per_km_rate) }}] + [Extra Bags × {{ formatIdr(form.extra_bag_fee) }}]
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
            :disabled="isSaving"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save class="w-4 h-4" />
            <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan Tarif' }}</span>
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
