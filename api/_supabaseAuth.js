const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://gmwieijbrrztukqpfwkg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_KX3MYtV84QJJdy9bPDuMEA_V99sLKSE';

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    return new URL(rawUrl.trim()).origin;
  } catch {
    return null;
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.DVERSE_SUPABASE_URL ||
  process.env.WEBBOARD_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
) || normalizeSupabaseUrl(DEFAULT_SUPABASE_URL);
const genericSupabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const genericEnvMatchesSharedProject = !genericSupabaseUrl || genericSupabaseUrl === SUPABASE_URL;
const SUPABASE_KEY =
  process.env.DVERSE_SUPABASE_KEY ||
  process.env.DVERSE_SUPABASE_ANON_KEY ||
  process.env.WEBBOARD_SUPABASE_KEY ||
  process.env.WEBBOARD_SUPABASE_ANON_KEY ||
  (genericEnvMatchesSharedProject ? process.env.SUPABASE_KEY : null) ||
  (genericEnvMatchesSharedProject ? process.env.SUPABASE_ANON_KEY : null) ||
  (genericEnvMatchesSharedProject ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : null) ||
  DEFAULT_SUPABASE_KEY;

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

  await ensureProfile(supabase, data.user);

  return { supabase, user: data.user, token };
}

async function ensureProfile(supabase, user) {
  const meta = user.user_metadata || {};
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || null,
      display_name: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : "D'Verse User"),
      avatar_url: meta.avatar_url || meta.picture || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Could not prepare user profile: ${error.message}`);
  }
}

function handleAuthError(res, error) {
  if (error.message === 'No token provided' || error.message === 'Invalid token') {
    return res.status(401).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Internal server error', details: error.message });
}

module.exports = { getUserSupabase, handleAuthError };
