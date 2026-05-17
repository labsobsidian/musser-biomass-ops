import { getSupabaseAdmin } from '../../lib/supabase.js';

export default async function handler(req, res) {
  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tenants')
      .select('id, name')
      .limit(5);
    if (error) {
      return res.status(500).json({ ok: false, error: 'supabase_query_failed', message: error.message });
    }
    return res.status(200).json({
      ok: true,
      supabase_url: process.env.SUPABASE_URL,
      tenants_seen: data,
      now: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'ping_failed', message: err.message });
  }
}
