import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

// Load service account
const keyPath = path.resolve(process.cwd(), 'config', 'firebase-admin-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account key not found at', keyPath);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// verify request: either present a valid Firebase ID token with admin claim,
// or provide the server secret via header `x-admin-secret` if ADMIN_ENDPOINT_SECRET is set.
async function verifyAdmin(req) {
  const secret = process.env.ADMIN_ENDPOINT_SECRET;
  if (secret && req.headers['x-admin-secret'] === secret) return true;

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const idToken = auth.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded && decoded.admin === true;
  } catch (err) {
    console.error('Error verifying ID token:', err.message || err);
    return false;
  }
}

app.post('/set-claims', async (req, res) => {
  try {
    const allowed = await verifyAdmin(req);
    if (!allowed) return res.status(403).json({ error: 'Unauthorized' });

    const { uid, claims } = req.body || {};
    if (!uid || typeof claims !== 'object') return res.status(400).json({ error: 'Invalid body: { uid, claims } required' });

    await admin.auth().setCustomUserClaims(uid, claims);
    return res.json({ success: true });
  } catch (err) {
    console.error('set-claims error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Admin server listening on http://localhost:${port}`));
