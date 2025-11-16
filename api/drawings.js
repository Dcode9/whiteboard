const express = require('express');
const axios = require('axios');
const router = express.Router();

// Save drawing as Gist
router.post('/save', async (req, res) => {
  try {
    const { drawingData, title, userId } = req.body;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }
    
    // Create GitHub Gist
    const gistResponse = await axios.post(
      'https://api.github.com/gists',
      {
        description: `WebBoard Drawing - ${title} (User: ${userId})`,
        public: false,
        files: {
          'drawing.json': {
            content: JSON.stringify({
              title,
              userId,
              drawingData,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    res.json({
      success: true,
      gistId: gistResponse.data.id,
      gistUrl: gistResponse.data.html_url
    });
  } catch (error) {
    console.error('Save error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to save drawing' });
  }
});

// Load drawing from Gist
router.get('/load/:gistId', async (req, res) => {
  try {
    const { gistId } = req.params;
    const githubToken = process.env.GITHUB_TOKEN;
    
    const gistResponse = await axios.get(
      `https://api.github.com/gists/${gistId}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const fileContent = gistResponse.data.files['drawing.json'].content;
    const drawingData = JSON.parse(fileContent);
    
    res.json(drawingData);
  } catch (error) {
    console.error('Load error:', error.message);
    res.status(500).json({ error: 'Failed to load drawing' });
  }
});

// List user drawings
router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const githubToken = process.env.GITHUB_TOKEN;
    
    const gistsResponse = await axios.get(
      'https://api.github.com/gists',
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const drawings = gistsResponse.data
      .filter(gist => gist.description?.includes(`User: ${userId}`))
      .map(gist => ({
        id: gist.id,
        title: gist.description?.replace(/^WebBoard Drawing - /, '').replace(/ \(User.*/, '') || 'Untitled',
        url: gist.html_url,
        createdAt: gist.created_at
      }));
    
    res.json(drawings);
  } catch (error) {
    console.error('List error:', error.message);
    res.status(500).json({ error: 'Failed to list drawings' });
  }
});

module.exports = router;
