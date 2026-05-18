import { authenticateBridge, jsonError, methodNotAllowed } from '../../lib/bridge-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const limitRaw = parseInt(req.query?.limit ?? '10', 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 10;
  const typesParam = req.query?.types;
  const types = typesParam
    ? String(typesParam).split(',').map(s => s.trim()).filter(Boolean)
    : null;

  const now = new Date().toISOString();

  let q = supa
    .from('connector_commands')
    .select('id, idempotency_key, command_type, payload, created_at, expires_at')
    .eq('tenant_id', connector.tenant_id)
    .eq('status', 'queued')
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (types && types.length > 0) {
    q = q.in('command_type', types);
  }

  const { data, error } = await q;
  if (error) return jsonError(res, 500, 'list_commands_failed', error.message);

  return res.status(200).json({
    commands: (data ?? []).map(c => ({
      command_id: c.id,
      idempotency_key: c.idempotency_key,
      command_type: c.command_type,
      payload: c.payload,
      created_at: c.created_at,
      expires_at: c.expires_at,
    })),
    server_time: now,
  });
}
