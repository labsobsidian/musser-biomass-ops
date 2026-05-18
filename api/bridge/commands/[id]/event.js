import { authenticateBridge, jsonError, methodNotAllowed } from '../../../../lib/bridge-auth.js';

const CLAIM_EXTENSION_SECONDS = 300;
const VALID_EVENT_TYPES = ['progress', 'warning', 'claim_extended'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const commandId = req.query?.id;
  if (!commandId) return jsonError(res, 422, 'invalid_payload', 'command id missing from path.');

  const { event_type, message, details } = req.body ?? {};
  if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
    return jsonError(
      res,
      422,
      'invalid_payload',
      `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}.`,
    );
  }

  const { data: cmd } = await supa
    .from('connector_commands')
    .select('id, connector_id, status')
    .eq('id', commandId)
    .eq('tenant_id', connector.tenant_id)
    .maybeSingle();

  if (!cmd) return jsonError(res, 404, 'command_not_found', 'No such command.');
  if (cmd.connector_id !== connector.id) {
    return jsonError(res, 403, 'forbidden', 'This connector did not claim this command.');
  }

  await supa.from('connector_command_events').insert({
    command_id: commandId,
    event_type,
    message: message ?? null,
    details: details ?? null,
  });

  const newClaimUntil = new Date(Date.now() + CLAIM_EXTENSION_SECONDS * 1000).toISOString();
  await supa
    .from('connector_commands')
    .update({ claimed_until: newClaimUntil })
    .eq('id', commandId);

  return res.status(200).json({
    ok: true,
    claim_expires_at: newClaimUntil,
  });
}
