const { getUserSupabase, handleAuthError } = require('../_supabaseAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase } = await getUserSupabase(req);
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Board ID is required' });

    const { error } = await supabase.from('webboard_boards').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete board', details: error.message });

    return res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return handleAuthError(res, error);
  }
};
