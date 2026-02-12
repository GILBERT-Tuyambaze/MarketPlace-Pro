# 🔥 Firebase Setup Guide

This guide explains how to set up Firebase for the Marketo e-commerce platform.

## 📋 Table of Contents

1. [Create Firebase Project](#create-firebase-project)
2. [Get Firebase Credentials](#get-firebase-credentials)
3. [Configure Environment Variables](#configure-environment-variables)
4. [Initialize Firebase Services](#initialize-firebase-services)
5. [Available Services](#available-services)
6. [Usage Examples](#usage-examples)

---

## Create Firebase Project

### Step 1: Go to Firebase Console

1. Visit [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add Project"**
3. Enter project name: `marketo-ecommerce`
4. Accept terms and click **Create Project**
5. Wait for project to initialize

### Step 2: Create a Web App

1. Click the **Web** icon (</>) to create a web app
2. Enter app nickname: `Marketo Web`
3. Enable "Also set up Firebase Hosting for this app" (optional)
4. Click **Register App**

---

## Get Firebase Credentials

### Where to Find Credentials

After registering your web app, you'll see a code snippet like:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

### Get Each Credential

1. **Copy from the code snippet** shown after registering
2. Or go to **Project Settings** (⚙️ icon → Project settings)
3. Click **"Your apps"** tab
4. Your web app credentials are listed there

---

## Configure Environment Variables

### Step 1: Update `.env.local`

Add these lines to your `.env.local` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 2: Replace with Your Credentials

Replace all the `your_...` values with your actual Firebase credentials from step 2.

### Step 3: Save and Restart Dev Server

After updating `.env.local`:
```powershell
# Stop dev server (Ctrl+C)
# Restart:
pnpm run dev
```

---

## Initialize Firebase Services

### Already Set Up

The Firebase client is already configured in:
- **File:** `src/lib/firebaseClient.ts`
- **Exports:**
  - `auth` - Firebase Authentication
  - `db` - Firestore Database
  - `storage` - Cloud Storage
  - `analytics` - Google Analytics

### Import in Your Components

```tsx
import { auth, db, storage } from '@/lib/firebaseClient';
```

---

## Available Services

### 1. **Authentication** (Firebase Auth)

Handle user login/signup:

```tsx
import { auth } from '@/lib/firebaseClient';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Sign up
await createUserWithEmailAndPassword(auth, email, password);

// Sign in
await signInWithEmailAndPassword(auth, email, password);

// Get current user
const user = auth.currentUser;
```

### 2. **Database** (Firestore)

Store and query data:

```tsx
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Add a document
await addDoc(collection(db, 'products'), {
  title: 'Headphones',
  price: 79.99,
  category: 'electronics'
});

// Query documents
const q = query(collection(db, 'products'), where('category', '==', 'electronics'));
const snapshot = await getDocs(q);
const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### 3. **Storage** (Cloud Storage)

Upload and manage files:

```tsx
import { storage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload file
const storageRef = ref(storage, 'products/image.jpg');
await uploadBytes(storageRef, file);

// Get download URL
const url = await getDownloadURL(storageRef);
```

### 4. **Analytics** (Google Analytics)

Track user events:

```tsx
import { analytics } from '@/lib/firebaseClient';
import { logEvent } from 'firebase/analytics';

// Track event
logEvent(analytics, 'product_view', {
  product_id: '123',
  product_name: 'Headphones',
  price: 79.99
});
```

---

## Usage Examples

### Example 1: Create Firebase Auth Context

```tsx
// src/context/FirebaseAuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { User, onAuthStateChanged } from 'firebase/auth';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseAuthContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
}
```

### Example 2: Fetch Products from Firestore

```tsx
// src/pages/FirebaseProducts.tsx
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

export function FirebaseProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Upload Product Image

```tsx
// Upload handler
import { storage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadProductImage(file: File): Promise<string> {
  const fileName = `products/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);
  
  // Upload file
  await uploadBytes(storageRef, file);
  
  // Get download URL
  const url = await getDownloadURL(storageRef);
  return url;
}
```

---

## Enable Firebase Services

### In Firebase Console:

1. **Authentication:**
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Enable **Google** (recommended)

2. **Firestore:**
   - Go to **Firestore Database**
   - Click **Create Database**
   - Start in **Test mode** (for development)
   - Choose region

3. **Storage:**
   - Go to **Cloud Storage**
   - Click **Get Started**
   - Start in **Test mode**

---

## Security Rules (Important!)

### Firestore Security Rules

In Firestore Console, set rules to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read if document is published
    match /products/{document=**} {
      allow read: if resource.data.status == 'approved';
      allow create, update, delete: if request.auth.uid == resource.data.seller_id;
    }
    
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Allow reviews by authenticated users
    match /reviews/{document=**} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

### Cloud Storage Rules

Set to:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /user-avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## Troubleshooting

### ❌ Error: "Firebase config is invalid"

**Solution:** Check your `.env.local` credentials are correct. Compare with Firebase console.

### ❌ Error: "Permission denied" when reading data

**Solution:** Your Firestore security rules may be too restrictive. Start with test mode rules.

### ❌ Error: "Cannot upload to Firebase Storage"

**Solution:** Enable Cloud Storage and set proper security rules.

### ❌ App compiles but Firebase not working

**Solution:** Restart dev server after updating `.env.local`:
```powershell
Ctrl+C
pnpm run dev
```

---

## Next Steps

1. ✅ Create Firebase project
2. ✅ Add Firebase credentials to `.env.local`
3. ✅ Enable Authentication, Firestore, Storage
4. ✅ Set security rules
5. ✅ Create Firestore collections (products, orders, users, reviews)
6. ✅ Integrate Firebase into your components

---

## Useful Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Cloud Storage](https://firebase.google.com/docs/storage)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**🎉 Your Firebase setup is ready! Start building!**
