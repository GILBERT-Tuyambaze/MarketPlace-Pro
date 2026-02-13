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

// Verify Firebase ID token and return decoded token or null
async function verifyUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const idToken = auth.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.error('Error verifying ID token:', err && err.message ? err.message : err);
    return null;
  }
}

// Generate a v4 signed URL for direct browser uploads (PUT). Returns write URL and a read URL.
app.post('/generate-upload-url', async (req, res) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, contentType } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing file name' });

    const bucket = admin.storage().bucket();
    // sanitize filename
    const baseName = path.basename(String(name)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `product-images/${user.uid}/${Date.now()}-${Math.random().toString(36).substr(2,9)}-${baseName}`;
    const file = bucket.file(filePath);

    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || 'application/octet-stream',
    };

    const [signedUrl] = await file.getSignedUrl(options);

    // construct a read URL that can be used to access the uploaded file via the Firebase Storage REST endpoint
    const bucketName = bucket.name || (process.env.FIREBASE_STORAGE_BUCKET || '');
    const readUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;

    return res.json({ signedUrl, filePath, readUrl });
  } catch (err) {
    console.error('generate-upload-url error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Admin server listening on http://localhost:${port}`));
