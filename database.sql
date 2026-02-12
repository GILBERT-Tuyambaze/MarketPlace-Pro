-- =========================================================================
-- MARKETO E-COMMERCE DATABASE SETUP
-- =========================================================================
-- This SQL file creates all necessary tables and relationships for the
-- Marketo e-commerce marketplace platform.
--
-- Tables:
--   1. profiles - User profiles and roles
--   2. products - Product catalog
--   3. reviews - Product reviews and ratings
--   4. orders - Customer orders
--   5. order_items - Individual items in orders
--   6. cart_items - Shopping cart items
--
-- Run this file in Supabase SQL Editor to set up the database schema.
-- =========================================================================

-- =========================================================================
-- 1. PROFILES TABLE (Users/Sellers/Admins)
-- =========================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  
  -- Address information
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  
  -- User role and status
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin', 'editor', 'content_manager')),
  seller_status TEXT DEFAULT 'pending' CHECK (seller_status IN ('pending', 'approved', 'rejected', 'suspended')),
  seller_rating DECIMAL(3,2) DEFAULT 0.0,
  seller_reviews_count INTEGER DEFAULT 0,
  seller_since TIMESTAMP,
  
  -- Account metadata
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create index for frequent queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_seller_status ON profiles(seller_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. PRODUCTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic product info
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Pricing and stock
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku TEXT UNIQUE,
  
  -- Images
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  image TEXT,
  thumbnail TEXT,
  
  -- Seller information
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Product status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Ratings and reviews
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0,
  
  -- Product metadata
  is_featured BOOLEAN DEFAULT FALSE,
  is_discounted BOOLEAN DEFAULT FALSE,
  discount_percentage DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT price_check CHECK (original_price IS NULL OR original_price >= price)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_title_search ON products USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. REVIEWS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  comment TEXT,
  
  -- Review metadata
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. ORDERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Order info
  order_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Shipping address
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL,
  
  -- Billing address (optional, same as shipping by default)
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,
  
  -- Payment info
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_intent_id TEXT,
  
  -- Tracking
  tracking_number TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Enable RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 5. ORDER ITEMS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Item details
  product_title TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  
  -- Seller info
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);

-- Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 6. CART ITEMS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Cart item details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one product per user in cart
  UNIQUE(user_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Enable RLS for cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================================================

-- Profiles: Users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (role IN ('seller', 'admin'));

-- Products: Anyone can view approved products, sellers can view/edit own
CREATE POLICY "Approved products are public" ON products
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Sellers can view own products" ON products
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert products" ON products
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own products" ON products
  FOR UPDATE USING (seller_id = auth.uid());

-- Reviews: Anyone can view, authenticated users can insert
CREATE POLICY "Reviews are publicly visible" ON reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Orders: Users can view own orders, admins can view all
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (user_id = auth.uid());

-- Order Items: Inherit from orders
CREATE POLICY "Order items follow order visibility" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- Cart Items: Users can only see/modify their own cart
CREATE POLICY "Users can view own cart" ON cart_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add to own cart" ON cart_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart" ON cart_items
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete from own cart" ON cart_items
  FOR DELETE USING (user_id = auth.uid());

-- =========================================================================
-- UTILITY FUNCTIONS
-- =========================================================================

-- Function to update product rating based on reviews
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id), 0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product rating when review is added or modified
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount = NEW.subtotal + NEW.tax_amount + NEW.shipping_cost - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate order total
CREATE TRIGGER trigger_calculate_order_total
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_order_total();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('orders_id_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers (if not exists)
CREATE SEQUENCE IF NOT EXISTS orders_id_seq START WITH 1000;

-- Trigger to generate order number
CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
CREATE TRIGGER trigger_update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to products
CREATE TRIGGER trigger_update_products_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to reviews
CREATE TRIGGER trigger_update_reviews_timestamp
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to orders
CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to cart_items
CREATE TRIGGER trigger_update_cart_items_timestamp
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- VIEW: Order summary with seller information
-- =========================================================================
CREATE OR REPLACE VIEW order_summaries AS
SELECT 
  o.id,
  o.order_number,
  o.user_id,
  o.status,
  o.total_amount,
  o.created_at,
  o.updated_at,
  COUNT(oi.id) as item_count,
  COUNT(DISTINCT oi.seller_id) as seller_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.user_id, o.status, o.total_amount, o.created_at, o.updated_at;

-- =========================================================================
-- SAMPLE DATA (Optional - for testing)
-- =========================================================================
-- Uncomment below to insert sample test data

/*
-- Insert a test admin user (you'll need to do this through Supabase Auth UI)
-- Then update the profile:
INSERT INTO profiles (id, email, full_name, role, is_verified, created_at)
VALUES ('YOUR_ADMIN_UUID', 'admin@example.com', 'Admin User', 'admin', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test sellers
INSERT INTO profiles (id, email, full_name, role, seller_status, seller_since, is_verified, created_at)
VALUES 
  ('seller-1-uuid', 'seller1@example.com', 'Tech Store', 'seller', 'approved', NOW(), true, NOW()),
  ('seller-2-uuid', 'seller2@example.com', 'Fashion Hub', 'seller', 'approved', NOW(), true, NOW()),
  ('seller-3-uuid', 'seller3@example.com', 'Home Goods', 'seller', 'approved', NOW(), true, NOW())
ON CONFLICT (id) DO NOTHING;
*/

-- =========================================================================
-- DATABASE SETUP COMPLETE
-- =========================================================================
-- All tables, views, functions, and security policies have been created.
-- 
-- Next steps:
-- 1. Set up authentication via Supabase Auth
-- 2. Create user profiles for initial admin and sellers
-- 3. Start inserting products through the application
-- 4. Configure additional business logic as needed
-- =========================================================================
