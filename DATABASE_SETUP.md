# 🗄️ Database Setup Guide

This guide explains how to set up the Marketo e-commerce database in Supabase using the `database.sql` file.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Schema Overview](#database-schema-overview)
3. [Setup Instructions](#setup-instructions)
4. [Verify Setup](#verify-setup)
5. [Sample Data](#sample-data)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- ✅ Supabase account (free at [supabase.com](https://supabase.com))
- ✅ A Supabase project created
- ✅ Your project URL and API keys (get from Project Settings)

## Database Schema Overview

### Tables Created:

#### 1. **profiles** (Users/Sellers/Admins)
- Stores user account information
- Supports multiple roles: `buyer`, `seller`, `admin`, `editor`, `content_manager`
- Tracks seller ratings and verification status
- Includes address information

```
Columns: id, email, full_name, avatar_url, bio, phone, address, 
         city, state, postal_code, country, role, seller_status, 
         seller_rating, seller_reviews_count, seller_since, is_verified,
         created_at, updated_at
```

#### 2. **products** (Product Catalog)
- Main product inventory table
- Links to seller via `seller_id`
- Tracks pricing, stock, images, ratings
- Supports product status workflow: `pending → approved → sold`

```
Columns: id, title, name, description, category, tags, price, 
         original_price, currency, stock, sku, images, image, 
         thumbnail, seller_id, status, rating, reviews_count, 
         is_featured, is_discounted, discount_percentage, 
         created_at, updated_at, published_at
```

#### 3. **reviews** (Product Reviews)
- Stores customer reviews and ratings
- Links to products and reviewers
- Tracks helpful count and verified purchase status

```
Columns: id, product_id, reviewer_id, rating, title, comment, 
         helpful_count, verified_purchase, created_at, updated_at
```

#### 4. **orders** (Customer Orders)
- Complete order management
- Tracks shipping, billing, payment status
- Links to customers via `user_id`

```
Columns: id, user_id, order_number, status, subtotal, tax_amount, 
         shipping_cost, discount_amount, total_amount, 
         shipping_address, billing_address, payment_method, 
         payment_status, payment_intent_id, tracking_number, 
         estimated_delivery, customer_notes, admin_notes, 
         created_at, updated_at, delivered_at
```

#### 5. **order_items** (Individual Items in Orders)
- Links orders to products
- Stores product price at time of purchase
- Tracks seller per item

```
Columns: id, order_id, product_id, product_title, product_price, 
         quantity, subtotal, seller_id, created_at
```

#### 6. **cart_items** (Shopping Cart)
- Temporary storage for items in user's cart
- One entry per product per user
- Automatically cleaned up when order is created

```
Columns: id, user_id, product_id, quantity, added_at, updated_at
```

---

## Setup Instructions

### Step 1: Log into Supabase

1. Go to [app.supabase.com](https://app.supabase.com)
2. Sign in with your email and password
3. Select your project

### Step 2: Access the SQL Editor

1. Click on **SQL Editor** in the left sidebar
2. Click **+ New Query** button
3. Name it something like `"Database Setup"`

### Step 3: Copy and Execute the SQL

1. Open `database.sql` from your project root folder
2. Copy ALL the content (Ctrl+A, Ctrl+C)
3. Paste it into the Supabase SQL Editor
4. Click the **▶️ Run** button (or Ctrl+Enter)

**Expected Result:** You should see a series of green checkmarks with messages like:
- `CREATE TABLE`
- `CREATE INDEX`
- `CREATE POLICY`
- `CREATE FUNCTION`
- `CREATE TRIGGER`

### Step 4: Verify the Schema

1. Go to **Table Editor** in the left sidebar
2. You should see 6 tables:
   - `profiles`
   - `products`
   - `reviews`
   - `orders`
   - `order_items`
   - `cart_items`

✅ If all tables appear, your database is set up correctly!

---

## Verify Setup

### Check Tables and Columns

Click on each table in the Table Editor to verify columns are correct:

```bash
# profiles - Should have ~20 columns
id, email, full_name, avatar_url, role, seller_status, etc.

# products - Should have ~20 columns
id, title, name, description, category, price, seller_id, status, etc.

# reviews - Should have ~8 columns
id, product_id, reviewer_id, rating, title, comment, etc.

# orders - Should have ~24 columns
id, user_id, order_number, status, total_amount, etc.

# order_items - Should have ~8 columns
id, order_id, product_id, product_title, quantity, etc.

# cart_items - Should have ~5 columns
id, user_id, product_id, quantity, added_at, etc.
```

### Check Indexes

In Supabase SQL Editor, run:
```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

Should return 20+ indexes for optimal query performance.

### Check Security Policies

In Supabase SQL Editor, run:
```sql
SELECT policyname, tablename FROM pg_policies;
```

Should return RLS policies for each table.

---

## Sample Data

### Enable Authentication

Before adding data, set up Supabase Auth:

1. Go to **Authentication** in left sidebar
2. Click **Providers**
3. Enable **Email** provider (enabled by default)
4. Configure email templates if needed

### Create Test Users

#### Via Supabase Dashboard:

1. Go to **Authentication → Users**
2. Click **+ Add User**
3. Enter email: `test@example.com`
4. Password: `Test123456!`
5. Click **Create User**

#### Via SQL (Optional):

```sql
-- Insert admin user (after creating via Auth first)
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  role, 
  seller_status,
  is_verified, 
  created_at
)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  'approved',
  true,
  NOW()
FROM auth.users 
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO NOTHING;
```

### Insert Sample Products

In SQL Editor, uncomment the sample data section at the bottom of `database.sql`:

```sql
-- Insert test sellers
INSERT INTO profiles (id, email, full_name, role, seller_status, seller_since, is_verified, created_at)
VALUES 
  (gen_random_uuid(), 'seller1@example.com', 'Tech Store', 'seller', 'approved', NOW(), true, NOW()),
  (gen_random_uuid(), 'seller2@example.com', 'Fashion Hub', 'seller', 'approved', NOW(), true, NOW()),
  (gen_random_uuid(), 'seller3@example.com', 'Home Goods', 'seller', 'approved', NOW(), true, NOW());

-- Then insert products...
```

**Note:** Mock products are already available in the application (`src/lib/mockProducts.ts`) for development without database data.

---

## Using the Database in Your App

### Connection Info

Your app already has the connection configured:

```tsx
// src/context/AuthContext.tsx
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Example Queries

#### Fetch all approved products:
```sql
SELECT * FROM products 
WHERE status = 'approved' 
ORDER BY created_at DESC;
```

#### Get user's cart:
```sql
SELECT c.*, p.title, p.price, p.image 
FROM cart_items c
JOIN products p ON c.product_id = p.id
WHERE c.user_id = 'user-uuid'
ORDER BY c.added_at DESC;
```

#### Get user's orders:
```sql
SELECT * FROM orders 
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

#### Get order details:
```sql
SELECT oi.*, p.title 
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 'order-uuid';
```

---

## Troubleshooting

### ❌ Error: "Table already exists"

**Solution:** The table was already created. Either:
1. Drop the table first: `DROP TABLE table_name CASCADE;`
2. Or skip that section of the SQL

### ❌ Error: "Foreign key constraint violation"

**Solution:** Ensure parent tables exist before child tables:
- `profiles` must exist before `products`
- `products` must exist before `cart_items`, `reviews`, `orders`

### ❌ Error: "Permission denied"

**Solution:** Your Supabase role doesn't have permission. Use the admin account or ask project owner to run the SQL.

### ❌ RLS Policy Blocking Access

**Solution:** Check the RLS policies in **Authentication → Policies**. If you see "DENY" policies, users may be blocked from accessing data.

To temporarily disable RLS for testing:
```sql
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- etc.
```

⚠️ **Re-enable RLS before going to production!**

### ✅ Everything Looks Good!

If tables are created, indexes exist, and policies are in place, your database is ready!

---

## Next Steps

1. ✅ Set up authentication users
2. ✅ Insert sample products (via your app or SQL)
3. ✅ Test product listing on `/products` page
4. ✅ Test add to cart functionality
5. ✅ Create test orders
6. ✅ Configure payment gateway (Stripe)

---

## File References

- **SQL Schema:** `database.sql`
- **Connection:** `src/lib/supabaseClient.ts`
- **Auth Context:** `src/context/AuthContext.tsx`
- **Mock Products:** `src/lib/mockProducts.ts` (for development)

---

## Support

If you encounter issues:

1. **Check Supabase Logs:** Go to **Logs** in Supabase dashboard
2. **Check Network Tab:** Open DevTools (F12) → Network tab for API errors
3. **Check Console:** Look for JavaScript errors in DevTools Console
4. **Review Documentation:** [Supabase Docs](https://supabase.com/docs)

---

**🎉 Database setup is complete! Your e-commerce platform is ready to go!**
