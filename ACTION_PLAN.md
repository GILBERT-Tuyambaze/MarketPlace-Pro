# 🚀 Firebase Setup - Action Plan

Your Firebase project **marketplace-pro-24368** is ready! Here's what to do next.

---

## 🔴 URGENT: Secure Your Service Account Key

You have a sensitive Firebase Admin SDK key. Choose one:

### Option 1: Delete It (RECOMMENDED Now) ✅
```powershell
Remove-Item "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json"
```
- You can regenerate anytime from Firebase Console
- No risk of accidental exposure
- Perfect for development now

### Option 2: Secure It (If You Need Backend Admin)
```powershell
mkdir "c:\Users\GBs\Documents\Codes\Projects\marketo\v\config"

Move-Item `
  "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json" `
  "c:\Users\GBs\Documents\Codes\Projects\marketo\v\config\firebase-admin-key.json"

# Add to .gitignore (already done!)
```

---

## 📋 Your Firebase Project Info

```
✅ Project ID: marketplace-pro-24368
✅ Auth Domain: marketplace-pro-24368.firebaseapp.com
✅ Storage Bucket: marketplace-pro-24368.appspot.com
```

---

## 🔑 Step 1: Get Web App Config (5 minutes)

1. Go to: https://console.firebase.google.com
2. Select project: **marketplace-pro-24368**
3. Click ⚙️ **Project Settings** (top-left)
4. Go to **"Your apps"** tab
5. Find your **web app** → Click it
6. Copy the config that looks like:

```javascript
{
  apiKey: "AIza_...",
  authDomain: "marketplace-pro-24368.firebaseapp.com",
  projectId: "marketplace-pro-24368",
  storageBucket: "marketplace-pro-24368.appspot.com",
  messagingSenderId: "123456789...",
  appId: "1:123456789...",
  measurementId: "G-XXX..."
}
```

---

## 🔐 Step 2: Update `.env.local` (2 minutes)

Replace placeholder values in `c:\Users\GBs\Documents\Codes\Projects\marketo\v\.env.local`:

```env
# Firebase Configuration - Web App (Client-Side)
VITE_FIREBASE_API_KEY=AIza_YOUR_ACTUAL_KEY
VITE_FIREBASE_AUTH_DOMAIN=marketplace-pro-24368.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=marketplace-pro-24368
VITE_FIREBASE_STORAGE_BUCKET=marketplace-pro-24368.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Rest of your config (Supabase, Stripe, etc.)
VITE_SUPABASE_URL=...
# ...
```

**Where to copy each value from the web app config above ↑**

---

## 🔥 Step 3: Enable Firestore (2 minutes)

1. In Firebase Console → **Firestore Database**
2. Click **"Create Database"**
3. Select region (closest to users)
4. Start in **Test mode** (development)
5. Click **Create**

---

## 🌱 Step 4: Seed Sample Data (1 minute)

```powershell
# Navigate to project
cd c:\Users\GBs\Documents\Codes\Projects\marketo\v

# Run initialization
node initFirestore.js
# or
pnpm init:firestore
```

**Expected output:**
```
🎉 Firestore initialization complete!
✅ 5 profiles created
✅ 3 products created
✅ 1 sample order created
✅ 2 cart items created
```

---

## ✅ Step 5: Test Your App (2 minutes)

```powershell
# Restart dev server (fresh environment variables)
pnpm run dev

# Open browser
http://localhost:5174
```

**Try:**
- Browse `/products` → See 3 sample products
- View product details
- See ratings & reviews

---

## 📊 Verify Data in Firebase Console

1. Go to Firestore Database in Firebase Console
2. You should see these collections:
   - ✅ `profiles` (5 documents)
   - ✅ `products` (3 documents)
   - ✅ `reviews` (6 documents)
   - ✅ `orders` (1 document)
   - ✅ `order_items` (1 document)
   - ✅ `cart_items` (2 documents)

---

