// Usage: node scripts/setAdminClaim.js <uid>
// Requires config/firebase-admin-key.json and firebase-admin installed

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, '..', 'config', 'firebase-admin-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account key not found at', keyPath);
  process.exit(1);
}

const serviceAccount = require(keyPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/setAdminClaim.js <uid>');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log(`Successfully set admin claim for ${uid}`))
  .catch(err => {
    console.error('Error setting admin claim:', err);
    process.exit(1);
  });
