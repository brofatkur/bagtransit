<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { MAIN_WHATSAPP } from '../data/destinations.js';
import { currentLocale, setLocale, t } from '../i18n/index.js';
import { 
  Menu, 
  X,
  MessageCircle,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const mobileMenuOpen = ref(false);
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

        <!-- Customer Navigation Links (Only Pricelist & Track Luggage - Admin buttons removed) -->
        <nav class="hidden md:flex items-center gap-2">
          <router-link
            to="/"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            :class="route.path === '/' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            {{ t('navPricelist') }}
          </router-link>

          <router-link
            to="/track"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            :class="route.path === '/track' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            {{ t('navTrack') }}
          </router-link>
        </nav>

        <!-- Right Side: Language Switcher (EN / ZH Mandarin) & WhatsApp CS -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <!-- LANGUAGE SWITCHER (EN / ZH Mandarin ONLY - NO Indonesian) -->
          <div class="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
            <button
              type="button"
              @click="setLocale('en')"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              :class="currentLocale.lang === 'en' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black' : 'text-slate-500 hover:text-slate-900'"
            >
              <span>🇬🇧</span>
              <span>EN</span>
            </button>
            <button
              type="button"
              @click="setLocale('zh')"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              :class="currentLocale.lang === 'zh' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black' : 'text-slate-500 hover:text-slate-900'"
            >
              <span>🇨🇳</span>
              <span>中文</span>
            </button>
          </div>

          <!-- Direct WhatsApp Header Button -->
          <a
            :href="`https://wa.me/${MAIN_WHATSAPP}?text=${encodeURIComponent(currentLocale.lang === 'zh' ? '您好，我想咨询巴厘岛行李运送与寄存服务。' : 'Hello Bali BagMove, I have an inquiry about luggage pickup & delivery.')}`"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageCircle class="w-4 h-4 fill-current" />
            <span class="hidden sm:inline">{{ t('waCenter') }}</span>
          </a>

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
    <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
      
      <!-- Mobile Language Switcher -->
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200">
        <span class="text-xs font-bold text-slate-600">Language / 语言:</span>
        <div class="flex gap-1">
          <button
            type="button"
            @click="setLocale('en'); mobileMenuOpen = false;"
            class="px-3 py-1 rounded-lg text-xs font-bold"
            :class="currentLocale.lang === 'en' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-600'"
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            @click="setLocale('zh'); mobileMenuOpen = false;"
            class="px-3 py-1 rounded-lg text-xs font-bold"
            :class="currentLocale.lang === 'zh' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-600'"
          >
            🇨🇳 简体中文
          </button>
        </div>
      </div>

      <router-link
        to="/"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold"
        :class="route.path === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      >
        {{ t('navPricelist') }}
      </router-link>

      <router-link
        to="/track"
        @click="mobileMenuOpen = false"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold"
        :class="route.path === '/track' ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      >
        {{ t('navTrack') }}
      </router-link>

      <a
        :href="`https://wa.me/${MAIN_WHATSAPP}`"
        target="_blank"
        class="block px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 text-center shadow-md shadow-emerald-600/20"
      >
        WhatsApp CS (+62 851-7249-1244)
      </a>
    </div>
  </header>
</template>
