const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Save drawing to Supabase
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { drawingData, title } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;
    
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
    
    res.json({
      success: true,
      drawingId: data[0].id,
      message: 'Drawing saved successfully'
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save drawing', details: error.message });
  }
});

// Load drawing from Supabase
router.get('/load/:drawingId', authenticateToken, async (req, res) => {
  try {
    const { drawingId } = req.params;
    const userId = req.user.userId;
    
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
    
    res.json({
      id: data.id,
      title: data.title,
      drawingData: data.drawing_data,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load drawing', details: error.message });
  }
});

// List user drawings
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
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
    
    res.json(drawings);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list drawings', details: error.message });
  }
});

// Delete drawing
router.delete('/delete/:drawingId', authenticateToken, async (req, res) => {
  try {
    const { drawingId } = req.params;
    const userId = req.user.userId;
    
    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('id', drawingId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete drawing', details: error.message });
    }
    
    res.json({ success: true, message: 'Drawing deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete drawing', details: error.message });
  }
});

module.exports = router;
