const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const jsonServer = require('json-server');
const multer = require('multer');

const HOST = '0.0.0.0';
const PORT = 4000;
const DELAY_MS = 300;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Random names so uploads cannot overwrite each other or escape the folder.
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const app = express();

app.use(cors());
app.use((req, res, next) => setTimeout(next, DELAY_MS));
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Send the file in a form field named "file".' });
  res.json({ url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
});

// By default json-server treats fields ending in "Id" as foreign keys, so any DELETE wipes every
// record whose memberId ("GM001") does not match a numeric members.id. Use a suffix we never use.
app.use('/api', jsonServer.router(path.join(__dirname, 'db.json'), { foreignKeySuffix: '_fk' }));

app.use((err, req, res, next) => {
  res.status(err instanceof multer.MulterError ? 400 : 500).json({ error: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`Mock server running on http://${HOST}:${PORT} (API at /api)`);
});
