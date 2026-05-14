-- PASAR MITRA: INITIAL SCHEMA MIGRATION --

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'DISTRIBUTOR', 'UMKM');
CREATE TYPE partnership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'TERMINATED');
CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE negotiation_status AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- 2. CORE IDENTITY & PROFILES
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'UMKM',
    is_verified BOOLEAN DEFAULT FALSE,
    reputation_score DECIMAL(3,2) DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distributor Specifics
CREATE TABLE distributors (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    nib_number TEXT UNIQUE, -- Business ID
    address TEXT,
    city TEXT,
    category_id UUID, -- References categories
    min_order_value DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ
);

-- UMKM Specifics
CREATE TABLE umkm (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    owner_name TEXT,
    shop_address TEXT,
    coordinates POINT, -- For location based routing
    deleted_at TIMESTAMPTZ
);

-- 3. CATALOG
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES distributors(id) NOT NULL,
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    images TEXT[], -- Storage paths
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tiered Pricing (Wholesale)
CREATE TABLE wholesale_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    UNIQUE(product_id, min_quantity)
);

-- 4. PARTNERSHIP ENGINE
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES distributors(id) NOT NULL,
    umkm_id UUID REFERENCES umkm(id) NOT NULL,
    status partnership_status DEFAULT 'PENDING',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, umkm_id)
);

-- 5. ORDERS & TRANSACTIONS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umkm_id UUID REFERENCES umkm(id) NOT NULL,
    distributor_id UUID REFERENCES distributors(id) NOT NULL,
    partnership_id UUID REFERENCES partnerships(id),
    status order_status DEFAULT 'PENDING_PAYMENT',
    total_amount DECIMAL(12,2) NOT NULL,
    commission_fee DECIMAL(12,2) NOT NULL, -- Platform fee
    shipping_address TEXT NOT NULL,
    tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(12,2) NOT NULL
);

-- 6. NEGOTIATIONS (One-on-One Chat Rooms)
CREATE TABLE negotiations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umkm_id UUID REFERENCES umkm(id) NOT NULL,
    distributor_id UUID REFERENCES distributors(id) NOT NULL,
    product_id UUID REFERENCES products(id),
    status negotiation_status DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    is_system_msg BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. REVIEWS (Verified Purchase Only)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) UNIQUE,
    umkm_id UUID REFERENCES umkm(id),
    distributor_id UUID REFERENCES distributors(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SYSTEM
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    body TEXT,
    payload JSONB, -- For deep linking
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INDEXES FOR SCALE
CREATE INDEX idx_products_distributor ON products(distributor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_umkm ON orders(umkm_id);
CREATE INDEX idx_orders_distributor ON orders(distributor_id);
CREATE INDEX idx_partnerships_composite ON partnerships(distributor_id, umkm_id);
CREATE INDEX idx_messages_negotiation ON messages(negotiation_id, created_at DESC);

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES ---

-- Profiles: Users can view all (for marketplace context), but only edit self.
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products: Everyone can view active products. Only distributors can manage own products.
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (is_available = true AND deleted_at IS NULL);
CREATE POLICY "Distributors can manage own products" ON products FOR ALL 
USING (auth.uid() = distributor_id) 
WITH CHECK (auth.uid() = distributor_id);

-- Partnerships: Involved parties only.
CREATE POLICY "Partners can see their own partnerships" ON partnerships FOR SELECT 
USING (auth.uid() = distributor_id OR auth.uid() = umkm_id);

-- Orders: Locked to buyer or seller.
CREATE POLICY "Orders are viewable by buyer or seller" ON orders FOR SELECT 
USING (auth.uid() = umkm_id OR auth.uid() = distributor_id);

-- Conversations: Only participants can read/write.
CREATE POLICY "Messages are restricted to participants" ON messages FOR ALL 
USING (EXISTS (
    SELECT 1 FROM negotiations n 
    WHERE n.id = negotiation_id 
    AND (n.umkm_id = auth.uid() OR n.distributor_id = auth.uid())
));

-- Notifications: Strictly private.
CREATE POLICY "Users can only see own notifications" ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 11. TRIGGERS
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
