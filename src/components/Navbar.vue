<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth, PRESET_ACCOUNTS } from '../stores/auth.js';
import { MAIN_WHATSAPP } from '../data/destinations.js';
import { 
  ShieldCheck, 
  UserCircle, 
  LogOut, 
  ArrowRightLeft, 
  Sliders, 
  Menu, 
  X,
  MessageCircle,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { user, isSuperAdmin, isAdmin, isCustomer, loginWithPreset, logout } = useAuth();

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
  <header class="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 sm:h-20">
        
        <!-- Brand Logo Image (Crisp & Fully Visible on Light BG) -->
        <router-link to="/" class="flex items-center gap-3 group">
          <img 
            src="/icons/logo.png" 
            alt="Bali BagMove — Enjoy Bali, Luggage-Free." 
            class="h-10 sm:h-12 object-contain hover:scale-[1.02] transition-transform" 
          />
        </router-link>

        <!-- Navigation Links (English) -->
        <nav class="hidden md:flex items-center gap-1.5">
          <router-link
            to="/"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            :class="route.path === '/' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            Pricelist & Calculator
          </router-link>

          <router-link
            to="/track"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            :class="route.path === '/track' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            Track Luggage
          </router-link>

          <router-link
            v-if="isAdmin || isSuperAdmin"
            to="/admin"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            :class="route.path === '/admin' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <ShieldCheck class="w-3.5 h-3.5 text-amber-600" />
            Branch Ops
          </router-link>

          <router-link
            v-if="isSuperAdmin"
            to="/super-admin"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            :class="route.path === '/super-admin' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <Sliders class="w-3.5 h-3.5 text-indigo-600" />
            Super Admin
          </router-link>
        </nav>

        <!-- Right Side: Fast WhatsApp Help & Role Switcher -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <!-- Direct WhatsApp Header Button -->
          <a
            :href="`https://wa.me/${MAIN_WHATSAPP}?text=${encodeURIComponent('Hello Bali BagMove, I have an inquiry about luggage pickup & delivery.')}`"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageCircle class="w-4 h-4 fill-current" />
            <span>WA Center</span>
          </a>

          <!-- Role Switcher -->
          <div class="relative">
            <button
              @click="showRoleMenu = !showRoleMenu"
              class="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 border border-slate-200 hover:border-brand-400 transition-all text-left"
            >
              <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="{
                  'bg-brand-100 text-brand-700': isCustomer,
                  'bg-amber-100 text-amber-700': isAdmin,
                  'bg-purple-100 text-purple-700': isSuperAdmin
                }"
              >
                <UserCircle class="w-4 h-4" />
              </div>
              <div class="flex flex-col hidden sm:block">
                <span class="text-[11px] font-bold text-slate-800 line-clamp-1 max-w-[100px]">
                  {{ user?.full_name?.split('(')[0] || 'Customer' }}
                </span>
                <span class="text-[9px] text-slate-500 font-medium">
                  {{ user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Customer' }}
                </span>
              </div>
              <ArrowRightLeft class="w-3 h-3 text-slate-400" />
            </button>

            <!-- Role Dropdown Menu -->
            <div
              v-if="showRoleMenu"
              class="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div class="px-3 py-2 border-b border-slate-100 mb-1.5">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Switch Role Mode</p>
                <p class="text-xs text-slate-400 mt-0.5">Test role permissions & isolation live</p>
              </div>

              <div class="space-y-1">
                <button
                  v-for="account in PRESET_ACCOUNTS"
                  :key="account.id"
                  @click="handleSelectRole(account.id)"
                  class="w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 group"
                  :class="user?.id === account.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50'"
                >
                  <span class="text-base leading-none mt-0.5">
                    {{ account.role === 'super_admin' ? '👑' : account.role === 'admin' ? (account.cabang_id?.includes('1111') ? '✈️' : '⚓️') : '🧳' }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-bold text-slate-800 group-hover:text-brand-600">
                        {{ account.badge }}
                      </p>
                      <span v-if="user?.id === account.id" class="text-[9px] text-brand-600 font-bold bg-brand-100 px-1.5 py-0.2 rounded">ACTIVE</span>
                    </div>
                    <p class="text-[10px] text-slate-500 mt-0.5 leading-tight line-clamp-1">{{ account.description }}</p>
                  </div>
                </button>
              </div>

              <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-2 text-xs">
                <router-link to="/login" @click="showRoleMenu = false" class="text-slate-500 hover:text-slate-800 text-[11px] font-semibold">
                  All Logins
                </router-link>
                <button @click="handleLogout" class="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold text-[11px]">
                  <LogOut class="w-3 h-3" />
                  Reset Customer
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Hamburger -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
          >
            <Menu v-if="!mobileMenuOpen" class="w-5 h-5" />
            <X v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-lg">
      <router-link
        to="/"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold"
        :class="route.path === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      >
        Pricelist & Calculator
      </router-link>
      <router-link
        to="/track"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold"
        :class="route.path === '/track' ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      >
        Track Luggage
      </router-link>
      <router-link
        v-if="isAdmin || isSuperAdmin"
        to="/admin"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50"
      >
        Branch Operations Dashboard
      </router-link>
      <router-link
        v-if="isSuperAdmin"
        to="/super-admin"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50"
      >
        Super Admin Executive Dashboard
      </router-link>

      <a
        :href="`https://wa.me/${MAIN_WHATSAPP}`"
        target="_blank"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 text-center shadow-md shadow-emerald-600/20"
      >
        WhatsApp Support (+62 851-7249-1244)
      </a>
    </div>
  </header>
</template>
