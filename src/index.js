const express = require('express');
const cors = require('cors');
const { runWithConcurrency } = require('./utils');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
});

app.post('/api/run', upload.single('project'), async (req, res) => {
  try {
    cases = JSON.parse(req.body.cases);
    if (!cases || !Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({ error: 'Invalid cases array' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Invalid file' });
    }
    const result = await runWithConcurrency(req.file.buffer, cases, 1);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
