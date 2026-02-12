# Testing Guide - MarketPlace Pro

## Default Test Credentials

### For Regular Users/Customers:
```
Email: test@example.com
Password: test123456
```

### For Admin:
```
Email: admin@example.com
Password: admin123456
```

## Auto-Seeded Sample Products

When you log in with any of the test credentials for the **first time**, the system automatically adds 10 sample products to your account:

1. **Wireless Bluetooth Headphones** - $79.99 (electronics)
2. **Premium Cotton T-Shirt** - $24.99 (fashion)
3. **Smart Home LED Light Bulb** - $19.99 (electronics)
4. **Yoga Mat with Carrying Strap** - $34.99 (sports)
5. **Stainless Steel Water Bottle** - $29.99 (sports)
6. **Bestseller Fiction Novel** - $14.99 (books-media)
7. **Natural Face Moisturizer** - $24.99 (beauty)
8. **Ceramic Kitchen Knife Set** - $44.99 (home-garden)
9. **Portable Phone Charger** - $34.99 (electronics)
10. **Cozy Winter Beanie** - $16.99 (fashion)

## How Testing Works

### Quick Start:
1. Go to `/login` page
2. Pre-filled credentials are displayed with a "Demo Credentials" card
3. Click "Sign in" button
4. Sample products are automatically created on first login
5. Visit `/products` to see the sample products with images and details

### Manual Testing:
- If you need to reseed products, simply clear the database products for that user and log in again
- The system checks if the user has products; if not, it automatically adds the 10 sample products
- All sample products are marked as "approved" and ready for sale

## Sample Data Details

### Location of Data:
- **Seed Data File**: `src/lib/seedData.ts` - Contains all sample product definitions
- **Integration Points**:
  - Login Page (`src/pages/Login.tsx`)
  - Register Page (`src/pages/Register.tsx`)
  - Admin Login Page (`src/pages/AdminLogin.tsx`)

### Sample Product Features:
- Includes professional images from Unsplash
- Multiple categories (electronics, fashion, sports, beauty, books-media, home-garden)
- Realistic pricing ($14.99 - $79.99)
- Stock availability (30-120 units per product)
- Tags for better searchability

## Customizing Test Data

To add or modify sample products:
1. Open `src/lib/seedData.ts`
2. Edit the `SAMPLE_PRODUCTS` array
3. Add/modify product objects with properties:
   - `title`: Product name
   - `description`: Product description
   - `price`: Product price
   - `stock`: Available quantity
   - `category`: Product category
   - `tags`: Search tags
   - `images`: Array of image URLs
   - `status`: 'approved' or 'pending'

4. Save and re-login with test credentials to see the changes

## Notes

- Default credentials are visible on login pages for convenience during testing
- Sample products are only created once per user (on first login)
- All sample products use public Unsplash images
- To reset, manually delete products from the database and log in again
