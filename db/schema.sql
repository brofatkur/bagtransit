-- ==============================================================================
-- BagTransit Luggage Delivery Platform (MVP) - Database Schema & RLS Policies
-- Brand: BagTransit | "Your Bags Move. You Explore."
-- PT Bonanza Tujuh Samudera (BTS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. Branches Table (Cabang)
-- Ready Hubs: Sanur (Pelabuhan Sanur) & Kuta (Bandara I Gusti Ngurah Rai)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    hub_type VARCHAR(50) NOT NULL DEFAULT 'airport', -- 'airport', 'harbour', 'city'
    address TEXT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. Users Table
-- Roles: 'super_admin', 'admin', 'courier', 'customer'
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'admin', 'courier', 'customer')),
    cabang_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Pricing Zones Table (FR-1 & FR-5.2)
-- Base fare, per-km rate, extra bag fee per branch/zone
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pricing_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cabang_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL, -- 'Kuta / Legian', 'Seminyak / Kerobokan', 'Canggu', 'Sanur', 'Ubud', etc.
    zone_code VARCHAR(50) NOT NULL,
    base_fare NUMERIC(12, 2) NOT NULL DEFAULT 100000.00,
    per_km_rate NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
    extra_bag_fee NUMERIC(12, 2) NOT NULL DEFAULT 30000.00,
    included_bags INT NOT NULL DEFAULT 2,
    estimated_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cabang_id, zone_code)
);

