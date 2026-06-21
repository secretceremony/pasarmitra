-- ==========================================
-- PASAR MITRA: POSTGRESQL DATABASE SCHEMA
-- Matches the Firebase Firestore data model exactly.
-- Useful for Supabase, Hasura, or raw PostgreSQL.
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS & TYPE DEFINITIONS
CREATE TYPE user_role AS ENUM ('ADMIN', 'DISTRIBUTOR', 'UMKM');
CREATE TYPE wallet_tx_direction AS ENUM ('credit', 'debit');
CREATE TYPE wallet_tx_type AS ENUM ('order_payment', 'payout', 'refund');
CREATE TYPE wallet_tx_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE negotiation_status AS ENUM ('open', 'accepted', 'rejected', 'countered', 'checked_out');
CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE dispute_status AS ENUM ('open', 'resolved', 'cancelled');

-- 2. CORE USERS & PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'UMKM',
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    reputation_score DECIMAL(3,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for profile lookups
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);

-- 3. PRODUCTS & CATALOG
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Sembako',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    min_order_quantity INT NOT NULL DEFAULT 1,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'Pcs',
    image_url VARCHAR(512),
    is_active BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for marketplace & inventory
CREATE INDEX idx_products_distributor ON products(distributor_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Wholesale Tiered Pricing
CREATE TABLE wholesale_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    min_quantity INT NOT NULL,
    price_per_unit DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, min_quantity)
);

-- 4. ORDERS & TRANSACTIONS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    distributor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    distributor_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_address TEXT NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_proof_url VARCHAR(512),
    payment_verified_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    shipping_receipt VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for orders
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_distributor ON orders(distributor_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_type VARCHAR(50) DEFAULT 'Pcs'
);

-- 5. FINANCE Ledger (Wallet & Payouts)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    direction wallet_tx_direction NOT NULL,
    type wallet_tx_type NOT NULL,
    status wallet_tx_status NOT NULL DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for wallet statements
CREATE INDEX idx_wallet_distributor ON wallet_transactions(distributor_id);
CREATE INDEX idx_wallet_created_at ON wallet_transactions(created_at DESC);

-- Payout / Withdrawal Requests
CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    distributor_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status payout_status NOT NULL DEFAULT 'pending',
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    admin_id UUID REFERENCES profiles(id)
);

CREATE INDEX idx_payouts_distributor ON payout_requests(distributor_id);
CREATE INDEX idx_payouts_status ON payout_requests(status);

-- 6. NEGOTIATIONS (One-on-One Chat Rooms)
CREATE TABLE negotiations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    distributor_name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(12,2) NOT NULL,
    target_price DECIMAL(12,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status negotiation_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_negotiations_buyer ON negotiations(buyer_id);
CREATE INDEX idx_negotiations_distributor ON negotiations(distributor_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);

-- Chat Messages inside Negotiations
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_system_msg BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_negotiation ON messages(negotiation_id, created_at DESC);

-- 7. DISPUTES / CONFLICT RESOLUTIONS
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES profiles(id) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    distributor_id UUID REFERENCES profiles(id) NOT NULL,
    distributor_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolution TEXT,
    admin_decision TEXT,
    admin_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- 8. PRODUCT REVIEWS (Verified Purchase Only)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON reviews(product_id);

-- 9. SYSTEM NOTIFICATIONS & LOGS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    payload JSONB, -- JSON data for deep linking
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Admin Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'VERIFY_DISTRIBUTOR', 'RESOLVE_DISPUTE'
    entity_name VARCHAR(100) NOT NULL, -- e.g., 'profiles', 'disputes'
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 10. DATABASE TRIGGERS (Auto Updated Timestamps)
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE trigger_update_timestamp();
CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE trigger_update_timestamp();
CREATE TRIGGER update_orders_timestamp BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE trigger_update_timestamp();
CREATE TRIGGER update_negotiations_timestamp BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE PROCEDURE trigger_update_timestamp();
CREATE TRIGGER update_disputes_timestamp BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE PROCEDURE trigger_update_timestamp();
