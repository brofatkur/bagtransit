/**
 * WhatsApp Order & Notification Service
 * Bali Luggage Pickup & Delivery (PT Bonanza Tujuh Samudera / ASA Group)
 * 
 * Direct WhatsApp Booking & Order Dispatch to Official Customer Service
 */

import { MAIN_WHATSAPP } from '../data/destinations.js';

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://bagtransit.vercel.app';
}

function formatRouteName(routeType) {
  if (routeType === 'airport_to_hotel') return '✈️ Airport (DPS) ➔ Hotel / Villa';
  if (routeType === 'hotel_to_airport') return '🏨 Hotel / Villa ➔ Airport (DPS)';
  if (routeType === 'hotel_to_hotel') return '🧳 Hotel ➔ Hotel';
  return routeType;
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'ASAP / Immediate';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Generate structured WhatsApp Booking Order message for 1-Click WhatsApp Order
 */
export function generateWhatsAppOrderMessage(booking) {
  const code = booking.booking_code || `BT-${Date.now().toString().slice(-6)}`;
  const bags = booking.bag_count || 2;
  const priceIdr = (booking.total_amount_idr || 0).toLocaleString('id-ID');
  const foreignAmount = booking.foreign_amount ? `${booking.foreign_currency} ${booking.foreign_amount}` : '';

  return `*BOOKING ORDER — BALI BAGMOVE* 🧳🌴
_Enjoy Bali, Luggage-Free. • PT Bonanza Tujuh Samudera (BTS)_

📋 *Booking Code:* \`${code}\`
👤 *Customer Name:* ${booking.customer_name || 'Guest'}
📱 *WhatsApp/Phone:* ${booking.customer_phone || '-'}
🌏 *Country:* ${booking.customer_country || 'International'}

📍 *Route:* ${formatRouteName(booking.route_type)}
🛫 *Pickup Point:* ${booking.pickup_location || 'Ngurah Rai Airport (DPS)'}
🛬 *Dropoff Point:* ${booking.dropoff_location || 'Hotel/Villa'}
${booking.flight_number ? `✈️ *Flight Number:* ${booking.flight_number}\n` : ''}${booking.hotel_room ? `🚪 *Room / Booking Name:* ${booking.hotel_room}\n` : ''}🕒 *Pickup Date & Time:* ${formatDateTime(booking.pickup_datetime)}

🧳 *Luggage Quantity:* ${bags} Bag(s) ${bags <= 2 ? '(Bundle Flat Included)' : `(2 Included + ${bags - 2} Extra)`}
💰 *Total Amount:* *Rp ${priceIdr}* ${foreignAmount ? `(~ ${foreignAmount})` : ''}
💳 *Payment Preference:* ${booking.payment_channel || 'Pay upon Pickup / On-Site QRIS / Online'}

${booking.notes ? `📝 *Notes:* ${booking.notes}\n` : ''}🔗 *Live Tracking Link:*
${getOrigin()}/#/track?code=${code}

---------------------------------------
_Hello Bali BagMove Concierge, I would like to confirm my luggage delivery booking._`;
}

/**
 * Get Direct WhatsApp Click-to-Chat URL with prefilled order text
 */
export function getWhatsAppOrderUrl(booking, customPhone = null) {
  const phone = customPhone || MAIN_WHATSAPP;
  const message = generateWhatsAppOrderMessage(booking);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * WhatsApp Status Notification Templates (for Admin updates)
 */
export const WA_TEMPLATES = {
  confirmed: (booking) => `🎉 *Booking Confirmed!* — *Bali BagMove*
Hi *${booking.customer_name}*, your luggage delivery is confirmed!

📋 *Code:* \`${booking.booking_code}\`
📍 *Route:* ${formatRouteName(booking.route_type)}
🏨 *From:* ${booking.pickup_location}
📍 *To:* ${booking.dropoff_location}
🧳 *Bags:* ${booking.bag_count} item(s)
💰 *Total:* Rp ${(booking.total_amount_idr || 0).toLocaleString('id-ID')}

🔗 *Live Track Your Bags:*
${getOrigin()}/#/track?code=${booking.booking_code}

_Enjoy Bali, Luggage-Free. — Bali BagMove_`,

  assigned: (booking, courier) => `🛵 *Courier Dispatched* — *Bali BagMove*
Hi *${booking.customer_name}*, courier *${courier?.name || 'Wayan'}* (${courier?.vehicle_plate || 'DK 8291 AB'}) has been assigned to your booking \`${booking.booking_code}\`.

Pickup Time: *${formatDateTime(booking.pickup_datetime)}*.
Track: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  picked_up: (booking, courier, proofUrl) => `🧳 *Luggage Picked Up!* — *Bali BagMove*
Hi *${booking.customer_name}*, our courier *${courier?.name || 'Wayan'}* has safely collected your ${booking.bag_count} luggage item(s) from *${booking.pickup_location}* with tamper-proof security seals.

${proofUrl ? `📸 *Photo Proof:* ${proofUrl}\n` : ''}Your bags are in safe transit to the destination.
Track: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  in_transit: (booking, courier) => `🚚 *Bags In Transit to Destination* — *Bali BagMove*
Hi *${booking.customer_name}*, your luggage is on the way to *${booking.dropoff_location}*!

Courier: *${courier?.name || 'Wayan'}* (${courier?.phone || '+62 851-7249-1244'})
Track: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  delivered: (booking, proofUrl) => `✅ *Luggage Delivered Safely!* — *Bali BagMove*
Hi *${booking.customer_name}*, your ${booking.bag_count} luggage item(s) have arrived safely at:

📍 *Destination:* ${booking.dropoff_location}
${booking.hotel_room ? `🚪 *Room:* ${booking.hotel_room}\n` : ''}${proofUrl ? `📸 *Delivery Proof Photo:* ${proofUrl}\n` : ''}
All seals intact. Enjoy exploring Bali hands-free! 🌴

Review: ${getOrigin()}/#/track?code=${booking.booking_code}`,
};

/**
 * Dispatch WhatsApp notification
 */
export async function sendWhatsAppNotification({ booking, status, courier, proofUrl }) {
  const templateFn = WA_TEMPLATES[status];
  if (!templateFn) return null;

  const messageText = templateFn(booking, courier, proofUrl);
  const payload = {
    recipientPhone: booking.customer_phone,
    customerName: booking.customer_name,
    bookingCode: booking.booking_code,
    status,
    message: messageText,
    mediaUrl: proofUrl || null,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return {
      success: true,
      simulated: true,
      messageId: 'wa_' + Date.now(),
      payload,
    };
  }
}

export function getWhatsAppConciergeLink(bookingCode = '') {
  const text = encodeURIComponent(
    `Hello Bali Luggage Support, I need assistance regarding my luggage delivery${bookingCode ? ` [Code: ${bookingCode}]` : ''}.`
  );
  return `https://wa.me/${MAIN_WHATSAPP}?text=${text}`;
}
