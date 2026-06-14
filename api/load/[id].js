const { getUserSupabase, handleAuthError } = require('../_supabaseAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase } = await getUserSupabase(req);
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Board ID is required' });

    const { data, error } = await supabase
      .from('webboard_boards')
      .select('id, title, board_data, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Board not found', details: error.message });

    return res.json({
      id: data.id,
      title: data.title,
      drawingData: data.board_data,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Load error:', error);
    return handleAuthError(res, error);
  }
};
