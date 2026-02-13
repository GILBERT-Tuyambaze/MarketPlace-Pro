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

  try {
    console.log('Starting orders backfill migration...');

    const ordersSnap = await db.collection('orders').get();
    console.log(`Found ${ordersSnap.size} orders`);

    const updates = [];
    for (const doc of ordersSnap.docs) {
      const data = doc.data();
      const items = Array.isArray(data.items) ? data.items : [];
      let changed = false;

      // Fetch product seller_id for each item when missing and ensure item.status
      for (let i = 0; i < items.length; i++) {
        const item = items[i] || {};
        if ((!item.seller_id || item.seller_id === '') || !item.status) {
          try {
            const pRef = db.collection('products').doc(item.product_id);
            const pSnap = await pRef.get();
              // Admin SDK DocumentSnapshot has boolean property `exists`
              if (pSnap.exists) {
              const p = pSnap.data();
              if (!item.seller_id && p && p.seller_id) {
                item.seller_id = p.seller_id;
                changed = true;
              }
            }
          } catch (err) {
            console.error(`Error fetching product ${item.product_id}:`, err.message || err);
          }
        }

        if (!item.status) {
          item.status = 'processing';
          changed = true;
        }

        items[i] = item;
      }

      // Build sellers array from items
      const sellers = Array.from(new Set(items.map(it => it.seller_id).filter(Boolean)));
      const sellersDiffers = JSON.stringify(sellers || []) !== JSON.stringify(data.sellers || []);
      if (sellersDiffers) changed = true;

      if (changed) {
        updates.push({ id: doc.id, items, sellers });
      }
    }

    const isRun = process.argv.includes('--run') || process.argv.includes('--yes');
    console.log(`Prepared ${updates.length} updates.` + (isRun ? ' Committing in batches...' : ' Dry-run mode (no commits). Use --run to apply changes.'));

    const BATCH_SIZE = 200;
    let committed = 0;
    if (isRun) {
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = updates.slice(i, i + BATCH_SIZE);
        for (const u of chunk) {
          const ref = db.collection('orders').doc(u.id);
          batch.update(ref, { items: u.items, sellers: u.sellers, updated_at: admin.firestore.Timestamp.now() });
        }
        await batch.commit();
        committed += chunk.length;
        console.log(`Committed ${committed}/${updates.length}`);
      }
      // Append safety log file with updated order ids
      try {
        const logPath = path.resolve(process.cwd(), 'scripts', 'migration-order-updates.log');
        const timestamp = new Date().toISOString();
        const updatedIds = updates.map(u => u.id);
        const logEntry = { timestamp, count: updates.length, updatedIds };
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        console.log('Wrote safety log to', logPath);
      } catch (logErr) {
        console.error('Failed to write safety log:', logErr);
      }
    } else {
      // Dry-run: show sample of updates
      console.log('Dry-run: sample updates (first 5)');
      console.log(updates.slice(0, 5));
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
