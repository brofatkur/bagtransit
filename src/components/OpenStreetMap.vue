<script setup>
import { onMounted, watch, ref, onUnmounted } from 'vue';
import { DPS_AIRPORT_COORDS } from '../data/destinations.js';

const props = defineProps({
  destination: {
    type: Object,
    required: true,
  },
  routeType: {
    type: String,
    default: 'airport_to_hotel',
  },
});

const mapContainer = ref(null);
let mapInstance = null;
let dpsMarker = null;
let destMarker = null;
let routePolyline = null;

function initLeafletMap() {
  if (!window.L || !mapContainer.value) return;

  // Clean up if instance exists
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const destLat = props.destination.lat || -8.6500;
  const destLng = props.destination.lng || 115.1300;

  // Initialize map centered on South Bali
  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    scrollWheelZoom: false,
    dragging: !L.Browser.mobile || true,
  }).setView([DPS_AIRPORT_COORDS.lat, DPS_AIRPORT_COORDS.lng], 10);

  // Add OpenStreetMap tile layer (Free, fast & clean)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Bali BagMove',
  }).addTo(mapInstance);

  // Custom Icon Helpers
  const dpsIcon = L.divIcon({
    className: 'custom-leaflet-marker-dps',
    html: `<div style="background-color:#0284c7; color:white; padding:6px 10px; border-radius:12px; font-weight:bold; font-size:11px; box-shadow:0 4px 12px rgba(2,132,199,0.4); border:2px solid white; display:flex; align-items:center; gap:4px; white-space:nowrap;">✈️ DPS Airport</div>`,
    iconSize: [110, 30],
    iconAnchor: [55, 15],
  });

  const destIcon = L.divIcon({
    className: 'custom-leaflet-marker-dest',
    html: `<div style="background-color:#059669; color:white; padding:6px 10px; border-radius:12px; font-weight:bold; font-size:11px; box-shadow:0 4px 12px rgba(5,150,105,0.4); border:2px solid white; display:flex; align-items:center; gap:4px; white-space:nowrap;">🧳 ${props.destination.name.split('(')[0].trim()}</div>`,
    iconSize: [130, 30],
    iconAnchor: [65, 15],
  });

  // Add Airport Marker
  dpsMarker = L.marker([DPS_AIRPORT_COORDS.lat, DPS_AIRPORT_COORDS.lng], { icon: dpsIcon }).addTo(mapInstance);
  dpsMarker.bindPopup(`<b>Ngurah Rai International Airport (DPS)</b><br/>Official Pickup Hub`);

  // Add Destination Marker
  destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(mapInstance);
  destMarker.bindPopup(`<b>${props.destination.name}</b><br/>Distance from DPS: <strong>${props.destination.km} km</strong>`);

  // Draw Blue Polyline route from DPS Airport to Destination
  const latlngs = [
    [DPS_AIRPORT_COORDS.lat, DPS_AIRPORT_COORDS.lng],
    [destLat, destLng],
  ];
  routePolyline = L.polyline(latlngs, {
    color: '#0284c7',
    weight: 4,
    opacity: 0.8,
    dashArray: '8, 8',
  }).addTo(mapInstance);

  // Fit bounds to show both pins on mobile
  const bounds = L.latLngBounds(latlngs);
  mapInstance.fitBounds(bounds, { padding: [40, 40] });
}

function updateMapMarkers() {
  if (!mapInstance || !window.L) {
    initLeafletMap();
    return;
  }

  const destLat = props.destination.lat || -8.6500;
  const destLng = props.destination.lng || 115.1300;

  if (destMarker) {
    destMarker.setLatLng([destLat, destLng]);
    const destIcon = L.divIcon({
      className: 'custom-leaflet-marker-dest',
      html: `<div style="background-color:#059669; color:white; padding:6px 10px; border-radius:12px; font-weight:bold; font-size:11px; box-shadow:0 4px 12px rgba(5,150,105,0.4); border:2px solid white; display:flex; align-items:center; gap:4px; white-space:nowrap;">🧳 ${props.destination.name.split('(')[0].trim()}</div>`,
      iconSize: [130, 30],
      iconAnchor: [65, 15],
    });
    destMarker.setIcon(destIcon);
    destMarker.setPopupContent(`<b>${props.destination.name}</b><br/>Distance from DPS: <strong>${props.destination.km} km</strong>`);
  }

  if (routePolyline) {
    const latlngs = [
      [DPS_AIRPORT_COORDS.lat, DPS_AIRPORT_COORDS.lng],
      [destLat, destLng],
    ];
    routePolyline.setLatLngs(latlngs);
    const bounds = L.latLngBounds(latlngs);
    mapInstance.fitBounds(bounds, { padding: [40, 40] });
  }
}

onMounted(() => {
  setTimeout(() => {
    initLeafletMap();
  }, 100);
});

watch(() => props.destination, () => {
  updateMapMarkers();
}, { deep: true });

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-2">
    <!-- Map Header -->
    <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 font-bold text-slate-800">
        <span class="text-brand-600">🗺️</span>
        <span>OpenStreetMap Distance & Route</span>
      </div>
      <span class="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
        {{ props.destination.km }} km from DPS Airport
      </span>
    </div>

    <!-- Leaflet Map Container -->
    <div ref="mapContainer" class="w-full h-48 sm:h-56 z-0 bg-slate-100"></div>
  </div>
</template>
