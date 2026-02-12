# ✨ Complete Firestore + React Setup - Quick Reference

This document provides a quick step-by-step guide to get your Marketo e-commerce app running with Firestore.

---

## 📋 Setup Checklist

### ✅ Step 1: Firebase Project Creation (5 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add Project"** → Name: `marketo-ecommerce`
3. Create a **Web App** (</> icon)
4. Copy your Firebase config
5. Paste credentials into `.env.local`

**Your `.env.local` should look like:**
```env
VITE_FIREBASE_API_KEY=AIza***your_actual_key***
VITE_FIREBASE_AUTH_DOMAIN=marketo-ecommerce.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=marketo-ecommerce
VITE_FIREBASE_STORAGE_BUCKET=marketo-ecommerce.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### ✅ Step 2: Enable Firestore (2 minutes)

1. In Firebase Console → **Firestore Database**
2. Click **"Create Database"**
3. Start in **Test mode** (for development)
4. Choose region closest to you

### ✅ Step 3: Run Initialization Script (1 minute)

```powershell
# Navigate to project
cd c:\Users\GBs\Documents\Codes\Projects\marketo\v

# Option A: Using Node directly
node initFirestore.js

# Option B: Using pnpm (if you prefer)
pnpm init:firestore
```

**Expected output:**
```
🎉 Firestore initialization complete!
✅ 5 profiles created (1 admin, 2 sellers, 2 buyers)
✅ 3 products created with 6 reviews
✅ 1 sample order created
✅ 2 cart items created
```

### ✅ Step 4: Verify in Firebase Console (1 minute)

1. Go to Firestore Database in Firebase Console
2. Verify these collections exist:
   - `profiles` (5 docs)
   - `products` (3 docs)
   - `reviews` (6 docs)
   - `orders` (1 doc)
   - `order_items` (1 doc)
   - `cart_items` (2 docs)

### ✅ Step 5: Test Your App (2 minutes)

```powershell
# Start dev server
pnpm run dev

# Open in browser
http://localhost:5174
```

**Try these:**
- Browse `/products` - See 3 sample products
- View product details
- See ratings & reviews
- Check `/orders` page

---

## 🔍 Sample Data Details

### Test Users (with IDs for reference)

```
Admin User
├─ Email: admin@example.com
├─ ID: admin_uid_12345
└─ Role: admin

Tech Store (Seller)
├─ Email: seller1@example.com
├─ ID: seller1_uid_12345
├─ Rating: 4.8/5 (156 reviews)
└─ Status: approved

Fashion Hub (Seller)
├─ Email: seller2@example.com
├─ ID: seller2_uid_12345
├─ Rating: 4.6/5 (89 reviews)
└─ Status: approved

Buyers
├─ John Doe (buyer1@example.com) - buyer1_uid_12345
└─ Jane Smith (buyer2@example.com) - buyer2_uid_12345
```

### Sample Products

```
1. Premium Wireless Headphones ($79.99)
   ├─ Category: electronics
   ├─ Stock: 25
   ├─ Rating: 4.7/5 (342 reviews)
   ├─ Seller: Tech Store
   └─ Image: Realistic product photo

2. Comfortable Cotton T-Shirt ($24.99)
   ├─ Category: clothing
   ├─ Stock: 50
   ├─ Rating: 4.5/5 (128 reviews)
   ├─ Seller: Fashion Hub
   └─ Discount: 28%

3. Smart LED Bulb ($19.99)
   ├─ Category: home
   ├─ Stock: 100
   ├─ Rating: 4.3/5 (215 reviews)
   ├─ Seller: Tech Store
   └─ WiFi-enabled
```

---

## 📁 Files Created/Modified

### New Files
- ✅ `initFirestore.js` - Database initialization script
- ✅ `src/lib/firebaseClient.ts` - Firebase client configuration
- ✅ `FIREBASE_SETUP.md` - Detailed Firebase setup guide
- ✅ `FIRESTORE_INIT.md` - Initialization script guide
- ✅ `DATABASE_SETUP.md` - SQL schema (still valid if using Supabase)

### Modified Files
- ✅ `.env.local` - Added Firebase credentials
- ✅ `package.json` - Added `init:firestore` script

---

## 🚀 Common Commands

```powershell
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Initialize Firestore with sample data
pnpm init:firestore
# or
node initFirestore.js

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

---

## 🔥 Firebase Services Available

### 1. Authentication (Ready to Use)

```typescript
import { auth } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Sign in
await signInWithEmailAndPassword(auth, email, password);

// Sign up
await createUserWithEmailAndPassword(auth, email, password);

// Current user
const user = auth.currentUser;
```

### 2. Firestore Database (Sample Data Ready)

```typescript
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Get all products
const products = await getDocs(collection(db, 'products'));

// Query products by category
const q = query(collection(db, 'products'), where('category', '==', 'electronics'));
const results = await getDocs(q);
```

