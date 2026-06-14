const { getUserSupabase, handleAuthError } = require('./_supabaseAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user } = await getUserSupabase(req);
    return res.json({ valid: true, user });
  } catch (error) {
    return handleAuthError(res, error);
  }
};
