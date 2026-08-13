/**
 * Xenith Pay Service (FR-3)
 * BagTransit (Your Bags Move. You Explore.)
 * 
 * IMPORTANT: No secret keys are stored in client code (NFR-2).
 * Payment link creation and signing are handled via the backend service /api/xenith/*
 */

export const COUNTRY_PAYMENT_MAP = {
  CN: {
    countryName: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    channel: 'Alipay',
    channelDisplayName: 'Alipay / 支付宝',
    icon: '🇨🇳',
    paymentType: 'qr_wallet',
    instructions: 'Scan QR with Alipay or WeChat Pay',
  },
  MY: {
    countryName: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    channel: 'DuitNow QR',
    channelDisplayName: 'DuitNow QR / Touch \'n Go',
    icon: '🇲🇾',
    paymentType: 'qr_national',
    instructions: 'Scan QR with any Malaysian banking app or e-wallet',
  },
  PH: {
    countryName: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    channel: 'GCash',
    channelDisplayName: 'GCash / Maya',
    icon: '🇵🇭',
    paymentType: 'qr_wallet',
    instructions: 'Scan QR code via GCash or Maya app',
  },
  VN: {
    countryName: 'Vietnam',
    currency: 'VND',
    currencySymbol: '₫',
    channel: 'VietQR',
    channelDisplayName: 'VietQR / MoMo',
    icon: '🇻🇳',
    paymentType: 'qr_national',
    instructions: 'Quét mã VietQR bằng app ngân hàng atau MoMo',
  },
  IN: {
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    channel: 'UPI',
    channelDisplayName: 'UPI (GPay / PhonePe / Paytm)',
    icon: '🇮🇳',
    paymentType: 'qr_national',
    instructions: 'Scan UPI QR using Google Pay, PhonePe, or Paytm',
  },
  TH: {
    countryName: 'Thailand',
    currency: 'THB',
    currencySymbol: '฿',
    channel: 'PromptPay',
    channelDisplayName: 'PromptPay QR',
    icon: '🇹🇭',
    paymentType: 'qr_national',
    instructions: 'Scan PromptPay QR with Thai Mobile Banking',
  },
};

/**
 * Indicative FX Rates (1 Foreign Currency Unit to IDR)
 * In production, this can be synced via Xenith FX API or daily ECB rates.
 */
export const FX_RATES_TO_IDR = {
  CNY: 2280.0,   // 1 CNY = ~Rp 2,280
  MYR: 3580.0,   // 1 MYR = ~Rp 3,580
  PHP: 285.0,    // 1 PHP = ~Rp 285
  VND: 0.65,     // 1 VND = ~Rp 0.65 (or 10,000 VND = ~Rp 6,500)
  INR: 192.0,    // 1 INR = ~Rp 192
  THB: 465.0,    // 1 THB = ~Rp 465
};

/**
 * Convert amount from IDR to target foreign currency
 * 
 * @param {number} idrAmount
 * @param {string} currency - e.g. 'CNY', 'MYR'
 * @returns {number} Foreign amount formatted for payment
 */
export function convertIdrToCurrency(idrAmount, currency) {
  const rate = FX_RATES_TO_IDR[currency] || 1;
  const converted = idrAmount / rate;

  if (currency === 'VND') {
    // VND usually has no decimals, round to nearest 1000
    return Math.round(converted / 1000) * 1000;
  }
  if (currency === 'INR' || currency === 'THB' || currency === 'PHP') {
    return Math.round(converted);
  }
  // CNY, MYR to 2 decimals
  return Math.round(converted * 100) / 100;
}

/**
 * Format foreign currency display string
 * 
 * @param {number} amount
 * @param {string} currency
 * @returns {string} e.g. "¥ 135.96" or "RM 86.59"
 */
export function formatCurrency(amount, currency) {
  const meta = Object.values(COUNTRY_PAYMENT_MAP).find(c => c.currency === currency);
  const symbol = meta?.currencySymbol || currency;
  
  if (currency === 'VND') {
    return `${Number(amount).toLocaleString('vi-VN')} ${symbol}`;
  }
  return `${symbol} ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: currency === 'CNY' || currency === 'MYR' ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Request Xenith Payment Link from server endpoint (FR-3.2)
 * Client delegates creation to backend to avoid exposing secret key.
 */
export async function createXenithPaymentLink(bookingData) {
  const response = await fetch('/api/xenith/create-payment-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create payment link: ${response.statusText}`);
  }

  return await response.json();
}
