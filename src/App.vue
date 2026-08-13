<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-[#090E17] text-slate-100 flex flex-col selection:bg-brand-500 selection:text-slate-950">
    <Navbar />

    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer class="glass-panel border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 mt-12">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div class="flex items-center gap-2">
          <span class="font-display font-bold text-white">Bag<span class="text-brand-400">Transit</span></span>
          <span>•</span>
          <span>PT Benlaris Sahabat Dewata (ASA Group)</span>
        </div>
        <div class="flex items-center gap-4 text-slate-500">
          <span>Ready Hubs: Kuta (Airport) & Sanur (Harbour)</span>
          <span>•</span>
          <span>Xenith Pay Direct Rail</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
