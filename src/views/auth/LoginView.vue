<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth, PRESET_ACCOUNTS } from '../../stores/auth.js';
import { 
  Luggage, 
  ShieldCheck, 
  UserCircle, 
  ArrowRight, 
  Key, 
  Mail, 
  CheckCircle2, 
  Sliders,
  Plane,
  Anchor
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { loginWithPreset, loginWithEmail } = useAuth();

const customEmail = ref('');
const errorMessage = ref('');

function selectPreset(presetId) {
  const account = loginWithPreset(presetId);
  const redirect = route.query.redirect;
  if (redirect) {
    router.push(redirect);
    return;
  }
  if (account.role === 'super_admin') {
    router.push('/super-admin');
  } else if (account.role === 'admin') {
    router.push('/admin');
  } else {
    router.push('/');
  }
}

function handleCustomLogin() {
  if (!customEmail.value.trim()) return;
  const account = loginWithEmail(customEmail.value);
  if (account.role === 'super_admin') {
    router.push('/super-admin');
  } else if (account.role === 'admin') {
    router.push('/admin');
  } else {
    router.push('/');
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex items-center justify-center">
    <div class="w-full max-w-xl space-y-8">
      
      <!-- Brand Logo -->
      <div class="text-center space-y-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-ocean-500 p-0.5 shadow-xl shadow-brand-500/20 mx-auto">
          <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Luggage class="w-7 h-7 text-brand-400" />
          </div>
        </div>
        <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white">
          Bag<span class="gradient-text-brand">Transit</span> Portal Login
        </h1>
        <p class="text-xs sm:text-sm text-slate-400">
          Select an authorized account role or sign in with your email
        </p>
      </div>

      <!-- 1-Click Preset Accounts (MVP Developer / Demo Experience) -->
      <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">
            Quick 1-Click Role Login (Fast Test)
          </h2>
          <span class="text-[10px] text-brand-400 font-mono">RLS Enforced</span>
        </div>

        <div class="space-y-3">
          <!-- Super Admin -->
          <button
            @click="selectPreset('99999999-9999-9999-9999-999999999999')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left transition-all group flex items-start justify-between"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 text-lg">
                👑
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white group-hover:text-indigo-300">Asa (Direktur / Super Admin)</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">ALL BRANCHES</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Edit tarif zona, rekap omset, pantau seluruh cabang Bali</p>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors mt-2" />
          </button>

          <!-- Branch Admin Kuta -->
          <button
            @click="selectPreset('88888888-8888-8888-8888-888888888888')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500 text-left transition-all group flex items-start justify-between"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-lg">
                ✈️
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white group-hover:text-amber-300">Budi Santoso (Admin Cabang Kuta)</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">AIRPORT HUB</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Operasional koper Bandara Ngurah Rai, tugaskan kurir, foto bukti</p>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors mt-2" />
          </button>

          <!-- Branch Admin Sanur -->
          <button
            @click="selectPreset('77777777-7777-7777-7777-777777777777')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-ocean-500 text-left transition-all group flex items-start justify-between"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-ocean-500/20 text-ocean-400 flex items-center justify-center flex-shrink-0 text-lg">
                ⚓️
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white group-hover:text-ocean-300">Made Aryana (Admin Cabang Sanur)</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-ocean-500/20 text-ocean-300 font-bold">HARBOUR HUB</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Operasional Pelabuhan Sanur & transfer koper fastboat</p>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-ocean-400 transition-colors mt-2" />
          </button>

          <!-- Tourist -->
          <button
            @click="selectPreset('customer_guest')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-brand-500 text-left transition-all group flex items-start justify-between"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 text-lg">
                🧳
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white group-hover:text-brand-300">Tourist / Guest Customer</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold">PUBLIC</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">Book luggage delivery, pay with Alipay/GCash & live tracking</p>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-brand-400 transition-colors mt-2" />
          </button>
        </div>

        <!-- Custom Email Login -->
        <form @submit.prevent="handleCustomLogin" class="pt-4 border-t border-slate-800 space-y-3">
          <label class="block text-xs font-semibold text-slate-300">Atau Masuk dengan Email</label>
          <div class="flex gap-2">
            <input
              v-model="customEmail"
              type="email"
              placeholder="user@bagtransit.id"
              class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Sign In
            </button>
          </div>
        </form>

      </div>

    </div>
  </div>
</template>
