const { getUserSupabase, handleAuthError } = require('./_supabaseAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase, user } = await getUserSupabase(req);
    const { id, drawingData, title } = req.body || {};

    if (id) {
      const patch = { updated_at: new Date().toISOString() };
      if (typeof title === 'string' && title.trim()) patch.title = title.trim();
      if (drawingData) patch.board_data = drawingData;
      if (!patch.title && !patch.board_data) {
        return res.status(400).json({ error: 'Missing title or drawingData' });
      }

      const { data, error } = await supabase
        .from('webboard_boards')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: 'Failed to update board', details: error.message });
      return res.json({ success: true, id: data.id, drawingId: data.id, message: 'Board updated successfully' });
    }

    if (!drawingData || !title) {
      return res.status(400).json({ error: 'Missing drawingData or title' });
    }

    const { data, error } = await supabase
      .from('webboard_boards')
      .insert({
        owner_id: user.id,
        title: String(title).trim(),
        board_data: drawingData
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save board', details: error.message });

    return res.json({
      success: true,
      id: data.id,
      drawingId: data.id,
      message: 'Board saved successfully'
    });
  } catch (error) {
    console.error('Save error:', error);
    return handleAuthError(res, error);
  }
};
