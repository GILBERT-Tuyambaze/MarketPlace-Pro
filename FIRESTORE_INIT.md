# 🚀 Firestore Initialization Guide

This guide explains how to initialize your Firestore database with sample data using the `initFirestore.js` script.

## 📋 Prerequisites

Before running the script, make sure you have:

1. ✅ **Node.js installed** (v16+)
   - Check: `node --version`
   - Download: [nodejs.org](https://nodejs.org)

2. ✅ **Firebase project created**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Create a new project or use existing

3. ✅ **Firestore Database enabled**
   - In Firebase Console → Firestore Database → Create Database
   - Start in **Test mode** for development

4. ✅ **Firebase credentials in `.env.local`**
   - Must have `VITE_FIREBASE_*` variables set

---

## 🔧 Step 1: Update Environment Variables

Make sure your `.env.local` has all Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### How to Get These Credentials:

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ **Project Settings** (top left)
4. Go to **"Your apps"** tab
5. Click your web app
6. Copy the config object
7. Paste into `.env.local`

---

## 🎯 Step 2: Run the Initialization Script

### Option A: Using Node.js (Recommended)

```powershell
# Navigate to project directory
cd c:\Users\GBs\Documents\Codes\Projects\marketo\v

# Run the script
node initFirestore.js
```

### Option B: Using pnpm

If you want to run it as a npm script, add to `package.json`:

```json
{
  "scripts": {
    "init:firestore": "node initFirestore.js"
  }
}
```

Then run:
```powershell
pnpm init:firestore
```

---

## ✅ Expected Output

When successful, you should see:

```
🚀 Starting Firestore initialization...

🔧 Initializing Firebase with config...
   Project ID: your-project-id
✅ Firebase initialized

📝 Creating sample profiles...
   ✅ Created profile: Admin User (admin)
   ✅ Created profile: Tech Store (seller)
   ✅ Created profile: Fashion Hub (seller)
   ✅ Created profile: John Doe (buyer)
   ✅ Created profile: Jane Smith (buyer)
✅ All profiles created

📦 Creating sample products...
   ✅ Created product: Premium Wireless Headphones
      ➕ Added 2 reviews
   ✅ Created product: Comfortable Cotton T-Shirt
      ➕ Added 2 reviews
   ✅ Created product: Smart LED Bulb
      ➕ Added 2 reviews
✅ All products created

📋 Creating sample order...
   ✅ Order created: abc123xyz...
      ➕ Added order item
✅ Order created successfully

🛒 Creating sample cart items...
   ✅ Added cart item 1
   ✅ Added cart item 2
✅ Cart items created

==================================================
🎉 Firestore initialization complete!
==================================================

📊 Database Summary:
   ✅ 5 profiles created (1 admin, 2 sellers, 2 buyers)
   ✅ 3 products created with 6 reviews
   ✅ 1 sample order created
   ✅ 2 cart items created

🌐 Ready to use in your application!
```

---

## 🔍 Verify Data in Firestore

After running the script, verify data was created:

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. You should see these collections:
   - ✅ `profiles` - 5 documents
   - ✅ `products` - 3 documents
   - ✅ `reviews` - 6 documents
   - ✅ `orders` - 1 document
   - ✅ `order_items` - 1 document
   - ✅ `cart_items` - 2 documents

---

## 🐛 Troubleshooting

### ❌ Error: "Firebase config is invalid"

**Solution:** Check your `.env.local` has all required variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### ❌ Error: "Permission denied"

**Possible causes:**
1. Firestore Database not created
2. Security rules are too restrictive

**Solution:**
1. Create Firestore Database in **Test mode**
2. Update security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null || request.time < timestamp.date(2027, 12, 31);
    }
  }
}
```

### ❌ Error: "Cannot find module 'firebase/app'"

**Solution:** Install Firebase again:
```powershell
pnpm add firebase
```

### ❌ Script hangs or doesn't complete

**Solution:** 
1. Check internet connection
2. Make sure Firestore Database is enabled
3. Check Firebase console for errors

---

## 📊 What Data Gets Created

### Profiles (5 total)

| Email | Name | Role |
|-------|------|------|
| admin@example.com | Admin User | admin |
| seller1@example.com | Tech Store | seller |
| seller2@example.com | Fashion Hub | seller |
| buyer1@example.com | John Doe | buyer |
| buyer2@example.com | Jane Smith | buyer |

### Products (3 total)

| Product | Price | Category | Stock |
|---------|-------|----------|-------|
| Premium Wireless Headphones | $79.99 | electronics | 25 |
| Comfortable Cotton T-Shirt | $24.99 | clothing | 50 |
| Smart LED Bulb | $19.99 | home | 100 |

### Orders & Reviews

- **Reviews:** 6 total (2 per product)
- **Orders:** 1 sample order with 1 item
- **Cart:** 2 sample cart items

---

## 🔄 Re-initialize Database

If you want to clear and reinitialize:

### Option 1: Delete Collections Manually

1. Go to Firestore Database in Firebase Console
2. Right-click each collection
3. Click **Delete collection**
4. Confirm
5. Run the script again

### Option 2: Clear Using Script

Create a `clearFirestore.js`:

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearDatabase() {
  const collections = ['profiles', 'products', 'reviews', 'orders', 'order_items', 'cart_items'];
  
  for (const collName of collections) {
    const ref = collection(db, collName);
    const docs = await getDocs(ref);
    
    for (const doc of docs.docs) {
      await deleteDoc(doc.ref);
    }
    console.log(`✅ Cleared ${collName}`);
  }
  
  console.log("🗑️ Database cleared!");
}

clearDatabase();
```

---

## 🎯 Next Steps

After initialization:

1. ✅ Verify data in Firestore Console
2. ✅ Test your app at `http://localhost:5174`
3. ✅ Try logging in with:
   - **Email:** buyer1@example.com
   - **Password:** (Create via Firebase Auth or manually)
4. ✅ Browse products on `/products` page
5. ✅ Add items to cart
6. ✅ Check orders on `/orders` page

---

## 💡 Usage in Your App

Once data is initialized, you can:

### Fetch Products
```tsx
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, query, where } from 'firebase/firestore';

const productsRef = collection(db, 'products');
const q = query(productsRef, where('status', '==', 'approved'));
const snapshot = await getDocs(q);
```

### Add to Cart
```tsx
const cartRef = collection(db, 'cart_items');
await addDoc(cartRef, {
  user_id: currentUser.uid,
  product_id: productId,
  quantity: 1
});
```

### Get User Orders
```tsx
const ordersRef = collection(db, 'orders');
const q = query(ordersRef, where('user_id', '==', currentUser.uid));
const snapshot = await getDocs(q);
```

---

## ⚠️ Important Notes

- **Test Mode Only:** These security rules are for development only
- **No Real Auth:** The UIDs are hardcoded, not from real authentication
- **Replace Before Production:** Use proper security rules before going live
- **Backup Data:** Consider exporting data before clearing
- **Real Images:** Sample data uses Unsplash URLs - replace with your own

---

## 📞 Support

If you encounter issues:

1. Check Firestore Console for error details
2. Review browser DevTools Console (F12)
3. Check `.env.local` credentials are correct
4. Verify Firestore Database is in Test mode
5. Make sure Node.js is installed

---

**🎉 Your Firestore database is now ready to use!**
