<script setup>
import { ref, computed, watch } from 'vue';
import { db } from '../../services/db.js';
import { useAuth } from '../../stores/auth.js';
import { formatIdr } from '../../services/pricing.js';
import { formatCurrency, COUNTRY_PAYMENT_MAP } from '../../services/xenith.js';
import StatusUpdateModal from '../../components/StatusUpdateModal.vue';
import ManualBookingModal from '../../components/ManualBookingModal.vue';
import { 
  ShieldCheck, 
  MapPin, 
  Luggage, 
  Truck, 
  UserCheck, 
  PlusCircle, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Sliders, 
  MessageSquare,
  AlertCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Plane,
  Anchor
} from 'lucide-vue-next';

const { user, isSuperAdmin, currentCabangId, currentBranch } = useAuth();

// Branch selection (if super admin can toggle, otherwise locked to admin's branch)
const branches = computed(() => db.getBranches());
const activeBranchId = ref(currentCabangId.value || branches.value[0]?.id || '11111111-1111-1111-1111-111111111111');

watch(currentCabangId, (newId) => {
  if (newId) activeBranchId.value = newId;
});

const activeBranch = computed(() => {
  return db.getBranchById(activeBranchId.value) || branches.value[0];
});

// Bookings filtered strictly to active branch
const branchBookings = computed(() => {
  return db.getBookings({
    role: isSuperAdmin.value ? 'super_admin' : 'admin',
    cabangId: activeBranchId.value,
  }).filter(b => b.cabang_id === activeBranchId.value);
});

// Couriers in active branch
const branchCouriers = computed(() => {
  return db.getCouriers(activeBranchId.value);
});

// Filter & Search
const activeStatusTab = ref('all');
const searchQuery = ref('');

const filteredBookings = computed(() => {
  return branchBookings.value.filter(b => {
    // Status filter
    if (activeStatusTab.value === 'need_action') {
      if (!['pending_payment', 'confirmed', 'assigned'].includes(b.status)) return false;
    } else if (activeStatusTab.value === 'in_transit') {
      if (!['picked_up', 'in_transit'].includes(b.status)) return false;
    } else if (activeStatusTab.value === 'delivered') {
      if (b.status !== 'delivered') return false;
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchCode = b.booking_code.toLowerCase().includes(q);
      const matchName = b.customer_name.toLowerCase().includes(q);
      const matchPhone = b.customer_phone.toLowerCase().includes(q);
      const matchHotel = (b.hotel_name || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchPhone && !matchHotel) return false;
    }

    return true;
  });
});

// Summary Stats for active branch
const branchStats = computed(() => {
  const all = branchBookings.value;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayList = all.filter(b => b.created_at.startsWith(todayStr));
  const paidList = all.filter(b => b.payment_status === 'paid');
  const totalRev = paidList.reduce((sum, b) => sum + (Number(b.total_amount_idr) || 0), 0);

  return {
    totalBookings: all.length,
    todayBookings: todayList.length,
    activeDeliveries: all.filter(b => ['assigned', 'picked_up', 'in_transit'].includes(b.status)).length,
    completed: all.filter(b => b.status === 'delivered').length,
    totalRevenue: totalRev,
    courierCount: branchCouriers.value.length,
  };
});

// Modals
const showStatusModal = ref(false);
const showManualBookingModal = ref(false);
const selectedBookingForUpdate = ref(null);

function openUpdateModal(booking) {
  selectedBookingForUpdate.value = booking;
  showStatusModal.value = true;
}

function handleStatusUpdated() {
  showStatusModal.value = false;
}

function handleBookingCreated() {
  showManualBookingModal.value = false;
}

function getCourierName(courierId) {
  if (!courierId) return 'Belum Ditugaskan';
  const c = db.getCourierById(courierId);
  return c ? `${c.name} (${c.vehicle_plate})` : courierId;
}

