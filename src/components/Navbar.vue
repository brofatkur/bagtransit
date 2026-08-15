<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth, PRESET_ACCOUNTS } from '../stores/auth.js';
import { MAIN_WHATSAPP } from '../data/destinations.js';
import { 
  Luggage, 
  MapPin, 
  ShieldCheck, 
  UserCircle, 
  LogOut, 
  ArrowRightLeft, 
  Sliders, 
  Search, 
  PlusCircle, 
  Menu, 
  X,
  Sparkles,
  Plane,
  Anchor,
  MessageCircle,
  Phone
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { user, isSuperAdmin, isAdmin, isCustomer, loginWithPreset, logout, currentBranch } = useAuth();

const showRoleMenu = ref(false);
const mobileMenuOpen = ref(false);

function handleSelectRole(presetId) {
  const account = loginWithPreset(presetId);
  showRoleMenu.value = false;
  mobileMenuOpen.value = false;
  if (account.role === 'super_admin') {
    router.push('/super-admin');
  } else if (account.role === 'admin') {
    router.push('/admin');
  } else {
    router.push('/');
  }
}

function handleLogout() {
  logout();
  showRoleMenu.value = false;
  router.push('/');
}
</script>

<template>
  <header class="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 sm:h-20">
        
        <!-- Brand Logo -->
        <router-link to="/" class="flex items-center gap-2.5 sm:gap-3 group">
          <img 
            src="/icons/logo.png" 
            alt="Bali BagMove" 
            class="h-9 sm:h-11 object-contain rounded-lg shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform" 
          />
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-display font-black text-lg sm:text-xl tracking-tight text-white">
                Bali <span class="gradient-text-brand">BagMove</span>
              </span>
              <span class="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/30 hidden sm:inline-block">
                DPS 85 Zones
              </span>
            </div>
            <span class="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide line-clamp-1">
              Enjoy Bali, Luggage-Free.
            </span>
          </div>
        </router-link>

        <!-- Navigation Links -->
        <nav class="hidden md:flex items-center gap-1">
          <router-link
            to="/"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
            :class="route.path === '/' ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'"
          >
            Pricelist & Kalkulator
          </router-link>

          <router-link
            to="/track"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
            :class="route.path === '/track' ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'"
          >
            Lacak Koper
          </router-link>

          <router-link
            v-if="isAdmin || isSuperAdmin"
            to="/admin"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            :class="route.path === '/admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            Branch Ops
          </router-link>

          <router-link
            v-if="isSuperAdmin"
            to="/super-admin"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            :class="route.path === '/super-admin' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'"
          >
            <Sliders class="w-3.5 h-3.5" />
            Super Admin
          </router-link>
        </nav>

        <!-- Right Side: Fast WhatsApp Help & Role Switcher -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <!-- Direct WhatsApp Header Button -->
          <a
            :href="`https://wa.me/${MAIN_WHATSAPP}?text=${encodeURIComponent('Halo Bali Luggage, saya mau tanya layanan pickup & delivery koper.')}`"
            target="_blank"
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-whatsapp-600/20 hover:bg-whatsapp-600/30 text-whatsapp-500 border border-whatsapp-500/40 text-xs font-bold transition-all"
          >
            <MessageCircle class="w-4 h-4 fill-current" />
            <span>WA Center</span>
          </a>

          <!-- Role Switcher -->
          <div class="relative">
            <button
              @click="showRoleMenu = !showRoleMenu"
              class="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-brand-500/50 transition-all text-left"
            >
              <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="{
                  'bg-brand-500/20 text-brand-400': isCustomer,
                  'bg-amber-500/20 text-amber-400': isAdmin,
                  'bg-purple-500/20 text-purple-400': isSuperAdmin
                }"
              >
                <UserCircle class="w-4 h-4" />
              </div>
              <div class="flex flex-col hidden sm:block">
                <span class="text-[11px] font-semibold text-slate-200 line-clamp-1 max-w-[110px]">
                  {{ user?.full_name?.split('(')[0] || 'Customer' }}
                </span>
                <span class="text-[9px] text-slate-400">
                  {{ user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Customer' }}
                </span>
              </div>
              <ArrowRightLeft class="w-3 h-3 text-slate-500" />
            </button>

            <!-- Role Dropdown Menu -->
            <div
              v-if="showRoleMenu"
              class="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl glass-panel bg-slate-900/95 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div class="px-3 py-2 border-b border-slate-800 mb-1.5">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Switch Role Mode</p>
                <p class="text-xs text-slate-500 mt-0.5">Test role permissions live</p>
              </div>

              <div class="space-y-1">
                <button
                  v-for="account in PRESET_ACCOUNTS"
                  :key="account.id"
                  @click="handleSelectRole(account.id)"
                  class="w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 group"
                  :class="user?.id === account.id ? 'bg-brand-500/15 border border-brand-500/30' : 'hover:bg-slate-800/80'"
                >
                  <span class="text-base leading-none mt-0.5">
                    {{ account.role === 'super_admin' ? '👑' : account.role === 'admin' ? (account.cabang_id?.includes('1111') ? '✈️' : '⚓️') : '🧳' }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                        {{ account.badge }}
                      </p>
                      <span v-if="user?.id === account.id" class="text-[9px] text-brand-400 font-bold">ACTIVE</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-1">{{ account.description }}</p>
                  </div>
                </button>
              </div>

              <div class="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between px-2 text-xs">
                <router-link to="/login" @click="showRoleMenu = false" class="text-slate-400 hover:text-white text-[11px]">
                  Semua Login
                </router-link>
                <button @click="handleLogout" class="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium text-[11px]">
                  <LogOut class="w-3 h-3" />
                  Reset Customer
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Hamburger -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Menu v-if="!mobileMenuOpen" class="w-5 h-5" />
            <X v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div v-if="mobileMenuOpen" class="md:hidden glass-panel border-t border-slate-800 px-4 py-4 space-y-2">
      <router-link
        to="/"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-semibold"
        :class="route.path === '/' ? 'bg-brand-500/15 text-brand-400' : 'text-slate-300'"
      >
        Pricelist & Kalkulator
      </router-link>
      <router-link
        to="/track"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-semibold"
        :class="route.path === '/track' ? 'bg-brand-500/15 text-brand-400' : 'text-slate-300'"
      >
        Lacak Koper
      </router-link>
      <router-link
        v-if="isAdmin || isSuperAdmin"
        to="/admin"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-400"
      >
        Branch Operations Dashboard
      </router-link>
      <router-link
        v-if="isSuperAdmin"
        to="/super-admin"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-400"
      >
        Super Admin Executive Dashboard
      </router-link>

      <a
        :href="`https://wa.me/${MAIN_WHATSAPP}`"
        target="_blank"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold text-whatsapp-500 bg-whatsapp-500/10 border border-whatsapp-500/30 text-center"
      >
        Hubungi WhatsApp Center (+62 851-7249-1244)
      </a>
    </div>
  </header>
</template>
