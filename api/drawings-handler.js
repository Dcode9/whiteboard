const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Helper function to verify JWT token
const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return user;
  } catch (err) {
    throw new Error('Invalid token');
  }
};

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Authenticate user
    const user = authenticateToken(req);
    const userId = user.userId;
    const userEmail = user.email;
    
    // Handle different HTTP methods and paths
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // POST /api/save - Save drawing
    if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'save') {
      const { drawingData, title } = req.body;
      
      if (!drawingData || !title) {
        return res.status(400).json({ error: 'Missing drawingData or title' });
      }
      
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }
      
      // Save to Supabase
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
    }
    
    // GET /api/list - List user drawings
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'list') {
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
    }
    
    // GET /api/load/:drawingId - Load specific drawing
    if (req.method === 'GET' && pathParts[pathParts.length - 2] === 'load') {
      const drawingId = pathParts[pathParts.length - 1];
      
      const { data, error } = await supabase
        .from('drawings')
        .select('*')
        .eq('id', drawingId)
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
    }
    
    // DELETE /api/delete/:drawingId - Delete drawing
    if (req.method === 'DELETE' && pathParts[pathParts.length - 2] === 'delete') {
      const drawingId = pathParts[pathParts.length - 1];
      
      const { error } = await supabase
        .from('drawings')
        .delete()
        .eq('id', drawingId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: 'Failed to delete drawing', details: error.message });
      }
      
      return res.json({ success: true, message: 'Drawing deleted successfully' });
    }
    
    // If no route matched
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
