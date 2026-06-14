const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmwieijbrrztukqpfwkg.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_KX3MYtV84QJJdy9bPDuMEA_V99sLKSE';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('No token provided');
  return token;
}

async function getUserSupabase(req) {
  const token = getBearerToken(req);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error('Invalid token');

  return { supabase, user: data.user, token };
}

function handleAuthError(res, error) {
  if (error.message === 'No token provided' || error.message === 'Invalid token') {
    return res.status(401).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Internal server error', details: error.message });
}

module.exports = { getUserSupabase, handleAuthError };
