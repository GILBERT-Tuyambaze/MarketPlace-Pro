// initFirestore.js
// ==============================================================================
// Firestore Database Initialization Script (Admin SDK)
// 
// This script initializes your Firestore database with sample data:
// - Sample profiles (admin, sellers, buyers)
// - Sample products with reviews
// - Sample orders
// - Sample cart items
//
// Uses Firebase Admin SDK for unrestricted write access
// 
// Run with: node initFirestore.js
// ==============================================================================

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------
// 1️⃣ Initialize Firebase Admin
// ----------------------------
// Load service account key from config folder
const serviceAccountPath = path.join(__dirname, "config", "firebase-admin-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: Service account key not found!");
  console.error(`   Expected location: ${serviceAccountPath}`);
  console.error("\n📝 To fix this:");
  console.error("   1. Download your service account key from Firebase Console");
  console.error("   2. Create a 'config' folder in your project root");
  console.error("   3. Save the JSON as: config/firebase-admin-key.json");
  console.error("   4. The .gitignore will protect it from being committed");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("🔧 Initializing Firebase Admin SDK...");
console.log(`   Project ID: ${serviceAccount.project_id}`);
console.log("✅ Firebase Admin initialized with unrestricted access");

// ----------------------------
// 2️⃣ Create sample profiles
// ----------------------------
async function createProfiles() {
  console.log("\n📝 Creating sample profiles...");
  
  const users = [
    {
      uid: "admin_uid_12345",
      email: "admin@example.com",
      full_name: "Admin User",
      role: "admin",
      is_verified: true,
      avatar_url: "https://ui-avatars.com/api/?name=Admin+User"
    },
    {
      uid: "seller1_uid_12345",
      email: "seller1@example.com",
      full_name: "Tech Store",
      role: "seller",
      seller_status: "approved",
      seller_rating: 4.8,
      seller_reviews_count: 156,
      seller_since: admin.firestore.FieldValue.serverTimestamp(),
      is_verified: true,
      avatar_url: "https://ui-avatars.com/api/?name=Tech+Store"
    },
    {
      uid: "seller2_uid_12345",
      email: "seller2@example.com",
      full_name: "Fashion Hub",
      role: "seller",
      seller_status: "approved",
      seller_rating: 4.6,
      seller_reviews_count: 89,
      seller_since: admin.firestore.FieldValue.serverTimestamp(),
      is_verified: true,
      avatar_url: "https://ui-avatars.com/api/?name=Fashion+Hub"
    },
    {
      uid: "buyer1_uid_12345",
      email: "buyer1@example.com",
      full_name: "John Doe",
      role: "buyer",
      is_verified: true,
      avatar_url: "https://ui-avatars.com/api/?name=John+Doe"
    },
    {
      uid: "buyer2_uid_12345",
      email: "buyer2@example.com",
      full_name: "Jane Smith",
      role: "buyer",
      is_verified: true,
      avatar_url: "https://ui-avatars.com/api/?name=Jane+Smith"
    }
  ];

  for (const user of users) {
    await db.collection("profiles").doc(user.uid).set({
      ...user,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ Created profile: ${user.full_name} (${user.role})`);
  }

  console.log("✅ All profiles created");
}

// ----------------------------
// 3️⃣ Create sample products
// ----------------------------
async function createProducts() {
  console.log("\n📦 Creating sample products...");

  const products = [
    {
      title: "Premium Wireless Headphones",
      name: "Wireless Headphones",
      description: "High-quality wireless headphones with noise cancellation, 30-hour battery life",
      category: "electronics",
      tags: ["headphones", "wireless", "audio", "tech"],
      price: 79.99,
      original_price: 99.99,
      currency: "USD",
      stock: 25,
      sku: "TECH-WH-001",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"],
      thumbnail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop",
      seller_id: "seller1_uid_12345",
      status: "approved",
      rating: 4.7,
      reviews_count: 342,
      is_featured: true,
      is_discounted: true,
      discount_percentage: 20
    },
    {
      title: "Comfortable Cotton T-Shirt",
      name: "Cotton T-Shirt",
      description: "Soft, breathable cotton t-shirt perfect for everyday wear",
      category: "clothing",
      tags: ["shirt", "cotton", "clothing", "casual"],
      price: 24.99,
      original_price: 34.99,
      currency: "USD",
      stock: 50,
      sku: "FASH-TS-001",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
      images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"],
      thumbnail: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop",
      seller_id: "seller2_uid_12345",
      status: "approved",
      rating: 4.5,
      reviews_count: 128,
      is_featured: false,
      is_discounted: true,
      discount_percentage: 28
    },
    {
      title: "Smart LED Bulb",
      name: "LED Bulb",
      description: "WiFi-enabled LED bulb with 16 million color options",
      category: "home",
      tags: ["bulb", "smart", "home", "lighting"],
      price: 19.99,
      currency: "USD",
      stock: 100,
      sku: "HOME-LED-001",
      image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop",
      images: ["https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop"],
      thumbnail: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=100&h=100&fit=crop",
      seller_id: "seller1_uid_12345",
      status: "approved",
      rating: 4.3,
      reviews_count: 215,
      is_featured: false,
      is_discounted: false
    }
  ];

  const productIds = [];

  for (const product of products) {
    const docRef = await db.collection("products").add({
      ...product,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      published_at: admin.firestore.FieldValue.serverTimestamp()
    });

    productIds.push(docRef.id);
    console.log(`   ✅ Created product: ${product.title}`);

    // Add sample reviews for each product
    const reviews = [
      {
        product_id: docRef.id,
        reviewer_id: "buyer1_uid_12345",
        rating: 5,
        title: "Excellent product!",
        comment: "Really satisfied with this purchase. Great quality!",
        helpful_count: 12,
        verified_purchase: true
      },
      {
        product_id: docRef.id,
        reviewer_id: "buyer2_uid_12345",
        rating: 4,
        title: "Good value for money",
        comment: "Works well, very happy with it.",
        helpful_count: 5,
        verified_purchase: true
      }
    ];

    for (const review of reviews) {
      await db.collection("reviews").add({
        ...review,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`      ➕ Added 2 reviews`);
  }

  console.log("✅ All products created");
  return productIds;
}

// ----------------------------
// 4️⃣ Create a sample order
// ----------------------------
async function createOrder(productIds) {
  console.log("\n📋 Creating sample order...");

  const orderRef = await db.collection("orders").add({
    user_id: "buyer1_uid_12345",
    order_number: "ORD-2026-000001",
    status: "confirmed",
    subtotal: 79.99,
    tax_amount: 8.00,
    shipping_cost: 5.00,
    discount_amount: 0,
    total_amount: 92.99,
    shipping_address: "123 Main Street",
    shipping_city: "New York",
    shipping_state: "NY",
    shipping_postal_code: "10001",
    shipping_country: "USA",
    billing_address: "123 Main Street",
    billing_city: "New York",
    billing_state: "NY",
    billing_postal_code: "10001",
    billing_country: "USA",
    payment_method: "card",
    payment_status: "completed",
    payment_intent_id: "pi_test_12345",
    tracking_number: "TRACK123456",
    customer_notes: "Please handle with care",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  });

  console.log(`   ✅ Order created: ${orderRef.id}`);

  // Add order items
  if (productIds.length > 0) {
    await db.collection("order_items").add({
      order_id: orderRef.id,
      product_id: productIds[0],
      product_title: "Premium Wireless Headphones",
      product_price: 79.99,
      quantity: 1,
      subtotal: 79.99,
      seller_id: "seller1_uid_12345",
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`      ➕ Added order item`);
  }

  console.log("✅ Order created successfully");
}

// ----------------------------
// 5️⃣ Create sample cart
// ----------------------------
async function createCart(productIds) {
  console.log("\n🛒 Creating sample cart items...");

  if (productIds.length > 1) {
    await db.collection("cart_items").add({
      user_id: "buyer2_uid_12345",
      product_id: productIds[1],
      quantity: 2,
      added_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`   ✅ Added cart item 1`);

    await db.collection("cart_items").add({
      user_id: "buyer2_uid_12345",
      product_id: productIds[2],
      quantity: 1,
      added_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`   ✅ Added cart item 2`);
  }

  console.log("✅ Cart items created");
}

// ----------------------------
// 6️⃣ Run all functions
// ----------------------------
async function initFirestore() {
  try {
    console.log("🚀 Starting Firestore initialization...\n");
    
    await createProfiles();
    const productIds = await createProducts();
    await createOrder(productIds);
    await createCart(productIds);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Firestore initialization complete!");
    console.log("=".repeat(50));
    console.log("\n📊 Database Summary:");
    console.log("   ✅ 5 profiles created (1 admin, 2 sellers, 2 buyers)");
    console.log("   ✅ 3 products created with 6 reviews");
    console.log("   ✅ 1 sample order created");
    console.log("   ✅ 2 cart items created");
    console.log("\n🌐 Ready to use in your application!");
    
    await admin.app().delete();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during initialization:");
    console.error("   ", error.message);
    
    if (error.message.includes("PERMISSION_DENIED")) {
      console.error("\n💡 PERMISSION DENIED - Common causes:");
      console.error("   1. Firestore is not enabled in your project");
      console.error("   2. Service account key is invalid or expired");
      console.error("   3. Firestore security rules are blocking writes");
      console.error("\n📝 To fix:");
      console.error("   1. Go to Firebase Console → Firestore Database");
      console.error("   2. Click 'Create Database' (if not already created)");
      console.error("   3. Start in 'Test mode' for development");
      console.error("   4. Try again: node initFirestore.js");
    }
    
    await admin.app().delete();
    process.exit(1);
  }
}

// Run initialization
initFirestore();