function getStatusBadge(status) {
  switch (status) {
    case 'delivered': return { label: 'Selesai (Delivered)', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'in_transit': return { label: 'In Transit', class: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    case 'picked_up': return { label: 'Koper Diambil', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'assigned': return { label: 'Kurir Ditugaskan', class: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
    case 'confirmed': return { label: 'Siap Pickup', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'pending_payment': return { label: 'Menunggu Pembayaran', class: 'bg-slate-700/50 text-slate-300 border-slate-600' };
    default: return { label: status, class: 'bg-slate-800 text-slate-400' };
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
    
    <!-- Top Header & Branch Scope Banner -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card rounded-3xl p-6 border border-slate-800 shadow-xl">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Plane v-if="activeBranch?.hub_type === 'airport'" class="w-6 h-6" />
          <Anchor v-else class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-xl sm:text-2xl font-display font-extrabold text-white">
              {{ activeBranch?.name }}
            </h1>
            <span class="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
              {{ activeBranch?.code }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ activeBranch?.address }} • RLS Branch Boundary Active
          </p>
        </div>
      </div>

      <!-- Actions & Branch Selector for Super Admin -->
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-if="isSuperAdmin"
          v-model="activeBranchId"
          class="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold outline-none focus:border-amber-500"
        >
          <option v-for="b in branches" :key="b.id" :value="b.id">
            Switch: {{ b.name }}
          </option>
        </select>

        <button
          @click="showManualBookingModal = true"
          class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
        >
          <PlusCircle class="w-4 h-4" />
          <span>+ Booking Walk-in / Phone</span>
        </button>
      </div>
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Bookings -->
      <div class="glass-card rounded-2xl p-5 border border-slate-800">
        <div class="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span>Total Booking Cabang</span>
          <Luggage class="w-4 h-4 text-brand-400" />
        </div>
        <div class="text-2xl font-bold font-mono text-white">{{ branchStats.totalBookings }}</div>
        <span class="text-[10px] text-slate-500 mt-1 block">{{ branchStats.todayBookings }} pesanan masuk hari ini</span>
      </div>

      <!-- In Delivery -->
      <div class="glass-card rounded-2xl p-5 border border-slate-800">
        <div class="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span>Sedang Dikirim (Active)</span>
          <Truck class="w-4 h-4 text-cyan-400" />
        </div>
        <div class="text-2xl font-bold font-mono text-cyan-400">{{ branchStats.activeDeliveries }}</div>
        <span class="text-[10px] text-slate-500 mt-1 block">{{ branchStats.courierCount }} armada kurir siaga</span>
      </div>

      <!-- Completed -->
      <div class="glass-card rounded-2xl p-5 border border-slate-800">
        <div class="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span>Terkirim (Delivered)</span>
          <CheckCircle2 class="w-4 h-4 text-emerald-400" />
        </div>
        <div class="text-2xl font-bold font-mono text-emerald-400">{{ branchStats.completed }}</div>
        <span class="text-[10px] text-emerald-500/80 mt-1 block">100% tepat waktu</span>
      </div>

      <!-- Branch Revenue -->
      <div class="glass-card rounded-2xl p-5 border border-slate-800">
        <div class="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span>Omset Cabang (IDR)</span>
          <DollarSign class="w-4 h-4 text-amber-400" />
        </div>
        <div class="text-xl sm:text-2xl font-bold font-mono text-amber-400">{{ formatIdr(branchStats.totalRevenue) }}</div>
        <span class="text-[10px] text-slate-500 mt-1 block">Tersimpan dalam IDR (FR-1.4)</span>
      </div>
    </div>

    <!-- Operational Table & Filters -->
    <div class="glass-card rounded-3xl p-6 border border-slate-800 space-y-5">
      
      <!-- Filters Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <!-- Status Tabs -->
        <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs">
          <button
            @click="activeStatusTab = 'all'"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            :class="activeStatusTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            Semua ({{ branchBookings.length }})
          </button>
          <button
            @click="activeStatusTab = 'need_action'"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            :class="activeStatusTab === 'need_action' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            Perlu Tindakan
          </button>
          <button
            @click="activeStatusTab = 'in_transit'"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            :class="activeStatusTab === 'in_transit' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            Dalam Pengantaran
          </button>
          <button
            @click="activeStatusTab = 'delivered'"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            :class="activeStatusTab === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            Selesai
          </button>
        </div>

        <!-- Search Box -->
        <div class="relative w-full sm:w-64">
          <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode / nama / no HP..."
            class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <!-- Bookings List / Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th class="py-3 px-3">Kode & Tanggal</th>
              <th class="py-3 px-3">Tamu & Kontak</th>
              <th class="py-3 px-3">Rute & Lokasi</th>
              <th class="py-3 px-3">Koper</th>
              <th class="py-3 px-3">Tarif & Bayar</th>
              <th class="py-3 px-3">Kurir Ditugaskan</th>
              <th class="py-3 px-3">Status</th>
              <th class="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="b in filteredBookings"
              :key="b.id"
              class="hover:bg-slate-800/40 transition-colors group"
            >
              <!-- Code & Time -->
              <td class="py-3.5 px-3">
                <span class="font-mono font-bold text-white block">{{ b.booking_code }}</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">
                  {{ new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </td>

              <!-- Customer -->
              <td class="py-3.5 px-3">
                <span class="font-bold text-slate-200 block">{{ b.customer_name }}</span>
                <span class="text-[10px] text-slate-400 block">{{ b.customer_phone }}</span>
                <span class="text-[10px] text-brand-400 font-mono">{{ b.customer_country }}</span>
              </td>

              <!-- Route -->
              <td class="py-3.5 px-3 max-w-[200px]">
                <span class="text-[11px] font-semibold text-slate-300 block truncate">{{ b.pickup_location }}</span>
                <span class="text-[10px] text-slate-500 block truncate">➔ {{ b.dropoff_location }}</span>
              </td>

              <!-- Bags -->
              <td class="py-3.5 px-3">
                <span class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-slate-200">
                  {{ b.bag_count }} Koper
                </span>
              </td>

              <!-- Fare -->
              <td class="py-3.5 px-3 font-mono">
                <span class="font-bold text-white block">{{ formatIdr(b.total_amount_idr) }}</span>
                <span class="text-[10px] text-brand-400 block">{{ b.foreign_currency }} {{ b.foreign_amount }}</span>
              </td>

              <!-- Courier -->
              <td class="py-3.5 px-3">
                <span class="text-slate-300 font-medium block">{{ getCourierName(b.assigned_courier_id) }}</span>
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-3">
                <span
                  class="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-block"
                  :class="getStatusBadge(b.status).class"
                >
                  {{ getStatusBadge(b.status).label }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-3 text-right">
                <button
                  @click="openUpdateModal(b)"
                  class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all inline-flex items-center gap-1"
                >
                  <Truck class="w-3.5 h-3.5" />
                  <span>Update</span>
                </button>
              </td>
            </tr>

            <tr v-if="filteredBookings.length === 0">
              <td colspan="8" class="text-center py-10 text-slate-500">
                Tidak ada pesanan yang sesuai dengan filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- Modals -->
    <StatusUpdateModal
      v-if="showStatusModal && selectedBookingForUpdate"
      :booking="selectedBookingForUpdate"
      :available-couriers="branchCouriers"
      @close="showStatusModal = false"
      @updated="handleStatusUpdated"
    />

    <ManualBookingModal
      v-if="showManualBookingModal"
      :cabang-id="activeBranchId"
      :branch-name="activeBranch?.name"
      @close="showManualBookingModal = false"
      @created="handleBookingCreated"
    />

  </div>
</template>