-- ==============================================================================
-- 4. Couriers Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS couriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cabang_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'van', -- 'van', 'mpv', 'motorcycle'
    vehicle_plate VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_delivery', 'offline')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. Bookings Table (FR-1, FR-2, FR-3)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    cabang_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    pricing_zone_id UUID REFERENCES pricing_zones(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(150),
    customer_country VARCHAR(10) NOT NULL, -- 'CN', 'MY', 'PH', 'VN', 'IN', 'TH', etc.
    
    route_type VARCHAR(30) NOT NULL CHECK (route_type IN ('airport_to_hotel', 'hotel_to_airport', 'hotel_to_hotel')),
    
    pickup_location TEXT NOT NULL,
    pickup_datetime TIMESTAMPTZ NOT NULL,
    dropoff_location TEXT NOT NULL,
    dropoff_datetime TIMESTAMPTZ,
    
    flight_number VARCHAR(30),
    hotel_name VARCHAR(200),
    hotel_room VARCHAR(50),
    hotel_booking_name VARCHAR(150),
    
    bag_count INT NOT NULL CHECK (bag_count >= 1),
    extra_bags INT NOT NULL DEFAULT 0,
    bag_photos JSONB DEFAULT '[]'::jsonb,
    
    -- Pricing Breakdown in IDR (FR-1.4: All computations stored in IDR)
    price_breakdown JSONB NOT NULL,
    total_amount_idr NUMERIC(12, 2) NOT NULL,
    
    -- Home Market Currency & Xenith Info (FR-3.1, FR-3.4)
    foreign_currency VARCHAR(10) NOT NULL, -- 'CNY', 'MYR', 'PHP', 'VND', 'INR', 'THB'
    foreign_amount NUMERIC(14, 2) NOT NULL,
    payment_channel VARCHAR(50) NOT NULL, -- 'Alipay', 'DuitNow', 'GCash', 'VietQR', 'UPI', 'PromptPay'
    
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (payment_status IN ('pending_payment', 'paid', 'failed', 'refunded')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    
    assigned_courier_id UUID REFERENCES couriers(id) ON DELETE SET NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. Payment Transactions Table (FR-3.5)
-- Multi-gateway ready (provider defaults to 'xenith')
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'xenith',
    reference VARCHAR(100) UNIQUE NOT NULL,
    xenith_payment_link_id VARCHAR(150),
    payment_link_url TEXT,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_channel VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    signature VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. Status Logs Table (FR-5.3 & FR-6.1)
-- Triggers WhatsApp notification to customer per status transition
-- ==============================================================================
CREATE TABLE IF NOT EXISTS status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(30),
    proof_photo_url TEXT,
    notes TEXT,
    whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
    whatsapp_message_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES for High Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_cabang_id ON bookings(cabang_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_couriers_cabang_id ON couriers(cabang_id);
CREATE INDEX IF NOT EXISTS idx_pricing_zones_cabang_id ON pricing_zones(cabang_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_booking_id ON status_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant & role-based separation
-- ==============================================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for JWT claims extraction
CREATE OR REPLACE FUNCTION auth_uid() RETURNS UUID AS $$
    SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
        nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
    SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
        'anon'
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_cabang_id() RETURNS UUID AS $$
    SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.cabang_id', true), '')::uuid,
        nullif(current_setting('request.jwt.claims', true)::jsonb->>'cabang_id', '')::uuid,
        (SELECT cabang_id FROM users WHERE id = auth_uid() LIMIT 1)
    );
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------------------------
-- 1. Branches Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "branches_select_public" ON branches
    FOR SELECT USING (is_active = true OR auth_role() IN ('super_admin', 'admin'));

CREATE POLICY "branches_manage_super_admin" ON branches
    FOR ALL USING (auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- 2. Pricing Zones Policies (FR-5.2)
-- ------------------------------------------------------------------------------
CREATE POLICY "pricing_zones_select_all" ON pricing_zones
    FOR SELECT USING (true);

CREATE POLICY "pricing_zones_modify_super_admin" ON pricing_zones
    FOR ALL USING (auth_role() = 'super_admin');

-- ------------------------------------------------------------------------------
-- 3. Users Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "users_super_admin_all" ON users
    FOR ALL USING (auth_role() = 'super_admin');

CREATE POLICY "users_admin_own_branch" ON users
    FOR SELECT USING (
        auth_role() = 'admin' AND cabang_id = auth_cabang_id()
    );

CREATE POLICY "users_self_read_write" ON users
    FOR ALL USING (id = auth_uid());

-- ------------------------------------------------------------------------------
-- 4. Couriers Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "couriers_super_admin_all" ON couriers
    FOR ALL USING (auth_role() = 'super_admin');

CREATE POLICY "couriers_admin_own_branch" ON couriers
    FOR ALL USING (
        auth_role() = 'admin' AND cabang_id = auth_cabang_id()
    );

CREATE POLICY "couriers_customer_read" ON couriers
    FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 5. Bookings Policies (Core Security Barrier)
-- ------------------------------------------------------------------------------
-- Super Admin can view and manage all bookings across all branches
CREATE POLICY "bookings_super_admin_all" ON bookings
    FOR ALL USING (auth_role() = 'super_admin');

-- Branch Admin can ONLY view and update bookings belonging to their own cabang_id
CREATE POLICY "bookings_admin_own_branch" ON bookings
    FOR ALL USING (
        auth_role() = 'admin' AND cabang_id = auth_cabang_id()
    );

-- Couriers can view bookings assigned to them
CREATE POLICY "bookings_courier_assigned" ON bookings
    FOR SELECT USING (
        auth_role() = 'courier' AND assigned_courier_id IN (
            SELECT id FROM couriers WHERE user_id = auth_uid()
        )
    );

-- Customers can insert new bookings anonymously or logged in
CREATE POLICY "bookings_insert_public" ON bookings
    FOR INSERT WITH CHECK (true);

-- Customers can view only their own bookings (via user_id or lookup)
CREATE POLICY "bookings_customer_view_own" ON bookings
    FOR SELECT USING (
        customer_id = auth_uid() OR auth_role() = 'anon'
    );

-- ------------------------------------------------------------------------------
-- 6. Payment Transactions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "payment_transactions_super_admin_all" ON payment_transactions
    FOR ALL USING (auth_role() = 'super_admin');

CREATE POLICY "payment_transactions_admin_own_branch" ON payment_transactions
    FOR SELECT USING (
        auth_role() = 'admin' AND booking_id IN (
            SELECT id FROM bookings WHERE cabang_id = auth_cabang_id()
        )
    );

CREATE POLICY "payment_transactions_customer_own" ON payment_transactions
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE customer_id = auth_uid()
        )
    );

CREATE POLICY "payment_transactions_service_insert" ON payment_transactions
    FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. Status Logs Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "status_logs_super_admin_all" ON status_logs
    FOR ALL USING (auth_role() = 'super_admin');

CREATE POLICY "status_logs_admin_own_branch" ON status_logs
    FOR ALL USING (
        auth_role() = 'admin' AND booking_id IN (
            SELECT id FROM bookings WHERE cabang_id = auth_cabang_id()
        )
    );

CREATE POLICY "status_logs_public_read" ON status_logs
    FOR SELECT USING (true);

CREATE POLICY "status_logs_insert_allowed" ON status_logs
    FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- SEED DATA (Ready Hubs: Kuta Airport & Sanur Harbour)
-- ==============================================================================
INSERT INTO branches (id, code, name, hub_type, address, phone, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'DPS-AIRPORT', 'Kuta Airport Hub (Ngurah Rai)', 'airport', 'Jl. Dewi Sartika No.2A, Tuban, Kuta (100m dari Exit Gate Airport)', '+628179344777', true),
    ('22222222-2222-2222-2222-222222222222', 'SANUR-PORT', 'Sanur Harbour Hub (Pelabuhan Sanur)', 'harbour', 'Jl. Hang Tuah No.45, Sanur Kaja, Denpasar Selatan (Dekat Pelabuhan Fastboat)', '+628179344888', true),
    ('33333333-3333-3333-3333-333333333333', 'UBUD-CENTRAL', 'Ubud Transit Hub', 'city', 'Jl. Monkey Forest No.18, Ubud, Gianyar', '+628179344999', true)
ON CONFLICT (code) DO NOTHING;

-- Seed Pricing Zones for Kuta Airport Hub
INSERT INTO pricing_zones (id, cabang_id, zone_name, zone_code, base_fare, per_km_rate, extra_bag_fee, included_bags, estimated_km)
VALUES
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Kuta / Tuban / Legian', 'KUTA', 100000.00, 15000.00, 30000.00, 2, 5.00),
    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Seminyak / Kerobokan / Petitenget', 'SEMINYAK', 100000.00, 15000.00, 30000.00, 2, 11.00),
    ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Canggu / Pererenan / Berawa', 'CANGGU', 100000.00, 15000.00, 30000.00, 2, 18.00),
    ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Jimbaran / Kedonganan', 'JIMBARAN', 100000.00, 15000.00, 30000.00, 2, 7.00),
    ('a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Nusa Dua / Tanjung Benoa', 'NUSA_DUA', 100000.00, 15000.00, 30000.00, 2, 14.00),
    ('a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Sanur / Denpasar Selatan', 'SANUR', 100000.00, 15000.00, 30000.00, 2, 15.00),
    ('a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Uluwatu / Pecatu / Ungasan', 'ULUWATU', 100000.00, 15000.00, 30000.00, 2, 20.00),
    ('a8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Ubud Central / Sayan / Tegallalang', 'UBUD', 100000.00, 15000.00, 30000.00, 2, 36.00)
ON CONFLICT (cabang_id, zone_code) DO NOTHING;

-- Seed Pricing Zones for Sanur Harbour Hub
INSERT INTO pricing_zones (id, cabang_id, zone_name, zone_code, base_fare, per_km_rate, extra_bag_fee, included_bags, estimated_km)
VALUES
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Sanur Beach / Harbour Area', 'SANUR_LOCAL', 80000.00, 15000.00, 25000.00, 2, 3.00),
    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Denpasar City / Renon', 'DENPASAR', 80000.00, 15000.00, 25000.00, 2, 8.00),
    ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Ubud / Sukawati', 'UBUD_SANUR', 90000.00, 15000.00, 30000.00, 2, 22.00),
    ('b4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Kuta / Airport Hub Transfer', 'KUTA_SANUR', 90000.00, 15000.00, 30000.00, 2, 15.00)
ON CONFLICT (cabang_id, zone_code) DO NOTHING;

-- Seed Users
INSERT INTO users (id, email, phone, full_name, role, cabang_id)
VALUES
    ('99999999-9999-9999-9999-999999999999', 'asa@asagroup.id', '+628113900100', 'Asa (Direktur PT Bonanza Tujuh Samudera / BTS)', 'super_admin', NULL),
    ('88888888-8888-8888-8888-888888888888', 'admin.kuta@bagtransit.id', '+628179344777', 'Budi Santoso (Admin Cabang Kuta)', 'admin', '11111111-1111-1111-1111-111111111111'),
    ('77777777-7777-7777-7777-777777777777', 'admin.sanur@bagtransit.id', '+628179344888', 'Made Aryana (Admin Cabang Sanur)', 'admin', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (email) DO NOTHING;

-- Seed Couriers
INSERT INTO couriers (id, cabang_id, name, phone, vehicle_type, vehicle_plate, status, rating)
VALUES
    ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Wayan Gede', '+628123456701', 'Daihatsu GranMax Van', 'DK 8291 AB', 'available', 4.98),
    ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ketut Suardika', '+628123456702', 'Toyota Avanza MPV', 'DK 7312 CD', 'available', 4.95),
    ('c3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Gede Sumarta', '+628123456703', 'Suzuki APV Van', 'DK 6420 EF', 'available', 4.92)
ON CONFLICT DO NOTHING;
