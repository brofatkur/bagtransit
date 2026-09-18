<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { BALI_DESTINATIONS, DESTINATION_CATEGORIES, OFFICIAL_HUBS, MAIN_WHATSAPP, DPS_AIRPORT_COORDS } from '../../data/destinations.js';
import { calculateFare, formatIdr } from '../../services/pricing.js';
import { COUNTRY_PAYMENT_MAP, convertIdrToCurrency, createXenithPaymentLink } from '../../services/xenith.js';
import { generateWhatsAppOrderMessage, getWhatsAppOrderUrl } from '../../services/whatsapp.js';
import { db } from '../../services/db.js';
import { currentLocale, t } from '../../i18n/index.js';
import OpenStreetMap from '../../components/OpenStreetMap.vue';
import XenithPaymentModal from '../../components/XenithPaymentModal.vue';
import confetti from 'canvas-confetti';
import { 
  Luggage, 
  Plane, 
  Hotel, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Calendar, 
  User, 
  Phone, 
  CheckCircle2, 
  Zap, 
  Search, 
  MessageCircle, 
  Tag, 
  Copy, 
  Check, 
  Star, 
  Lock, 
  Camera, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Navigation,
  Loader2
} from 'lucide-vue-next';

const router = useRouter();

// Top popular quick-select destinations
const POPULAR_QUICK_DESTINATIONS = [
  { no: 23, name: 'Canggu', km: 20, priceIdr: 400000, tag: '🔥 Popular', lat: -8.6478, lng: 115.1385 },
  { no: 66, name: 'Seminyak', km: 10, priceIdr: 150000, tag: '🔥 Favorite', lat: -8.6892, lng: 115.1542 },
  { no: 79, name: 'Ubud', km: 37, priceIdr: 370000, tag: '🌿 Cultural', lat: -8.5069, lng: 115.2625 },
  { no: 43, name: 'Kuta', km: 4, priceIdr: 120000, tag: '⚡ Near DPS', lat: -8.7185, lng: 115.1688 },
  { no: 33, name: 'Nusa Dua', km: 13, priceIdr: 195000, tag: '🏖️ Resort', lat: -8.7992, lng: 115.2312 },
  { no: 65, name: 'Sanur', km: 21, priceIdr: 231000, tag: '⚓ Port', lat: -8.6754, lng: 115.2642 },
  { no: 81, name: 'Uluwatu', km: 30, priceIdr: 450000, tag: '🌅 Sunset', lat: -8.8292, lng: 115.0842 },
  { no: 37, name: 'Jimbaran', km: 7, priceIdr: 210000, tag: '🦐 Seafood', lat: -8.7735, lng: 115.1685 },
];

// Search & filter state
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedDestNo = ref(23); // Default Canggu
const isDropdownOpen = ref(false);
const customMapDestination = ref(null);
const isGeocoding = ref(false);

const filteredDestinations = computed(() => {
  let list = BALI_DESTINATIONS;

  if (selectedCategory.value === 'popular') {
    list = list.filter(d => d.popular);
  } else if (selectedCategory.value !== 'all') {
    list = list.filter(d => d.category === selectedCategory.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.category.toLowerCase().includes(q) ||
      d.no.toString() === q
    );
  }

  return list;
});

const activeDestination = computed(() => {
  if (customMapDestination.value) return customMapDestination.value;
  return BALI_DESTINATIONS.find(d => d.no === selectedDestNo.value) || BALI_DESTINATIONS[22];
});

