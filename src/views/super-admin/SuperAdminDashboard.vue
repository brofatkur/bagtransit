<script setup>
import { ref, computed } from 'vue';
import { db } from '../../services/db.js';
import { formatIdr } from '../../services/pricing.js';
import { formatCurrency } from '../../services/xenith.js';
import PricingEditorModal from '../../components/PricingEditorModal.vue';
import { 
  Sliders, 
  TrendingUp, 
  DollarSign, 
  Luggage, 
  Building, 
  Truck, 
  Edit3, 
  MapPin, 
  MessageSquare, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  Plane,
  Anchor
} from 'lucide-vue-next';

// Data sources
const branches = computed(() => db.getBranches());
const selectedBranchFilter = ref('all');
const allPricingZones = computed(() => db.getPricingZones());
const allBookings = computed(() => db.getBookings({ role: 'super_admin' }));
const allCouriers = computed(() => db.getCouriers());

// Filtered pricing zones
const filteredZones = computed(() => {
  if (selectedBranchFilter.value === 'all') return allPricingZones.value;
  return allPricingZones.value.filter(z => z.cabang_id === selectedBranchFilter.value);
});

// Aggregate Platform Metrics
const stats = computed(() => {
  const all = allBookings.value;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayList = all.filter(b => b.created_at.startsWith(todayStr));
  const paidList = all.filter(b => b.payment_status === 'paid');
  const totalRevenue = paidList.reduce((sum, b) => sum + (Number(b.total_amount_idr) || 0), 0);

  return {
    totalRevenue,
    totalBookings: all.length,
    todayBookingsCount: todayList.length,
    activeCouriersCount: allCouriers.value.length,
    branchesCount: branches.value.length,
    activeDeliveriesCount: all.filter(b => ['assigned', 'picked_up', 'in_transit'].includes(b.status)).length,
  };
});

// Pricing Editor Modal state
const showPricingModal = ref(false);
const selectedZoneForEdit = ref(null);

function openEditZoneModal(zone) {
  selectedZoneForEdit.value = zone;
  showPricingModal.value = true;
}

function handleZoneSaved() {
  showPricingModal.value = false;
}

function getBranchName(cabangId) {
  const b = db.getBranchById(cabangId);
  return b?.name || cabangId;
}

function resetPlatformData() {
  if (confirm('Reset seluruh data platform ke seed awal? Ini berguna untuk demo ulang.')) {
    db.resetToDefaults();
    window.location.reload();
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
    
    <!-- Executive Header Banner -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Sliders class="w-7 h-7" />
        </div>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl sm:text-3xl font-display font-extrabold text-white">
              Super Admin Executive Dashboard
            </h1>
            <span class="text-xs uppercase font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Asa • Direktur PT Benlaris
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Manajemen tarif multi-cabang, rekapitulasi omset & operasional seluruh Bali.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="resetPlatformData"
          class="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw class="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </div>

    <!-- Aggregate KPIs Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Total Revenue -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs">
          <span>Total Omset (IDR)</span>
          <div class="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <DollarSign class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black font-display text-white font-mono">
          {{ formatIdr(stats.totalRevenue) }}
        </div>
        <div class="text-[11px] text-emerald-400 flex items-center gap-1">
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Semua pesanan lunas terverifikasi</span>
        </div>
      </div>

      <!-- Total Bookings -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs">
          <span>Total Pesanan Platform</span>
          <div class="p-2 rounded-xl bg-brand-500/10 text-brand-400">
            <Luggage class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black font-display text-white font-mono">
          {{ stats.totalBookings }}
        </div>
        <div class="text-[11px] text-slate-400">
          <span class="text-brand-400 font-bold">{{ stats.todayBookingsCount }}</span> masuk hari ini
        </div>
      </div>

      <!-- Active Branches -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs">
          <span>Cabang Hub Siaga</span>
          <div class="p-2 rounded-xl bg-ocean-500/10 text-ocean-400">
            <Building class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black font-display text-ocean-400 font-mono">
          {{ stats.branchesCount }}
        </div>
        <div class="text-[11px] text-slate-400">
          Kuta Airport & Sanur Harbour Ready
        </div>
      </div>

      <!-- Active Couriers -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs">
          <span>Armada Kurir Siaga</span>
          <div class="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Truck class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black font-display text-purple-400 font-mono">
          {{ stats.activeCouriersCount }}
        </div>
        <div class="text-[11px] text-purple-300">
          {{ stats.activeDeliveriesCount }} koper sedang di perjalanan
        </div>
      </div>

    </div>

    <!-- Section: Dynamic Pricing Zones Manager (FR-5.2) -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Sliders class="w-5 h-5 text-indigo-400" />
              Kelola Tarif Zona & Cabang (FR-5.2)
            </h2>
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Live No-Deploy
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Ubah Base Fare, Tarif Per-KM, dan Biaya Extra Bag. Perubahan langsung aktif di perhitungan booking baru.
          </p>
        </div>

        <!-- Branch Filter -->
        <select
          v-model="selectedBranchFilter"
          class="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold outline-none focus:border-indigo-500"
        >
          <option value="all">Semua Cabang ({{ branches.length }})</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>
      </div>

      <!-- Pricing Zones Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="zone in filteredZones"
          :key="zone.id"
          class="glass-card-interactive rounded-2xl p-5 border border-slate-800 space-y-3.5 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 class="text-sm font-bold text-white">{{ zone.zone_name }}</h3>
                <span class="text-[10px] text-indigo-300 font-semibold block">
                  {{ getBranchName(zone.cabang_id)?.split('(')[0] }}
                </span>
              </div>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                ~{{ zone.estimated_km }} KM
              </span>
            </div>

            <!-- Rates Grid -->
            <div class="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Base Fare (1-{{ zone.included_bags }} koper):</span>
                <strong class="font-mono text-white">{{ formatIdr(zone.base_fare) }}</strong>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Tarif / KM:</span>
                <strong class="font-mono text-white">{{ formatIdr(zone.per_km_rate) }}</strong>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Extra Bag Fee:</span>
                <strong class="font-mono text-amber-400">{{ formatIdr(zone.extra_bag_fee) }}</strong>
              </div>
            </div>
          </div>

          <!-- Edit Button -->
          <button
            @click="openEditZoneModal(zone)"
            class="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>Edit Tarif Zona Ini</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Section: Ready Hubs Status -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="b in branches"
        :key="b.id"
        class="glass-card rounded-3xl p-6 border border-slate-800 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-brand-400">
            <Plane v-if="b.hub_type === 'airport'" class="w-5 h-5" />
            <Anchor v-else-if="b.hub_type === 'harbour'" class="w-5 h-5 text-ocean-400" />
            <Building v-else class="w-5 h-5 text-amber-400" />
          </div>
          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Ready & Active
          </span>
        </div>

        <div>
          <h3 class="text-sm font-bold text-white">{{ b.name }}</h3>
          <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ b.address }}</p>
        </div>

        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Kontak Hub:</span>
          <span class="font-mono text-white font-semibold">{{ b.phone }}</span>
        </div>
      </div>
    </div>

    <!-- Pricing Editor Modal -->
    <PricingEditorModal
      v-if="showPricingModal && selectedZoneForEdit"
      :zone="selectedZoneForEdit"
      :branch-name="getBranchName(selectedZoneForEdit.cabang_id)"
      @close="showPricingModal = false"
      @saved="handleZoneSaved"
    />

  </div>
</template>
