# BagTransit — Your Bags Move. You Explore. 🧳🌴

**Brand:** BagTransit
**Tagline:** Your Bags Move. You Explore.
**Owner:** Asa, Direktur PT Bonanza Tujuh Samudera (BTS)
**Version:** MVP 1.0.0

---

## 🌟 Overview

**BagTransit** is an end-to-end luggage delivery platform for international tourists in Bali. It enables travelers to land at I Gusti Ngurah Rai International Airport (DPS) or Sanur Harbour, hand over their suitcases, and explore Bali immediately without carrying heavy bags. Luggage is securely transported directly to hotels and villas across South Bali (Kuta, Legian, Seminyak, Canggu, Jimbaran, Nusa Dua, Sanur, Uluwatu, Ubud).

### Key Highlights:
- **Flat Bundle Pricing (FR-1):** 1–2 bags covered under a single flat base fare (`Rp 100,000`) + distance rate (`Rp 15,000/km`) + extra bag add-ons (`Rp 30,000/bag`).
- **Ready Hubs:**
  - **Kuta Airport Hub (Ngurah Rai):** Jl. Dewi Sartika No.2A, Tuban (100m from Airport Exit Gate).
  - **Sanur Harbour Hub:** Jl. Hang Tuah No.45, Sanur Kaja (near Nusa Penida/Lembongan fastboat port).
- **Localized Asian Payments via Xenith Pay (FR-3):** Instant payment via home-country payment rails:
  - 🇨🇳 China: **Alipay (CNY)**
  - 🇲🇾 Malaysia: **DuitNow QR / Touch 'n Go (MYR)**
  - 🇵🇭 Philippines: **GCash (PHP)**
  - 🇻🇳 Vietnam: **VietQR / MoMo (VND)**
  - 🇮🇳 India: **UPI (INR)**
  - 🇹🇭 Thailand: **PromptPay (THB)**
- **Automated WhatsApp Dispatches (FR-6):** Real-time notifications in English triggered on status change (`Confirmed`, `Courier Assigned`, `Picked Up`, `In Transit`, `Delivered` with photo proof).
- **Role Isolation & Postgres RLS (FR-5, NFR-1):** Strict Row Level Security ensuring branch admins only see their own branch's bookings.
- **Dynamic Pricing Editor (FR-5.2):** Super admins can update base fares and per-km rates live without redeploying code.

---

## 🏗️ Architecture & Project Structure

```
bagtransit/
├── public/
│   ├── favicon.ico
│   ├── icons/
│   │   ├── logo.svg
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── icon-512x512-maskable.png
│   └── manifest.webmanifest
├── db/
│   └── schema.sql                 # Postgres DDL + RLS Policies + Seed Data
├── server/
│   └── index.js                   # Backend Express server (Xenith Pay API, Webhooks, WhatsApp)
├── src/
│   ├── assets/
│   │   └── main.css               # Tailwind CSS + Glassmorphism styles
│   ├── components/
│   │   ├── Navbar.vue             # Header with role switcher & ready hub indicators
│   │   ├── XenithPaymentModal.vue # Interactive Xenith checkout & QR simulation
│   │   ├── PricingEditorModal.vue # Super Admin dynamic pricing rate editor
│   │   ├── StatusUpdateModal.vue  # Branch Admin courier dispatch & proof upload
│   │   └── ManualBookingModal.vue # Walk-in / phone booking creator
│   ├── views/
│   │   ├── customer/
│   │   │   ├── BookingView.vue    # Interactive booking wizard + live fare breakdown
│   │   │   └── TrackingView.vue   # Live status timeline & proof photo gallery
│   │   ├── admin/
│   │   │   └── AdminDashboard.vue # Branch-scoped operations center
│   │   ├── super-admin/
│   │   │   └── SuperAdminDashboard.vue # Cross-branch executive analytics
│   │   └── auth/
│   │       └── LoginView.vue      # Role-based 1-click test authentication
│   ├── services/
│   │   ├── pricing.js             # Fare formula engine (FR-1)
│   │   ├── xenith.js              # Currency converter & payment channels (FR-3)
│   │   ├── db.js                  # Unified RLS-enforced storage & local state
│   │   ├── insforge.js            # Insforge Postgres BaaS adapter
│   │   └── whatsapp.js            # WhatsApp notification dispatcher (FR-6)
│   ├── stores/
│   │   └── auth.js                # Session state & preset test accounts
│   ├── router/
│   │   └── index.js               # Vue Router with role guards
│   ├── App.vue
│   └── main.js
├── test/
│   └── verify_all.js              # Automated test suite (33 passing tests)
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🚀 Getting Started Locally

### 1. Install Dependencies
```bash
cd /Users/macos/.gemini/antigravity/scratch/bagtransit
npm install
```

### 2. Run the Development Server
```bash
# Run Vite Dev Server (Port 5173)
npm run dev

# Or run both frontend and backend server concurrently:
npm start
```

### 3. Run Automated Verification Tests
```bash
node test/verify_all.js
```

### 4. Build Production Bundle
```bash
npm run build
```

---

## 🔒 Security & Secrets Separation (NFR-2)

- **Client Bundle (`dist/`):** Contains zero Xenith or database service secrets.
- **Backend (`server/index.js`):** Handles payment link HMAC signing, webhook signature verification (`x-xenith-signature`), and idempotency checks.

---

## 📄 License & Attribution
© 2026 **BagTransit** — PT Bonanza Tujuh Samudera (BTS). All rights reserved.
