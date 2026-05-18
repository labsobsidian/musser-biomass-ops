import { authenticateBridge, jsonError, methodNotAllowed } from '../../../../lib/bridge-auth.js';

const VALID_STATUSES = ['completed', 'failed'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const commandId = req.query?.id;
  if (!commandId) return jsonError(res, 422, 'invalid_payload', 'command id missing from path.');

  const body = req.body ?? {};
  const {
    status,
    external_record_id,
    external_record_url,
    message,
    error_code,
    error_message,
    is_retryable,
    executed_at,
    side_effects,
  } = body;

  if (!VALID_STATUSES.includes(status)) {
    return jsonError(
      res,
      422,
      'invalid_payload',
      `status must be one of: ${VALID_STATUSES.join(', ')}.`,
    );
  }

  const { data: cmd } = await supa
    .from('connector_commands')
    .select('id, idempotency_key, connector_id, status, completed_at, result, command_type')
    .eq('id', commandId)
    .eq('tenant_id', connector.tenant_id)
    .maybeSingle();

  if (!cmd) return jsonError(res, 404, 'command_not_found', 'No such command.');
  if (cmd.connector_id !== connector.id) {
    return jsonError(res, 403, 'forbidden', 'This connector did not claim this command.');
  }

  // Idempotent: if a final status was already recorded, return cached.
  if (cmd.status === 'completed' || cmd.status === 'failed') {
    return res.status(200).json({
      command_id: commandId,
      recorded: false,
      cached: true,
      triggered_resync: cmd.result?.side_effects?.affected_entities ?? [],
    });
  }

  const now = new Date().toISOString();
  const triggeredResync = side_effects?.affected_entities ?? [];

  const update = {
    status,
    completed_at: now,
    external_record_id: external_record_id ?? null,
    external_record_url: external_record_url ?? null,
    error_code: error_code ?? null,
    error_message: error_message ?? null,
    is_retryable: is_retryable ?? null,
    side_effects: side_effects ?? null,
    result: {
      status,
      external_record_id: external_record_id ?? null,
      external_record_url: external_record_url ?? null,
      message: message ?? null,
      executed_at: executed_at ?? now,
      side_effects: side_effects ?? null,
    },
  };

  const { error: updErr } = await supa
    .from('connector_commands')
    .update(update)
    .eq('id', commandId);
  if (updErr) return jsonError(res, 500, 'result_failed', updErr.message);

  await supa.from('connector_command_events').insert({
    command_id: commandId,
    event_type: status,
    message: message ?? error_message ?? null,
    details: {
      external_record_id: external_record_id ?? null,
      error_code: error_code ?? null,
      is_retryable: is_retryable ?? null,
    },
  });

  return res.status(200).json({
    command_id: commandId,
    recorded: true,
    triggered_resync: triggeredResync,
  });
}
