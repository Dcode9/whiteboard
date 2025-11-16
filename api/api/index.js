const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const auth = require('./auth');
const drawings = require('./drawings');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', auth);

// Drawing routes
app.use('/api/drawings', drawings);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export for Vercel
module.exports = app;
