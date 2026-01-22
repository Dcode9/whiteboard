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

// Vercel serverless function handler for /api/load/[id]
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
    // Authenticate user
    const user = authenticateToken(req);
    const userId = user.userId;
    
    // Extract drawing ID from query parameter
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Drawing ID is required' });
    }
    
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Load error:', error);
      return res.status(404).json({ error: 'Drawing not found', details: error.message });
    }
    
    return res.json({
      id: data.id,
      title: data.title,
      drawingData: data.drawing_data,
      createdAt: data.created_at
    });
    
  } catch (error) {
    console.error('Load error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