// Calculate Haversine distance in KM between 2 lat/lng pairs
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// OpenStreetMap Nominatim Live Address Search
async function searchOpenStreetMapAddress() {
  if (!searchQuery.value.trim()) return;
  isGeocoding.value = true;
  try {
    const query = encodeURIComponent(`${searchQuery.value.trim()}, Bali, Indonesia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      const place = data[0];
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      const km = haversineDistanceKm(DPS_AIRPORT_COORDS.lat, DPS_AIRPORT_COORDS.lng, lat, lng) || 15;
      const priceIdr = Math.max(120000, km * 12000);

      customMapDestination.value = {
        no: 999,
        name: place.display_name.split(',')[0] || searchQuery.value.trim(),
        km: km,
        priceIdr: Math.round(priceIdr / 5000) * 5000,
        category: 'custom',
        popular: false,
        lat: lat,
        lng: lng,
      };
      selectedDestNo.value = 999;
      isDropdownOpen.value = false;
    }
  } catch (e) {
    console.error('OpenStreetMap geocoding failed', e);
  } finally {
    isGeocoding.value = false;
  }
}

// Form state
const form = reactive({
  route_type: 'airport_to_hotel',
  customer_country: 'AU',
  bag_count: 2,
  customer_name: '',
  customer_phone: '',
  pickup_datetime: new Date(Date.now() + 3600000 * 2).toISOString().slice(0, 16),
  flight_number: '',
  hotel_name: '',
  hotel_room: '',
  notes: '',
});

// Multi-currency estimates
const activeCurrencyCode = computed(() => currentLocale.lang === 'zh' ? 'CNY' : 'AUD');
const FOREIGN_RATES = {
  AUD: 10500,
  CNY: 2280,
  USD: 16000,
  SGD: 12200,
  EUR: 17400,
  MYR: 3580,
  INR: 192,
};

const fareBreakdown = computed(() => {
  return calculateFare({
    destination: activeDestination.value,
    bagCount: form.bag_count,
    extraBagFee: 30000,
    includedBags: 2,
    routeType: form.route_type,
  });
});

const convertedForeignAmount = computed(() => {
  const rate = FOREIGN_RATES[activeCurrencyCode.value] || 10500;
  const val = fareBreakdown.value.totalIdr / rate;
  return ['AUD', 'USD', 'SGD', 'EUR'].includes(activeCurrencyCode.value)
    ? val.toFixed(1)
    : Math.round(val).toLocaleString();
});

function selectDestination(dest) {
  customMapDestination.value = null;
  selectedDestNo.value = dest.no;
  isDropdownOpen.value = false;
  searchQuery.value = '';
  if (!form.hotel_name) {
    form.hotel_name = `Hotel / Villa in ${dest.name.split('(')[0]}`;
  }
}

function incrementBags() {
  if (form.bag_count < 12) form.bag_count++;
}

function decrementBags() {
  if (form.bag_count > 1) form.bag_count--;
}

// Live recent booking activity ticker
const recentBookings = computed(() => {
  if (currentLocale.lang === 'zh') {
    return [
      { name: '张先生 (Liam)', from: '澳大利亚', route: '机场 ➔ 苍谷 (2件行李)', time: '4分钟前' },
      { name: '王魏 (Wei)', from: '新加坡', route: '机场 ➔ 水明漾 (3件行李)', time: '11分钟前' },
      { name: 'Sarah 女士', from: '英国', route: '酒店 ➔ 机场 (2件行李)', time: '19分钟前' },
      { name: '佐藤健 (Kenji)', from: '日本', route: '沙努尔港 ➔ 乌布 (2件行李)', time: '28分钟前' },
    ];
  }
  return [
    { name: 'Liam & Chloe M.', from: 'Australia', route: 'Airport ➔ Canggu (2 Bags)', time: '4 mins ago' },
    { name: 'Wei Zhang', from: 'Singapore', route: 'Airport ➔ Seminyak (3 Bags)', time: '11 mins ago' },
    { name: 'Sarah Jenkins', from: 'United Kingdom', route: 'Hotel ➔ Airport (2 Bags)', time: '19 mins ago' },
    { name: 'Kenji Sato', from: 'Japan', route: 'Sanur Port ➔ Ubud (2 Bags)', time: '28 mins ago' },
  ];
});

const currentTickerIdx = ref(0);
let tickerTimer = null;

onMounted(() => {
  tickerTimer = setInterval(() => {
    currentTickerIdx.value = (currentTickerIdx.value + 1) % recentBookings.value.length;
  }, 4500);
});

onUnmounted(() => {
  if (tickerTimer) clearInterval(tickerTimer);
});

// Social Proof Customer Testimonials (Bilingual EN/ZH - NO Indonesian)
const TESTIMONIALS = computed(() => {
  if (currentLocale.lang === 'zh') {
    return [
      {
        name: '张伟 & 玲 (Liam & Chloe)',
        country: '🇦🇺 澳大利亚 / 🇸🇬 新加坡',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        route: '伍拉莱机场 (DPS) ➔ 苍谷别墅 (Canggu)',
        rating: 5,
        date: '2024年8月',
        text: '出关后直接在机场交接了3件大行李，太方便了！我们直接去苍谷吃早午餐，下午3点入住时行李已经完好无损送到房间，封条完好！',
      },
      {
        name: '陈美玲 (Wei Zhang)',
        country: '🇨🇳 中国 (上海) / 🇸🇬 新加坡',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        route: '伍拉莱机场 (DPS) ➔ 水明漾 W 酒店',
        rating: 5,
        date: '2024年8月',
        text: '极其专业高效！司机 Wayan 取件后第一时间在 WhatsApp/微信 上发了带编号安全封条的照片凭证。100% 推荐！',
      },
      {
        name: 'Sarah Jenkins',
        country: '🇬🇧 英国 (伦敦)',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        route: '沙努尔玛雅度假村 ➔ 机场 (DPS)',
        rating: 5,
        date: '2024年7月',
        text: '退房后到晚上10点的航班还有大半天。BagMove 把我们的行李保管并准时送达机场。沟通预订不到2分钟就搞定了。',
      },
    ];
  }
  return [
    {
      name: 'Liam & Chloe K.',
      country: '🇦🇺 Australia (Melbourne)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      route: 'Airport DPS ➔ The Lawn Villa, Canggu',
      rating: 5,
      date: 'August 2024',
      text: 'Best decision ever landing in Bali! Handed our 3 heavy suitcases right at the Kuta exit gate and went straight for brunch. Bags arrived at our villa with seals intact before 3 PM check-in.',
    },
    {
      name: 'Wei Zhang & Ling',
      country: '🇸🇬 Singapore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      route: 'Airport DPS ➔ W Bali Seminyak',
      rating: 5,
      date: 'August 2024',
      text: 'Extremely professional and fast. Courier Wayan sent photo proof on WhatsApp with numbered security seals immediately upon pickup. 100% recommended!',
    },
    {
      name: 'Sarah Jenkins',
      country: '🇬🇧 United Kingdom (London)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      route: 'Maya Sanur Resort ➔ Airport DPS',
      rating: 5,
      date: 'July 2024',
      text: 'Had a late 10 PM flight after checkout at 11 AM. BagMove stored and delivered our bags to DPS on time. Booking via WhatsApp took 2 mins.',
    },
  ];
});

// FAQs (Bilingual EN/ZH - NO Indonesian)
const FAQS = computed(() => {
  if (currentLocale.lang === 'zh') {
    return [
      {
        q: '在伍拉·赖机场 (DPS) 如何交接行李？',
        a: '我们的司机团队会在国际/国内到达大厅出口接您，或在距离机场出口仅100米的库塔机场服务中心 (Jl. Dewi Sartika 1 Utama) 进行交接。',
        open: true,
      },
      {
        q: '我的行李在运送过程中安全吗？',
        a: '100% 安全保障。每件行李都会在您面前施加独家编号防篡改封条 (Tamper-Proof Seals)，拍照并发送至您的 WhatsApp/微信。所有行李均由专用封闭式空调面包车运送。',
        open: false,
      },
      {
        q: '如何支付运费？',
        a: '支付方式非常灵活！您可以选择印尼盾现金、现场扫码 (QRIS)、支付宝/微信支付、国际信用卡，或在行李送达交接时付款。',
        open: false,
      },
      {
        q: '行李需要多久送到酒店/别墅？',
        a: '标准运送耗时约 2–4 小时 (视区域而定)。您也可以在预订时指定希望送达的时间窗口。',
        open: false,
      },
    ];
  }
  return [
    {
      q: 'Where do I meet the courier at Ngurah Rai Airport (DPS)?',
      a: 'Our courier team stands by at the Arrival Hall (International & Domestic) or at our Kuta Airport Hub located just 100 meters from the airport exit gate (Jl. Dewi Sartika 1 Utama).',
      open: true,
    },
    {
      q: 'Is my luggage safe and secure during transit?',
      a: '100% secure. Every zipper is sealed with a unique numbered tamper-proof security seal in front of you, photographed, and sent to your WhatsApp. All bags are transported in enclosed, air-conditioned vans.',
      open: false,
    },
    {
      q: 'How do I pay for the service?',
      a: 'Very flexible! You can pay in cash (IDR), on-site QRIS, international card/e-wallet, Alipay/WeChat, or settle upon luggage handover.',
      open: false,
    },
    {
      q: 'How long does delivery to my hotel or villa take?',
      a: 'Standard delivery takes 2–4 hours depending on the zone. You can also specify your preferred delivery arrival window via WhatsApp.',
      open: false,
    },
  ];
});

const faqsState = ref(FAQS.value);

function toggleFaq(index) {
  faqsState.value[index].open = !faqsState.value[index].open;
}

// Order & Payment handlers
const copiedText = ref(false);
const showPaymentModal = ref(false);
const activeBooking = ref(null);
const paymentLinkData = ref(null);

function prepareBookingRecord() {
  const pickupLoc = form.route_type === 'airport_to_hotel'
    ? `Ngurah Rai International Airport (DPS)${form.flight_number ? ` [Flight: ${form.flight_number}]` : ''}`
    : `${form.hotel_name || 'Hotel'} (${activeDestination.value.name})`;

  const dropoffLoc = form.route_type === 'hotel_to_airport'
    ? `Ngurah Rai International Airport (DPS) Departure Terminal`
    : `${form.hotel_name || 'Hotel/Villa'} (${activeDestination.value.name})${form.hotel_room ? ` [Room: ${form.hotel_room}]` : ''}`;

  return db.createBooking({
    cabang_id: '11111111-1111-1111-1111-111111111111',
    customer_name: form.customer_name || 'Guest Traveler',
    customer_phone: form.customer_phone || '-',
    customer_country: form.customer_country || (currentLocale.lang === 'zh' ? 'CN' : 'AU'),
    route_type: form.route_type,
    pickup_location: pickupLoc,
    pickup_datetime: new Date(form.pickup_datetime).toISOString(),
    dropoff_location: dropoffLoc,
    flight_number: form.flight_number,
    hotel_name: form.hotel_name || activeDestination.value.name,
    hotel_room: form.hotel_room,
    hotel_booking_name: form.customer_name,
    bag_count: form.bag_count,
    price_breakdown: fareBreakdown.value,
    total_amount_idr: fareBreakdown.value.totalIdr,
    foreign_currency: activeCurrencyCode.value,
    foreign_amount: Number(convertedForeignAmount.value.replace(/,/g, '')),
    payment_channel: 'WhatsApp / Online Order',
    payment_status: 'pending_payment',
    status: 'pending_payment',
    notes: form.notes,
  });
}

function handleWhatsAppOrder() {
  const booking = prepareBookingRecord();
  activeBooking.value = booking;

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
  });

  const waUrl = getWhatsAppOrderUrl(booking, MAIN_WHATSAPP);
  window.open(waUrl, '_blank');
}

function handleCopyOrderText() {
  const booking = prepareBookingRecord();
  const msg = generateWhatsAppOrderMessage(booking);
  navigator.clipboard.writeText(msg);
  copiedText.value = true;
  setTimeout(() => { copiedText.value = false; }, 2000);
}

async function handleOnlinePayment() {
  const booking = prepareBookingRecord();
  activeBooking.value = booking;

  try {
    const res = await createXenithPaymentLink({
      booking_code: booking.booking_code,
      customer_name: form.customer_name || 'Guest Traveler',
      customer_phone: form.customer_phone || '-',
      foreign_currency: COUNTRY_PAYMENT_MAP[form.customer_country]?.currency || 'CNY',
      foreign_amount: convertIdrToCurrency(fareBreakdown.value.totalIdr, COUNTRY_PAYMENT_MAP[form.customer_country]?.currency || 'CNY'),
      payment_channel: COUNTRY_PAYMENT_MAP[form.customer_country]?.channel || 'Alipay',
      total_amount_idr: fareBreakdown.value.totalIdr,
    });
    paymentLinkData.value = res.data;
  } catch (e) {
    paymentLinkData.value = {
      reference: `XEN-${booking.booking_code}`,
      currency: 'CNY',
      amount: 150,
      paymentChannel: 'Alipay',
    };
  }

  showPaymentModal.value = true;
}
</script>

<template>
  <div class="min-h-screen pb-28 pt-3 sm:pt-6 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
    
    <!-- 1. HERO SECTION: Clean White / Crisp Light Theme (Bilingual I18n) -->
    <div class="text-center space-y-3 max-w-2xl mx-auto pt-1">
      
      <!-- Live Social Proof Ticker Badge -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs shadow-sm">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-slate-600 text-[11px]">
          <strong class="text-slate-900">{{ recentBookings[currentTickerIdx].name }}</strong> ({{ recentBookings[currentTickerIdx].from }}) {{ recentBookings[currentTickerIdx].route }} • <span class="text-emerald-600 font-bold">{{ recentBookings[currentTickerIdx].time }}</span>
        </span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-3xl sm:text-5xl font-display font-black text-slate-900 tracking-tight leading-tight">
        {{ t('heroHeadline1') }} <br />
        <span class="gradient-text-brand">{{ t('heroHeadline2') }}</span>
      </h1>

      <!-- Value Proposition -->
      <p class="text-xs sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
        {{ t('heroSubtitle') }}
      </p>

      <!-- Trust Bar (Rating + Guarantee Badges) -->
      <div class="pt-1 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-600">
        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div class="flex text-amber-400">
            <Star v-for="i in 5" :key="i" class="w-3.5 h-3.5 fill-current" />
          </div>
          <span class="font-bold text-slate-900">{{ t('trustRating') }}</span>
          <span class="text-slate-500">{{ t('trustReviews') }}</span>
        </div>

        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <Lock class="w-4 h-4 text-brand-600" />
          <span class="font-medium">{{ t('trustSeals') }}</span>
        </div>

        <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <Camera class="w-4 h-4 text-emerald-600" />
          <span class="font-medium">{{ t('trustPhoto') }}</span>
        </div>
      </div>

    </div>

    <!-- 2. MAIN BOOKING CALCULATOR CONTAINER -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Column: Simple 3-Step Interactive Form (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        
        <!-- STEP 1: ROUTE & DESTINATION -->
        <div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">1</span>
              {{ t('step1Title') }}
            </h2>
            <span class="text-xs text-brand-600 font-bold font-mono">
              {{ activeDestination.km }} km • {{ formatIdr(activeDestination.priceIdr) }}
            </span>
          </div>

          <!-- Route Segmented Control -->
          <div class="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              @click="form.route_type = 'airport_to_hotel'"
              class="py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
              :class="form.route_type === 'airport_to_hotel' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Plane class="w-3.5 h-3.5 text-brand-600" />
              <span>{{ t('routeAirportToHotel') }}</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_airport'"
              class="py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
              :class="form.route_type === 'hotel_to_airport' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Hotel class="w-3.5 h-3.5 text-brand-600" />
              <span>{{ t('routeHotelToAirport') }}</span>
            </button>

            <button
              type="button"
              @click="form.route_type = 'hotel_to_hotel'"
              class="py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
              :class="form.route_type === 'hotel_to_hotel' ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-black' : 'text-slate-600 hover:text-slate-900'"
            >
              <Luggage class="w-3.5 h-3.5 text-brand-600" />
              <span>{{ t('routeHotelToHotel') }}</span>
            </button>
          </div>

          <!-- Quick Popular Destination Pills -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-700">{{ t('popularQuickSelect') }}</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="pop in POPULAR_QUICK_DESTINATIONS"
                :key="pop.no"
                type="button"
                @click="selectDestination(pop)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 active:scale-95"
                :class="selectedDestNo === pop.no ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/25 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
              >
                <span>{{ pop.name }}</span>
                <span class="text-[10px] opacity-80 font-mono">({{ formatIdr(pop.priceIdr).replace('Rp ', 'IDR ') }})</span>
              </button>
            </div>
          </div>

          <!-- OpenStreetMap Search & Interactive Geocoding -->
          <div class="relative pt-1 space-y-2">
            <div class="flex items-center justify-between text-[11px] text-slate-600">
              <span>{{ t('searchLabel') }}</span>
              <span class="text-brand-600 font-bold cursor-pointer hover:underline" @click="isDropdownOpen = !isDropdownOpen">
                {{ isDropdownOpen ? t('browseAllClose') : t('browseAllOpen') }}
              </span>
            </div>

            <div class="flex gap-1.5">
              <div class="relative flex-1">
                <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="searchQuery"
                  @focus="isDropdownOpen = true"
                  @keyup.enter="searchOpenStreetMapAddress"
                  type="text"
                  :placeholder="t('searchPlaceholder')"
                  class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
              <button
                type="button"
                @click="searchOpenStreetMapAddress"
                :disabled="isGeocoding"
                class="px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Loader2 v-if="isGeocoding" class="w-3.5 h-3.5 animate-spin" />
                <Navigation v-else class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Map Find</span>
              </button>
            </div>

            <!-- Dropdown List of 85 Destinations -->
            <div
              v-if="isDropdownOpen"
              class="absolute left-0 right-0 mt-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-2xl z-30 max-h-56 overflow-y-auto space-y-1"
            >
              <button
                v-for="dest in filteredDestinations"
                :key="dest.no"
                type="button"
                @click="selectDestination(dest)"
                class="w-full p-2 rounded-xl text-left transition-all flex items-center justify-between text-xs group"
                :class="selectedDestNo === dest.no ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200' : 'hover:bg-slate-50 text-slate-700'"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="text-[10px] font-mono text-slate-400">#{{ dest.no }}</span>
                  <span class="truncate">{{ dest.name }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2 font-mono text-[11px]">
                  <span class="text-slate-500">{{ dest.km }}km</span>
                  <span class="text-brand-600 font-bold">{{ formatIdr(dest.priceIdr) }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- OpenStreetMap Interactive Route Map Widget -->
          <OpenStreetMap
            :destination="activeDestination"
            :route-type="form.route_type"
          />

        </div>

        <!-- STEP 2: LUGGAGE QUANTITY -->
        <div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">2</span>
            {{ t('step2Title') }}
          </h2>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-sm font-bold text-slate-900">{{ t('howManyBags') }}</span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                  {{ form.bag_count }} {{ t('bagsCountLabel') }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                <span class="text-emerald-700 font-bold">{{ t('flatBundleIncluded') }}</span>
                <span v-if="form.bag_count > 2" class="text-amber-700 font-semibold ml-1">
                  (+{{ form.bag_count - 2 }} {{ t('extraBagFeeNotice') }})
                </span>
              </p>
            </div>

            <!-- Stepper Buttons -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="decrementBags"
                class="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-black text-lg flex items-center justify-center transition-colors active:scale-95 shadow-sm"
              >
                -
              </button>
              <span class="text-lg font-black font-mono text-slate-900 w-6 text-center">
                {{ form.bag_count }}
              </span>
              <button
                type="button"
                @click="incrementBags"
                class="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-lg flex items-center justify-center transition-colors shadow-md shadow-brand-500/25 active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 3: CONTACT & SCHEDULE -->
        <div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3.5">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-black">3</span>
            {{ t('step3Title') }}
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">{{ t('guestNameLabel') }}</label>
              <input
                v-model="form.customer_name"
                type="text"
                :placeholder="t('guestNamePlaceholder')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">{{ t('phoneLabel') }}</label>
              <input
                v-model="form.customer_phone"
                type="tel"
                :placeholder="t('phonePlaceholder')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">
                {{ form.route_type === 'airport_to_hotel' ? t('flightNoLabel') : t('hotelPickupLabel') }}
              </label>
              <input
                v-if="form.route_type === 'airport_to_hotel'"
                v-model="form.flight_number"
                type="text"
                :placeholder="t('flightNoPlaceholder')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
              <input
                v-else
                v-model="form.hotel_name"
                type="text"
                :placeholder="t('hotelPickupPlaceholder')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">{{ t('datetimeLabel') }}</label>
              <input
                v-model="form.pickup_datetime"
                type="datetime-local"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Live Summary & WhatsApp CTA (5 cols) -->
      <div class="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
        
        <!-- Live Invoice Card -->
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <Tag class="w-4 h-4 text-brand-600" />
              <h3 class="font-display font-bold text-sm text-slate-900">{{ t('summaryTitle') }}</h3>
            </div>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {{ t('summaryBadge') }}
            </span>
          </div>

          <!-- Breakdown rows -->
          <div class="space-y-2.5 text-xs text-slate-600">
            <div class="flex items-start justify-between gap-2">
              <span class="text-slate-500">{{ t('destinationLabel') }}</span>
              <strong class="text-slate-900 text-right font-bold">{{ activeDestination.name }}</strong>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-500">{{ t('distanceLabel') }}</span>
              <span class="font-mono text-slate-700 font-semibold">{{ activeDestination.km }} km ({{ t('fromDPSAirport') }})</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-500">{{ t('baseFareLabel') }}</span>
              <span class="font-mono font-bold text-slate-900">{{ formatIdr(fareBreakdown.baseTripPrice) }}</span>
            </div>

            <div v-if="fareBreakdown.extraBags > 0" class="flex items-center justify-between text-amber-700">
              <span>{{ t('extraBagsLabel') }} ({{ fareBreakdown.extraBags }} × IDR 30k):</span>
              <span class="font-mono font-bold">+{{ formatIdr(fareBreakdown.extraBagTotal) }}</span>
            </div>

            <!-- Total Highlight -->
            <div class="pt-3 border-t border-slate-100 space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs text-slate-500 uppercase tracking-wider font-bold">{{ t('totalPaymentLabel') }}</span>
                <span class="text-2xl sm:text-3xl font-display font-black text-brand-600 font-mono">
                  {{ formatIdr(fareBreakdown.totalIdr) }}
                </span>
              </div>

              <!-- Currency Switcher Reference -->
              <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-slate-500 font-semibold">{{ t('estFXLabel') }}</span>
                  <select
                    v-model="activeCurrencyCode"
                    class="bg-white border border-slate-300 text-[10px] text-brand-700 font-bold rounded px-1.5 py-0.5 outline-none shadow-sm"
                  >
                    <option value="CNY">CNY (¥)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MYR">MYR (RM)</option>
                  </select>
                </div>
                <span class="font-mono font-bold text-slate-700">
                  ≈ {{ activeCurrencyCode }} {{ convertedForeignAmount }}
                </span>
              </div>
            </div>
          </div>

          <!-- PRIMARY CTA: 1-Click WhatsApp -->
          <div class="space-y-2 pt-1">
            <button
              type="button"
              @click="handleWhatsAppOrder"
              class="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] group"
            >
              <MessageCircle class="w-5 h-5 fill-current group-hover:animate-bounce flex-shrink-0" />
              <span>{{ t('btnBookWhatsApp') }}</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="handleCopyOrderText"
                class="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check v-if="copiedText" class="w-3.5 h-3.5 text-emerald-600" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedText ? t('btnCopied') : t('btnCopySummary') }}</span>
              </button>

              <button
                type="button"
                @click="handleOnlinePayment"
                class="py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap class="w-3.5 h-3.5 text-brand-600" />
                <span>{{ t('btnPayOnline') }}</span>
              </button>
            </div>
          </div>

          <!-- Micro Guarantees -->
          <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
            <div class="flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3 text-emerald-600" />
              <span>{{ t('guaranteePayHandover') }}</span>
            </div>
            <div class="flex items-center gap-1">
              <ShieldCheck class="w-3 h-3 text-brand-600" />
              <span>{{ t('guaranteeSealsAttached') }}</span>
            </div>
          </div>

        </div>

        <!-- Official Contact Card -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-sm">
          <div class="space-y-0.5">
            <span class="text-[10px] text-slate-400 uppercase font-bold">{{ t('conciergeTitle') }}</span>
            <p class="font-bold text-slate-900 text-sm">+62 851-7249-1244</p>
          </div>
          <a
            :href="`https://wa.me/${MAIN_WHATSAPP}`"
            target="_blank"
            class="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            {{ t('chatCS') }}
          </a>
        </div>

      </div>

    </div>

    <!-- 3. SOCIAL PROOF SECTION: Real Reviews from Tourists -->
    <div class="pt-6 space-y-6">
      
      <div class="text-center space-y-2">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold">
          <Award class="w-3.5 h-3.5 text-amber-600" />
          <span>{{ t('socialBadge') }}</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          {{ t('socialTitle') }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500">
          {{ t('socialSubtitle') }}
        </p>
      </div>

      <!-- Testimonials Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="(tItem, idx) in TESTIMONIALS"
          :key="idx"
          class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-400 transition-all hover:shadow-md"
        >
          <div class="space-y-2.5">
            <!-- Stars -->
            <div class="flex text-amber-400">
              <Star v-for="s in tItem.rating" :key="s" class="w-4 h-4 fill-current" />
            </div>
            <p class="text-xs text-slate-600 leading-relaxed italic">
              "{{ tItem.text }}"
            </p>
          </div>

          <div class="flex items-center gap-3 pt-3 border-t border-slate-100">
            <img :src="tItem.avatar" :alt="tItem.name" class="w-10 h-10 rounded-full object-cover border border-slate-200" />
            <div class="text-xs">
              <h4 class="font-bold text-slate-900">{{ tItem.name }}</h4>
              <p class="text-[10px] text-slate-500">{{ tItem.country }}</p>
              <p class="text-[9px] text-brand-600 font-semibold">{{ tItem.route }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 4. FAQ ACCORDION SECTION -->
    <div class="pt-6 space-y-4 max-w-2xl mx-auto">
      <div class="text-center space-y-1">
        <h3 class="text-xl sm:text-2xl font-display font-bold text-slate-900">{{ t('faqTitle') }}</h3>
        <p class="text-xs text-slate-500">{{ t('faqSubtitle') }}</p>
      </div>

      <div class="space-y-2">
        <div
          v-for="(faq, fIdx) in faqsState"
          :key="fIdx"
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
        >
          <button
            type="button"
            @click="toggleFaq(fIdx)"
            class="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-brand-600"
          >
            <span>{{ faq.q }}</span>
            <ChevronUp v-if="faq.open" class="w-4 h-4 text-brand-600 flex-shrink-0" />
            <ChevronDown v-else class="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
          <div v-if="faq.open" class="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
            {{ faq.a }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky Mobile Bottom Bar for High Conversion -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-3 shadow-lg">
      <div class="flex flex-col">
        <span class="text-[10px] text-slate-500">{{ t('mobileTotalLabel') }} ({{ activeDestination.name.split('(')[0] }}):</span>
        <span class="text-lg font-display font-black text-brand-600 font-mono">
          {{ formatIdr(fareBreakdown.totalIdr) }}
        </span>
      </div>

      <button
        type="button"
        @click="handleWhatsAppOrder"
        class="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 flex-shrink-0 active:scale-95"
      >
        <MessageCircle class="w-4 h-4 fill-current" />
        <span>{{ t('mobileBookBtn') }}</span>
      </button>
    </div>

    <!-- Xenith Payment Modal (Phase 2) -->
    <XenithPaymentModal
      v-if="showPaymentModal && activeBooking"
      :booking="activeBooking"
      :payment-data="paymentLinkData"
      @close="showPaymentModal = false"
      @paid="showPaymentModal = false"
    />

  </div>
</template>
