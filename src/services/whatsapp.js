/**
 * WhatsApp Notification & Dispatcher Service (FR-6)
 * Simulates n8n -> Kirimdev WhatsApp Gateway with English message templates
 * BagTransit (Your Bags Move. You Explore.)
 */

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://bagtransit.id';
}

export const WA_TEMPLATES = {
  confirmed: (booking) => `🎉 *Booking Confirmed!* — *BagTransit Bali*
Hi *${booking.customer_name}*, your luggage delivery booking is confirmed!

📋 *Booking Code:* \`${booking.booking_code}\`
📍 *Route:* ${formatRouteName(booking.route_type)}
🏨 *From:* ${booking.pickup_location}
📍 *To:* ${booking.dropoff_location}
🧳 *Bags:* ${booking.bag_count} item(s)
💰 *Paid:* ${booking.foreign_currency} ${booking.foreign_amount} (${booking.payment_channel})

🔗 *Live Track Your Bags:*
${getOrigin()}/#/track?code=${booking.booking_code}

Need help? Reply to this message anytime.
_Your Bags Move. You Explore._`,

  assigned: (booking, courier) => `🛵 *Courier Assigned* — *BagTransit*
Hi *${booking.customer_name}*, courier *${courier?.name || 'Wayan'}* (${courier?.vehicle_plate || 'DK 8291 AB'}) has been assigned to your booking \`${booking.booking_code}\`.

Estimated pickup time: *${formatTime(booking.pickup_datetime)}*.

Track live: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  picked_up: (booking, courier, proofUrl) => `🧳 *Luggage Picked Up!* — *BagTransit*
Hi *${booking.customer_name}*, our courier *${courier?.name || 'Wayan'}* has safely collected your ${booking.bag_count} luggage item(s) from *${booking.pickup_location}* with verified security seals.

${proofUrl ? `📸 *Pickup Proof:* ${proofUrl}\n` : ''}Your bags are now being safely transferred to our secure transit hub.
Track status: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  in_transit: (booking, courier) => `🚚 *Bags In Transit to Destination* — *BagTransit*
Hi *${booking.customer_name}*, your luggage is on the road heading to *${booking.dropoff_location}*!

Courier: *${courier?.name || 'Wayan'}* (${courier?.phone || '+628123456701'})
Estimated arrival: within 45-60 mins.

Track status: ${getOrigin()}/#/track?code=${booking.booking_code}`,

  delivered: (booking, proofUrl) => `✅ *Luggage Delivered Safely!* — *BagTransit*
Hi *${booking.customer_name}*, your ${booking.bag_count} luggage item(s) have been successfully delivered to:

📍 *Location:* ${booking.dropoff_location}
${booking.hotel_room ? `🚪 *Room:* ${booking.hotel_room}\n` : ''}${proofUrl ? `📸 *Delivery Proof Photo:* ${proofUrl}\n` : ''}
All security seals intact. Thank you for choosing BagTransit Bali! Enjoy exploring the Island of the Gods 🌴

Review your delivery: ${getOrigin()}/#/track?code=${booking.booking_code}`,
};

function formatRouteName(routeType) {
  if (routeType === 'airport_to_hotel') return '✈️ Airport ➔ Hotel / Villa';
  if (routeType === 'hotel_to_airport') return '🏨 Hotel / Villa ➔ Airport';
  if (routeType === 'hotel_to_hotel') return '🧳 Hotel ➔ Hotel';
  return routeType;
}

function formatTime(dateStr) {
  if (!dateStr) return 'Promptly';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Trigger WhatsApp Notification via Backend / n8n simulator
 */
export async function sendWhatsAppNotification({ booking, status, courier, proofUrl }) {
  const templateFn = WA_TEMPLATES[status];
  if (!templateFn) {
    console.warn(`[WhatsApp] No template defined for status: ${status}`);
    return null;
  }

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
    // Send to backend endpoint
    const res = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.log('[WhatsApp Notification Simulated]', payload);
    return {
      success: true,
      simulated: true,
      messageId: 'wa_' + Date.now(),
      payload,
    };
  }
}

/**
 * Generate Direct WhatsApp Concierge Support Link
 */
export function getWhatsAppConciergeLink(bookingCode = '') {
  const phone = '628179344777';
  const text = encodeURIComponent(
    `Hello BagTransit Support, I need assistance regarding my luggage booking${bookingCode ? ` [Code: ${bookingCode}]` : ''}.`
  );
  return `https://wa.me/${phone}?text=${text}`;
}
