const { getUserSupabase, handleAuthError } = require('./_supabaseAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase } = await getUserSupabase(req);
    const { data, error } = await supabase
      .from('webboard_boards')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to list boards', details: error.message });

    return res.json((data || []).map((board) => ({
      id: board.id,
      title: board.title,
      createdAt: board.created_at,
      updatedAt: board.updated_at
    })));
  } catch (error) {
    console.error('List error:', error);
    return handleAuthError(res, error);
  }
};
