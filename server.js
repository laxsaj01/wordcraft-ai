'use strict';
const path = require('path');
const fs = require('fs');
const express = require('express');

const { isInstalled, getSetting } = require('./src/settings');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api', require('./src/routes/system'));
app.use('/api', require('./src/routes/generate'));
app.use('/api', require('./src/routes/chat'));
app.use('/api', require('./src/routes/billing'));
app.use('/api', require('./src/routes/user'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/blog', require('./src/routes/blog'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/v1', require('./src/routes/publicapi'));

app.get('/api/health', (req, res) => res.json({ ok: true, installed: isInstalled(), version: '1.0.0' }));

// Serve built frontend
const distDir = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '7d', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.status(500).send('Frontend not built yet. Run: npm run build');
  });
}

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[WordCraft AI] Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = parseInt(process.env.PORT || getSetting('port', '3000'), 10);
app.listen(PORT, () => {
  console.log(`WordCraft AI is running at http://localhost:${PORT}`);
  if (!isInstalled()) console.log('Open the URL in your browser to run the installation wizard.');
});
