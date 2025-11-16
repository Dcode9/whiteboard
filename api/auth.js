const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth Callback
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for tokens
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
      grant_type: 'authorization_code'
    });
    
    const { id_token, access_token } = response.data;
    
    // Create JWT token
    const token = jwt.sign(
      { access_token },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({ token, access_token });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ valid: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
