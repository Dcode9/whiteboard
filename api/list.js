const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
};

// Helper function to verify JWT token
const authenticateToken = (req) => {
  // Handle case-insensitive header lookup
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return user;
  } catch (err) {
    throw new Error('Invalid token');
  }
};

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
    console.log('[LIST] Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET
    });
    
    // Log headers (sanitized)
    console.log('[LIST] Headers received:', {
      hasAuthLower: !!req.headers['authorization'],
      hasAuthCapital: !!req.headers['Authorization'],
      authHeaderValue: req.headers['authorization'] ? 'Bearer [REDACTED]' : req.headers['Authorization'] ? 'Bearer [REDACTED]' : 'NONE',
      allHeaderKeys: Object.keys(req.headers)
    });
    
    // Authenticate user
    const user = authenticateToken(req);
    console.log('[LIST] User authenticated:', { userId: user.userId, email: user.email });
    const userId = user.userId;
    
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('drawings')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('List error:', error);
      return res.status(500).json({ error: 'Failed to list drawings', details: error.message });
    }
    
    const drawings = data.map(drawing => ({
      id: drawing.id,
      title: drawing.title,
      createdAt: drawing.created_at
    }));
    
    return res.json(drawings);
    
  } catch (error) {
    console.error('[LIST] Error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'JWT_SECRET not configured') {
      return res.status(500).json({ error: 'Server configuration error', details: 'JWT_SECRET not configured' });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
