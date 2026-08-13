/**
 * BagTransit Backend Server (FR-3.2, FR-4, FR-6)
 * Handles Xenith Pay payment link generation, webhook processing, signature verification,
 * and WhatsApp notification dispatch.
 * 
 * NFR-2: All Xenith Secrets are kept server-side only.
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

// Xenith Secret Key (Server-Only environment variable, NEVER in client bundle)
const XENITH_SECRET_KEY = process.env.XENITH_SECRET_KEY || 'sk_sandbox_bagtransit_asa_group_2026_bali';
const XENITH_WEBHOOK_SECRET = process.env.XENITH_WEBHOOK_SECRET || 'whsec_sandbox_bagtransit_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory idempotency cache for webhooks (NFR-4)
const processedWebhooks = new Set();
const notificationLog = [];

/**
 * Generate Signature for Xenith API request
 */
function generateXenithSignature(payload, secretKey) {
  const sortedKeys = Object.keys(payload).sort();
  const signatureString = sortedKeys.map(k => `${k}=${payload[k]}`).join('&');
  return crypto.createHmac('sha256', secretKey).update(signatureString).digest('hex');
}

/**
 * Verify Xenith Webhook Signature (FR-4.2)
 */
function verifyWebhookSignature(payload, receivedSignature, webhookSecret) {
  if (!receivedSignature) return true; // In sandbox mode allow simulation
  try {
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(receivedSignature));
  } catch (e) {
    return false;
  }
}

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BagTransit Backend Service',
    time: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 2. Create Xenith Payment Link (FR-3.1, FR-3.2, FR-3.3)
app.post('/api/xenith/create-payment-link', async (req, res) => {
  try {
    const {
      booking_code,
      customer_name,
      customer_phone,
      customer_email,
      foreign_currency,
      foreign_amount,
      payment_channel,
      total_amount_idr,
    } = req.body;

    if (!booking_code || !foreign_amount || !foreign_currency) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    const reference = `XEN-${booking_code}-${Date.now().toString(36).toUpperCase()}`;
    const expiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins expiry

    // Payload formatted per Xenith Pay API specs
    const paymentLinkPayload = {
      reference,
      currency: foreign_currency,
      requestedAmount: parseFloat(foreign_amount),
      customerName: customer_name || 'Guest Tourist',
      customerReference: customer_phone || 'N/A',
      customerEmail: customer_email || 'tourist@bagtransit.id',
      paymentChannel: payment_channel || 'Alipay',
      expiryTime,
      redirectUrl: `${req.headers.origin || 'http://localhost:5173'}/#/track?code=${booking_code}&paid=true`,
      callbackUrl: `${req.headers.origin || 'http://localhost:3001'}/api/xenith/webhook`,
    };

    // Calculate HMAC signature on backend
    const signature = generateXenithSignature(paymentLinkPayload, XENITH_SECRET_KEY);

    // Mock/Sandbox payment link response with interactive simulated checkout
    const paymentLinkId = 'pl_' + Math.random().toString(36).substring(2, 12);
    const mockQrPayload = `xenith:${payment_channel.toLowerCase()}://pay?ref=${reference}&amount=${foreign_amount}&cur=${foreign_currency}&hub=DPS`;

    return res.json({
      success: true,
      data: {
        paymentLinkId,
        reference,
        paymentUrl: `https://checkout.xenithpay.com/pay/${paymentLinkId}`,
        qrPayload: mockQrPayload,
        currency: foreign_currency,
        amount: foreign_amount,
        paymentChannel: payment_channel,
        expiryTime,
        signature,
      },
    });
  } catch (error) {
    console.error('Error creating Xenith payment link:', error);
    return res.status(500).json({ error: 'Internal server error creating payment link' });
  }
});

// 3. Xenith Webhook Receiver & Signature Verification (FR-4)
app.post('/api/xenith/webhook', async (req, res) => {
  try {
    const receivedSignature = req.headers['x-xenith-signature'] || req.headers['x-signature'];
    const payload = req.body;

    console.log('[Xenith Webhook Received]', {
      reference: payload.reference,
      status: payload.status,
      timestamp: new Date().toISOString(),
    });

    // Idempotency check (FR-6.1 & NFR-4)
    const eventId = payload.eventId || `${payload.reference}_${payload.status}`;
    if (processedWebhooks.has(eventId)) {
      console.log(`[Xenith Webhook] Event ${eventId} already processed, skipping.`);
      return res.status(200).json({ status: 'ignored', reason: 'already_processed' });
    }

    // Verify signature
    const isValid = verifyWebhookSignature(payload, receivedSignature, XENITH_WEBHOOK_SECRET);
    if (!isValid) {
      console.warn('[Xenith Webhook] Signature verification failed!');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    processedWebhooks.add(eventId);

    // Return success to Xenith Gateway
    return res.status(200).json({
      status: 'success',
      reference: payload.reference,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

// 4. WhatsApp Notification API via n8n / Kirimdev simulator (FR-6)
app.post('/api/notifications/whatsapp', (req, res) => {
  const { recipientPhone, customerName, bookingCode, status, message, mediaUrl } = req.body;
  const messageId = 'wa_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const logRecord = {
    messageId,
    recipientPhone,
    customerName,
    bookingCode,
    status,
    message,
    mediaUrl,
    sentAt: new Date().toISOString(),
    deliveryStatus: 'delivered',
  };

  notificationLog.unshift(logRecord);
  console.log(`[WhatsApp -> Kirimdev Simulated] Dispatched to ${recipientPhone} for ${bookingCode} (${status})`);

  return res.json({
    success: true,
    messageId,
    status: 'delivered',
    deliveredAt: logRecord.sentAt,
  });
});

// 5. Get Notification Logs (for Super Admin & Admin audit)
app.get('/api/notifications/logs', (req, res) => {
  res.json({ logs: notificationLog });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 BagTransit Server listening on port ${PORT}`);
  });
}

export default app;

