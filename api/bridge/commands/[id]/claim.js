import { authenticateBridge, jsonError, methodNotAllowed } from '../../../../lib/bridge-auth.js';

const CLAIM_TTL_SECONDS = 300;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const commandId = req.query?.id;
  if (!commandId) return jsonError(res, 422, 'invalid_payload', 'command id missing from path.');

  const now = new Date();
  const claimUntil = new Date(now.getTime() + CLAIM_TTL_SECONDS * 1000);

  // Atomic claim: only succeed if status='queued' AND not expired.
  const { data, error } = await supa
    .from('connector_commands')
    .update({
      status: 'claimed',
      connector_id: connector.id,
      claimed_at: now.toISOString(),
      claimed_until: claimUntil.toISOString(),
    })
    .eq('id', commandId)
    .eq('tenant_id', connector.tenant_id)
    .eq('status', 'queued')
    .gt('expires_at', now.toISOString())
    .select('id')
    .maybeSingle();

  if (error) return jsonError(res, 500, 'claim_failed', error.message);

  if (!data) {
    const { data: cmd } = await supa
      .from('connector_commands')
      .select('status, expires_at')
      .eq('id', commandId)
      .eq('tenant_id', connector.tenant_id)
      .maybeSingle();

    if (!cmd) return jsonError(res, 404, 'command_not_found', 'No such command.');
    if (new Date(cmd.expires_at) <= now) {
      return jsonError(res, 410, 'expired', 'Command past TTL.');
    }
    return jsonError(res, 409, 'already_claimed', `Command in status "${cmd.status}".`);
  }

  await supa.from('connector_command_events').insert({
    command_id: commandId,
    event_type: 'claimed',
    message: `Claimed by connector ${connector.id}`,
  });

  return res.status(200).json({
    command_id: commandId,
    claimed_at: now.toISOString(),
    claim_expires_at: claimUntil.toISOString(),
  });
}
