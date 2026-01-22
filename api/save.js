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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Authenticate user
    const user = authenticateToken(req);
    const userId = user.userId;
    const userEmail = user.email;
    
    const { drawingData, title } = req.body;
    
    if (!drawingData || !title) {
      return res.status(400).json({ error: 'Missing drawingData or title' });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    // Save to Supabase
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('drawings')
      .insert([
        {
          user_id: userId,
          user_email: userEmail,
          title: title,
          drawing_data: drawingData,
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Supabase save error:', error);
      return res.status(500).json({ error: 'Failed to save drawing', details: error.message });
    }
    
    return res.json({
      success: true,
      drawingId: data[0].id,
      message: 'Drawing saved successfully'
    });
    
  } catch (error) {
    console.error('Save error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
