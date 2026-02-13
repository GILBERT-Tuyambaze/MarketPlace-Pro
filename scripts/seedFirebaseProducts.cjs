const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function main() {
  const keyPath = path.resolve(process.cwd(), 'config', 'firebase-admin-key.json');
  if (!fs.existsSync(keyPath)) {
    console.error('Service account key not found at', keyPath);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const SELLERS = [
    {
      id: 'WpKmNTJs7RhHZhbR2UzJooxmVeq1',
      full_name: 'seller',
      role: 'seller',
      created_at: new Date('2026-02-12T13:16:24Z'),
      updated_at: new Date('2026-02-12T13:16:24Z'),
    },
    {
      id: 'YCAQ7ZUBJ0MrLRNVPTXSDLu1srA2',
      full_name: 'akimana',
      role: 'seller',
      seller_status: 'approved',
      created_at: new Date('2026-02-12T09:10:08Z'),
      updated_at: new Date('2026-02-12T10:58:33Z'),
    },
  ];

  // Simple product name/templates to produce 50+ items
  const baseNames = [
    'Wireless Headphones', 'USB Charger', '4K Webcam', 'Portable SSD', 'Mechanical Keyboard',
    'Wireless Mouse', '4K Monitor', 'Tablet Stand', 'HDMI Cable', 'WiFi Router',
    'USB Hub', 'Laptop Stand', 'DDR4 RAM', 'NVMe SSD', 'Power Bank',
    'Cotton T-Shirt', 'Denim Jeans', 'Leather Jacket', 'Running Sneakers', 'Wool Coat',
    'LED Desk Lamp', 'Coffee Maker', 'Microwave Oven', 'Toaster', 'Blender',
  ];

  const categories = ['electronics', 'fashion', 'home-garden', 'sports', 'beauty', 'books-media'];

  try {
    console.log('Seeding sellers and products to Firestore...');
    const batch = db.batch();

    // Seed sellers with provided IDs
    for (const s of SELLERS) {
      const ref = db.collection('sellers').doc(s.id);
      batch.set(ref, {
        id: s.id,
        full_name: s.full_name,
        role: s.role,
        seller_status: s.seller_status || null,
        created_at: admin.firestore.Timestamp.fromDate(s.created_at),
        updated_at: admin.firestore.Timestamp.fromDate(s.updated_at),
      });
    }

    const total = 50; // at least 50 products
    for (let i = 0; i < total; i++) {
      const base = baseNames[i % baseNames.length];
      const category = categories[i % categories.length];
      const seller = SELLERS[i % SELLERS.length];
      const price = (Math.random() * 200 + 10).toFixed(2);
      const stock = Math.floor(Math.random() * 200) + 5;

      const product = {
        name: `${base} ${i + 1}`,
        title: `${base} - Model ${i + 1}`,
        description: `Auto-seeded product ${i + 1} in category ${category}`,
        price: parseFloat(price),
        stock,
        category,
        image: `https://via.placeholder.com/300?text=Product+${i + 1}`,
        seller_id: seller.id,
        seller_name: seller.full_name,
        rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
        reviews_count: Math.floor(Math.random() * 400),
        status: 'approved',
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
      };

      const docRef = db.collection('products').doc();
      batch.set(docRef, product);
    }

    await batch.commit();
    console.log(`Successfully seeded ${total} products and ${SELLERS.length} sellers.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();
