# 🔐 Firebase Security & Admin Setup

Your Firebase project is: **marketplace-pro-24368**

## ⚠️ Important: Service Account Security

You have a **Service Account Key** (`firebase-adminsdk-...json`). This is sensitive!

### DO NOT:
- ❌ Commit to version control (add to `.gitignore`)
- ❌ Expose in client-side code
- ❌ Share publicly
- ❌ Put in `.env.local` on production
- ❌ Upload to repositories

### DO:
- ✅ Store securely in a safe location
- ✅ Use only for backend/admin operations
- ✅ Rotate keys periodically
- ✅ Delete old keys after rotation

---

## 🔑 Step 1: Get Your Web App Config

The service account key is for **backend use only**. For the frontend, you need the **Web App config**:

### Get Web App Config:

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: **marketplace-pro-24368**
3. Click ⚙️ **Project Settings** (top left corner)
4. Go to **"Your apps"** tab
5. Find your web app and click it
6. Copy the config object that looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "marketplace-pro-24368.firebaseapp.com",
  projectId: "marketplace-pro-24368",
  storageBucket: "marketplace-pro-24368.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};
```

### Update `.env.local`:

Copy each value into `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIza_your_actual_key_here
VITE_FIREBASE_AUTH_DOMAIN=marketplace-pro-24368.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=marketplace-pro-24368
VITE_FIREBASE_STORAGE_BUCKET=marketplace-pro-24368.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🛡️ Step 2: Secure the Service Account Key

### Option A: Delete It (Recommended for Now)

If you don't need backend admin operations yet, **delete the JSON file**:

```powershell
Remove-Item "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json"
```

You can regenerate it anytime from Firebase Console.

### Option B: Store Securely (For Backend Operations)

1. Move to project directory (NOT in version control):
   ```powershell
   mkdir c:\Users\GBs\Documents\Codes\Projects\marketo\v\config
   Move-Item `
     "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json" `
     "c:\Users\GBs\Documents\Codes\Projects\marketo\v\config\firebase-admin-key.json"
   ```

2. Add to `.gitignore`:
   ```
   config/firebase-admin-key.json
   .env.local
   .env.*.local
   ```

---

## 🔧 Step 3: Configure Frontend (Already Done!)

Your frontend is already configured to use Firebase:

```tsx
// src/lib/firebaseClient.ts
import { initializeApp } from 'firebase/app';
import { getAuth, getFirestore, getStorage } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## 🚀 Step 4: Next Steps

### Immediate:
1. ✅ Get your **Web App Config** from Firebase Console
2. ✅ Update `.env.local` with the values
3. ✅ Delete or secure the service account JSON file
4. ✅ Restart dev server: `pnpm run dev`

### Then:
1. ✅ Create Firestore Database in Test mode
2. ✅ Run: `node initFirestore.js` to seed sample data
3. ✅ Test your app at `http://localhost:5174`

---

## 📋 Frontend vs Backend

### Frontend Stack (What You're Using)
- ✅ `src/lib/firebaseClient.ts` - Uses Web App Config
- ✅ `.env.local` with `VITE_*` variables
- ✅ Client-side authentication (email, Google)
- ✅ Access to Firestore (public/user data)

### Backend Stack (Optional - For Later)
- Admin SDK (Node.js backend)
- Service Account Key (secure storage)
- Full database access
- Admin operations
- Server-side authentication

---

## 🔑 Your Firebase Project Info

```
Project Name: marketplace-pro-24368
Project ID: marketplace-pro-24368
Auth Domain: marketplace-pro-24368.firebaseapp.com
Database URL: marketplace-pro-24368.firebaseio.com
Storage Bucket: marketplace-pro-24368.appspot.com
Messaging Sender ID: (Get from Web App config)
App ID: (Get from Web App config)
```

---

## ✅ Checklist

- [ ] Service account key secured (deleted or moved to config/)
- [ ] `.gitignore` updated with sensitive files
- [ ] Web app config obtained from Firebase Console
- [ ] `.env.local` updated with ALL `VITE_FIREBASE_*` variables
- [ ] Dev server restarted (`pnpm run dev`)
- [ ] Firestore Database created in Test mode
- [ ] `initFirestore.js` ran successfully
- [ ] Sample data visible in Firestore Console
- [ ] App loads at `http://localhost:5174` without errors

---

## 🚨 Security Reminders

### Never Commit:
```gitignore
# .gitignore
.env.local
.env.*.local
config/firebase-admin-key.json
*.json  # (service account keys)
```

### Environment Variables Convention:
- `VITE_*` = Exposed to client (public config) ✅
- `VITE_*` for Firebase Web App credentials ✅
- Backend/Admin keys = Backend `.env` or secure storage only ❌ Not in `.env.local`

### Rotating Keys:
If you accidentally expose credentials:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Delete old key
4. Update your backend configuration

---

## 🎯 What to Do Now

**Right now, run this command to clean up:**

```powershell
# Option 1: Delete the service account key (RECOMMENDED for now)
Remove-Item "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json"

# Then get your Web App config and update .env.local
```

**Or Option 2: Secure it**

```powershell
# Move to safe location
mkdir "c:\Users\GBs\Documents\Codes\Projects\marketo\v\config"
Move-Item `
  "C:\Users\GBs\Downloads\marketplace-pro-24368-firebase-adminsdk-fbsvc-b6ab4ce729.json" `
  "c:\Users\GBs\Documents\Codes\Projects\marketo\v\config\firebase-admin-key.json"
```

---

## 📚 More Info

- 🔐 [Firebase Security Best Practices](https://firebase.google.com/docs/projects/security)
- 🔑 [Managing API Keys](https://firebase.google.com/docs/projects/api-keys)
- 📱 [Web App Setup](https://firebase.google.com/docs/web/setup)
- 🖥️ [Admin SDK Setup](https://firebase.google.com/docs/admin/setup)

---

**Ready to proceed? Get your Web App config and we'll finish the setup!** 🚀
