<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-brand-500 selection:text-white">
    <Navbar />

    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-12 shadow-sm">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div class="flex items-center gap-2">
          <img src="/icons/logo.png" alt="Bali BagMove" class="h-6 object-contain" />
          <span>•</span>
          <span>PT Bonanza Tujuh Samudera (BTS)</span>
        </div>
        <div class="flex items-center gap-3 text-slate-500">
          <span>Hubs: Kuta (Airport), Sanur & Seminyak</span>
          <span>•</span>
          <a href="https://wa.me/6285172491244" target="_blank" class="text-brand-600 font-semibold hover:underline">
            WA: +62 851-7249-1244
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}
</style>
