<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { COUNTRY_PAYMENT_MAP, formatCurrency } from '../services/xenith.js';
import { formatIdr } from '../services/pricing.js';
import { db } from '../services/db.js';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  X, 
  QrCode, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  Copy,
  Check,
  Zap
} from 'lucide-vue-next';

const props = defineProps({
  booking: {
    type: Object,
    required: true,
  },
  paymentData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['close', 'paid']);
const router = useRouter();

const countryInfo = computed(() => {
  return COUNTRY_PAYMENT_MAP[props.booking.customer_country] || COUNTRY_PAYMENT_MAP.CN;
});

const secondsRemaining = ref(1799); // 29m 59s
const isProcessing = ref(false);
const isSuccess = ref(false);
const copiedRef = ref(false);
let timerInterval = null;

onMounted(() => {
  timerInterval = setInterval(() => {
    if (secondsRemaining.value > 0) {
      secondsRemaining.value--;
    }
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

const formattedTime = computed(() => {
  const m = Math.floor(secondsRemaining.value / 60);
  const s = secondsRemaining.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

function copyReference() {
  const refCode = props.paymentData?.reference || props.booking.booking_code;
  navigator.clipboard.writeText(refCode);
  copiedRef.value = true;
  setTimeout(() => { copiedRef.value = false; }, 2000);
}

// Generate realistic SVG QR Code visualization
const qrSvgData = computed(() => {
  const channel = props.booking.payment_channel;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="white"><rect width="200" height="200" fill="white"/><rect x="20" y="20" width="50" height="50" fill="black"/><rect x="30" y="30" width="30" height="30" fill="white"/><rect x="38" y="38" width="14" height="14" fill="black"/><rect x="130" y="20" width="50" height="50" fill="black"/><rect x="140" y="30" width="30" height="30" fill="white"/><rect x="148" y="38" width="14" height="14" fill="black"/><rect x="20" y="130" width="50" height="50" fill="black"/><rect x="30" y="140" width="30" height="30" fill="white"/><rect x="38" y="148" width="14" height="14" fill="black"/><rect x="80" y="30" width="15" height="15" fill="black"/><rect x="105" y="45" width="15" height="25" fill="black"/><rect x="80" y="80" width="40" height="40" fill="%2310B981"/><rect x="30" y="85" width="20" height="20" fill="black"/><rect x="145" y="90" width="35" height="15" fill="black"/><rect x="90" y="145" width="25" height="25" fill="black"/><rect x="130" y="130" width="20" height="35" fill="black"/><rect x="160" y="145" width="20" height="20" fill="black"/><text x="100" y="105" font-family="sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${channel}</text></svg>`;
});

async function simulatePaymentSuccess() {
  isProcessing.value = true;
  
  try {
    // 1. Send simulated Xenith webhook call
    await fetch('/api/xenith/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xenith-signature': 'simulated_valid_sig',
      },
      body: JSON.stringify({
        reference: props.paymentData?.reference || props.booking.booking_code,
        status: 'Success',
        amount: props.booking.foreign_amount,
        currency: props.booking.foreign_currency,
        paymentChannel: props.booking.payment_channel,
        eventId: `ev_${Date.now()}`,
      }),
    }).catch(() => null);

    // 2. Update status in database to 'confirmed' (triggers WhatsApp notification)
    await db.updateBookingStatus(props.booking.id, 'confirmed', {
      actorId: 'xenith_webhook',
      actorRole: 'system',
      notes: `Xenith Pay-In confirmed via ${props.booking.payment_channel} (${props.booking.foreign_currency} ${props.booking.foreign_amount})`,
    });

    isSuccess.value = true;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      emit('paid', props.booking);
      router.push({
        path: '/track',
        query: { code: props.booking.booking_code, new: 'true' },
      });
    }, 1500);
  } catch (error) {
    console.error('Payment simulation failed:', error);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
    <div class="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 bg-gradient-to-br from-slate-800/90 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xl">
            {{ countryInfo.icon }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white">Xenith Pay Checkout</h3>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                Sandbox Live
              </span>
            </div>
            <p class="text-xs text-slate-400 font-medium">
              {{ countryInfo.channelDisplayName }}
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
      <div class="p-6 space-y-5">
        
        <!-- Amount Card -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 font-medium block">Total Payable Amount</span>
            <div class="text-2xl sm:text-3xl font-display font-extrabold text-white mt-0.5">
              {{ formatCurrency(booking.foreign_amount, booking.foreign_currency) }}
            </div>
            <span class="text-xs text-brand-400 font-medium mt-0.5 block">
              ≈ {{ formatIdr(booking.total_amount_idr) }} IDR
            </span>
          </div>

          <div class="text-right flex flex-col items-end">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold">
              <Clock class="w-3.5 h-3.5" />
              {{ formattedTime }}
            </div>
            <span class="text-[10px] text-slate-500 mt-1">Ref: {{ booking.booking_code }}</span>
          </div>
        </div>

        <!-- Success Animation -->
        <div v-if="isSuccess" class="py-8 text-center space-y-3 animate-in zoom-in duration-300">
          <div class="w-16 h-16 rounded-full bg-brand-500/20 border-2 border-brand-500 text-brand-400 flex items-center justify-center mx-auto">
            <CheckCircle2 class="w-10 h-10" />
          </div>
          <h4 class="text-lg font-bold text-white">Payment Confirmed!</h4>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">
            WhatsApp confirmation dispatched to {{ booking.customer_phone }}. Redirecting to tracking...
          </p>
        </div>

        <!-- QR Code & Instructions -->
        <div v-else class="space-y-4">
          <div class="flex flex-col items-center justify-center p-5 rounded-2xl bg-white text-slate-950 shadow-inner">
            <img :src="qrSvgData" alt="Payment QR Code" class="w-44 h-44 rounded-lg object-contain shadow-sm" />
            <p class="text-xs font-bold text-slate-800 mt-3 text-center">
              {{ countryInfo.instructions }}
            </p>
            <span class="text-[10px] text-slate-500 mt-0.5">Xenith Pay Direct Rail • No Surcharge</span>
          </div>

          <!-- Reference Code Box -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div class="flex flex-col">
              <span class="text-slate-500 text-[10px]">Merchant Reference</span>
              <span class="font-mono text-slate-300 font-semibold">{{ paymentData?.reference || booking.booking_code }}</span>
            </div>
            <button
              @click="copyReference"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              <Check v-if="copiedRef" class="w-3.5 h-3.5 text-brand-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              {{ copiedRef ? 'Copied' : 'Copy' }}
            </button>
          </div>

          <!-- Simulation Notice -->
          <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
            <Sparkles class="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p class="text-[11px] text-blue-300 leading-relaxed">
              <strong class="font-semibold text-blue-200">Sandbox Environment:</strong> Click below to simulate instant payment confirmation via Xenith Webhook and trigger automated WhatsApp notifications.
            </p>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div v-if="!isSuccess" class="p-6 bg-slate-950/70 border-t border-slate-800/80 flex flex-col gap-2.5">
        <button
          @click="simulatePaymentSuccess"
          :disabled="isProcessing"
          class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-ocean-500 hover:from-brand-600 hover:to-ocean-600 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Zap class="w-4 h-4 fill-current" />
          <span>{{ isProcessing ? 'Simulating Xenith Callback...' : 'Simulate Payment Success (1-Click)' }}</span>
        </button>

        <button
          @click="emit('close')"
          class="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cancel & Pay Later
        </button>
      </div>

    </div>
  </div>
</template>
