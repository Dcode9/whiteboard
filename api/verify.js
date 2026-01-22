const jwt = require('jsonwebtoken');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Log environment check
    console.log('[VERIFY] Environment check:', {
      hasJwtSecret: !!process.env.JWT_SECRET
    });
    
    // Log headers (sanitized)
    console.log('[VERIFY] Headers received:', {
      hasAuthLower: !!req.headers['authorization'],
      hasAuthCapital: !!req.headers['Authorization'],
      authHeaderValue: req.headers['authorization'] ? 'Bearer [REDACTED]' : req.headers['Authorization'] ? 'Bearer [REDACTED]' : 'NONE',
      allHeaderKeys: Object.keys(req.headers)
    });
    
    // Handle case-insensitive header lookup
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.log('[VERIFY] No token found in request');
      return res.status(401).json({ error: 'No token' });
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('[VERIFY] JWT_SECRET not configured');
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[VERIFY] Token verified successfully for user:', decoded.email);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('[VERIFY] Token verification failed:', {
      message: error.message,
      name: error.name
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};