## ⏱️ Total Setup Time: ~15 minutes

| Step | Time | Status |
|------|------|--------|
| 1. Get Web App Config | 5 min | ⏳ TO-DO |
| 2. Update `.env.local` | 2 min | ⏳ TO-DO |
| 3. Enable Firestore | 2 min | ⏳ TO-DO |
| 4. Seed Sample Data | 1 min | ⏳ TO-DO |
| 5. Test App | 2 min | ⏳ TO-DO |
| **TOTAL** | **~12 min** | ⏳ |

---

## 🛡️ Security Checklist

- [ ] Service account key **secured** (deleted or moved)
- [ ] `.gitignore` updated (✅ already done)
- [ ] `.env.local` NOT committed (✅ in .gitignore)
- [ ] Web app credentials (public key) in `.env.local` only
- [ ] Admin SDK keys stored securely (if using backend)
- [ ] No credentials logged in console (production)

---

## 📁 Files Created/Updated for You

✅ **Created:**
- `FIREBASE_SECURITY.md` - Security best practices
- `initFirestore.js` - Data seeding script
- `src/lib/firebaseClient.ts` - Firebase config

✅ **Updated:**
- `.env.local` - Firebase placeholders
- `.gitignore` - Security entries
- `package.json` - `pnpm init:firestore` script

---

## 🔗 Project Structure with Firebase

```
marketo/
├── src/
│   ├── lib/
│   │   └── firebaseClient.ts       ← Firebase setup (uses env vars)
│   └── pages/
│       ├── Products.tsx            ← Fetches from Firestore
│       ├── Cart.tsx                ← Cart in Firestore
│       └── Orders.tsx              ← Orders in Firestore
│
├── config/
│   └── firebase-admin-key.json     ← (Optional backend, in .gitignore)
│
├── .env.local                      ← Your API keys (in .gitignore)
├── .gitignore                      ← Protects secrets
├── initFirestore.js                ← Seed script
└── FIREBASE_SECURITY.md            ← Security guide
```

---

## 🎯 What Happens Next

### Frontend (Already Works!)
```tsx
import { db, auth, storage } from '@/lib/firebaseClient';

// Firestore reads/writes
const products = await getDocs(collection(db, 'products'));

// Authentication
await signInWithEmailAndPassword(auth, email, password);

// File uploads
await uploadBytes(ref(storage, 'path'), file);
```

### Sample Data (Ready to Seed!)
- 5 test users (admin, sellers, buyers)
- 3 products with reviews
- 1 order with items
- 2 cart items

### Your App (Ready to Test!)
- `/products` → Browse 3 sample products
- `/products/[id]` → View details
- `/cart` → Shopping cart
- `/orders` → User orders

---

## ❓ FAQ

**Q: Can I regenerate the service account key?**
A: Yes! Firebase Console → Project Settings → Service Accounts → Generate New Key

**Q: Why not use the service account key for the frontend?**
A: Security! Service account has full database access. The web app config only exposes public credentials and respects Firestore security rules.

**Q: What if I accidentally commit `.env.local`?**
A: Immediately regenerate all Firebase keys in the console and rotate Stripe/other keys.

**Q: Can I use different Firebase keys for dev/prod?**
A: Yes! Create a new Firebase project for production, use different `.env` files.

---

## 📞 Need Help?

1. **Got stuck on Web App Config?**
   - See `FIREBASE_SETUP.md` → "Get Firebase Credentials"

2. **Security questions?**
   - See `FIREBASE_SECURITY.md` → "Secure the Service Account Key"

3. **Data seeding issues?**
   - See `FIRESTORE_INIT.md` → "Troubleshooting"

4. **App not working?**
   - Check browser console (F12)
   - Verify all env vars in `.env.local`
   - Restart dev server: `pnpm run dev`

---

## ✨ Ready to Go!

**Next: Get your Web App Config and update `.env.local`**

Then run:
```powershell
pnpm run dev
```

**Happy building! 🚀**