### 3. Cloud Storage

```typescript
import { storage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload & get URL
const storageRef = ref(storage, 'products/image.jpg');
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

### 4. Analytics (Optional)

```typescript
import { analytics } from '@/lib/firebaseClient';
import { logEvent } from 'firebase/analytics';

// Track events
logEvent(analytics, 'product_view', { product_id: '123' });
logEvent(analytics, 'add_to_cart', { product_id: '123', quantity: 2 });
```

---

## 🔐 Security Rules (Development)

Your Firestore security rules for test mode:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read on approved products
    match /products/{doc=**} {
      allow read: if resource.data.status == 'approved';
    }
    
    // Allow anyone to read reviews
    match /reviews/{doc=**} {
      allow read: if true;
    }
    
    // Users can only access their own data
    match /profiles/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    match /cart_items/{doc=**} {
      allow read, write: if request.auth != null;
    }
    
    match /orders/{doc=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.user_id;
    }
  }
}
```

⚠️ **These are development rules. Update before production!**

---

## 🚨 Troubleshooting

### Issue: "Cannot find module firebase"

**Solution:**
```powershell
pnpm add firebase
```

### Issue: "Firebase config is invalid"

**Solution:** Check `.env.local` has all `VITE_FIREBASE_*` variables

### Issue: "Permission denied" errors

**Solution:** 
1. Make sure Firestore Database is in **Test mode**
2. Update security rules (see above)

### Issue: Script doesn't run

**Solution:**
```powershell
# Make sure you're in the project directory
cd c:\Users\GBs\Documents\Codes\Projects\marketo\v

# Verify Node.js is installed
node --version

# Try with pnpm
pnpm init:firestore
```

### Issue: Data not appearing in Firestore

**Solution:**
1. Check browser console for errors (F12)
2. Check Firebase Console > Firestore > (wait for sync)
3. Refresh the Firestore console page
4. Verify internet connection

---

## 📊 What's Next?

After initialization, you can:

1. **Create Firebase Authentication Users**
   - Email & password sign up/login
   - Google sign-in
   - Email verification

2. **Build Product Features**
   - Browse products by category
   - Search & filter
   - View reviews & ratings
   - Add/remove from cart

3. **Build Order Features**
   - Create orders
   - Track order status
   - Payment integration (Stripe)

4. **Add More Features**
   - User profiles
   - Wishlist
   - Product recommendations
   - Admin dashboard
   - Seller analytics

---

## 🎯 Project Structure

```
marketo/
├── src/
│   ├── lib/
│   │   ├── firebaseClient.ts     ← Firebase config
│   │   ├── mockProducts.ts       ← Sample products
│   │   └── supabaseClient.ts     ← Supabase config
│   ├── pages/
│   │   ├── Products.tsx          ← Product listing
│   │   ├── ProductDetail.tsx     ← Product detail
│   │   ├── Cart.tsx              ← Shopping cart
│   │   ├── Orders.tsx            ← User orders
│   │   └── ...
│   └── context/
│       ├── AuthContext.tsx       ← Auth state
│       └── CartContext.tsx       ← Cart state
│
├── initFirestore.js              ← Initialization script
├── database.sql                  ← Supabase schema
├── .env.local                    ← Credentials
└── package.json                  ← Dependencies & scripts
```

---

## 🎓 Learning Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Firestore Guide:** https://firebase.google.com/docs/firestore
- **Firebase Auth:** https://firebase.google.com/docs/auth
- **React + Firebase:** https://www.youtube.com/results?search_query=react+firebase
- **Firestore Best Practices:** https://firebase.google.com/docs/firestore/best-practices

---

## ✅ Final Checklist

- [ ] Firebase project created
- [ ] Firestore Database enabled in Test mode
- [ ] Firebase credentials in `.env.local`
- [ ] `initFirestore.js` script run successfully
- [ ] Sample data verified in Firebase Console
- [ ] Development server running (`pnpm run dev`)
- [ ] App accessible at `http://localhost:5174`
- [ ] Products visible on `/products` page
- [ ] Ready to start building! 🚀

---

## 🎉 You're All Set!

Your Marketo e-commerce platform now has:
- ✅ React 18 + Vite frontend
- ✅ Firestore database with sample data
- ✅ Firebase authentication ready
- ✅ Cloud storage configured
- ✅ 10 mock products for testing
- ✅ Role-based dashboards
- ✅ Shopping cart functionality

**Start building amazing features!**

---

**Questions?** Check the detailed guides:
- `FIREBASE_SETUP.md` - Firebase configuration
- `FIRESTORE_INIT.md` - Initialization script
- `MOCK_PRODUCTS_GUIDE.md` - Mock data
- `DATABASE_SETUP.md` - Supabase schema (if using)
