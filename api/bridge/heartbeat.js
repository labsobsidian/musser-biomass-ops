import { authenticateBridge, jsonError, methodNotAllowed } from '../../lib/bridge-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const body = req.body ?? {};
  const now = new Date().toISOString();

  const update = {
    last_seen_at: now,
    last_heartbeat: body,
    status: 'online',
  };
  if (body.bridge_version) update.bridge_version = body.bridge_version;

  const { error } = await supa.from('connectors').update(update).eq('id', connector.id);
  if (error) return jsonError(res, 500, 'heartbeat_failed', error.message);

  return res.status(200).json({
    ok: true,
    server_time: now,
    config_changed: false,
  });
}
