import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from './supabase.js';

export const PROTOCOL_VERSION = '1';

export function jsonError(res, status, error, message, details) {
  return res.status(status).json({
    error,
    message,
    ...(details ? { details } : {}),
  });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return jsonError(res, 405, 'method_not_allowed', `Allowed: ${allowed.join(', ')}`);
}

export function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

export async function authenticateBridge(req, res) {
  const proto = req.headers['x-bridge-protocol-version'];
  if (proto !== PROTOCOL_VERSION) {
    jsonError(
      res,
      400,
      'unsupported_protocol_version',
      `Expected X-Bridge-Protocol-Version: ${PROTOCOL_VERSION}, got "${proto ?? '<missing>'}".`,
    );
    return null;
  }

  const auth = req.headers.authorization;
  const connectorId = req.headers['x-connector-id'];
  if (!auth || !auth.startsWith('Bearer ') || !connectorId) {
    jsonError(res, 401, 'invalid_credentials', 'Missing Authorization Bearer token or X-Connector-Id header.');
    return null;
  }

  const secret = auth.slice('Bearer '.length).trim();
  if (!secret) {
    jsonError(res, 401, 'invalid_credentials', 'Empty Bearer token.');
    return null;
  }
  const secretHash = sha256Hex(secret);

  const supa = getSupabaseAdmin();
  const { data: connector, error } = await supa
    .from('connectors')
    .select('id, tenant_id, name, secret_hash, status, config, bridge_version')
    .eq('id', connectorId)
    .maybeSingle();

  if (error) {
    jsonError(res, 500, 'auth_lookup_failed', error.message);
    return null;
  }
  if (!connector || connector.secret_hash !== secretHash) {
    jsonError(res, 401, 'invalid_credentials', 'Connector authentication failed.');
    return null;
  }
  if (connector.status === 'disabled') {
    jsonError(res, 401, 'connector_disabled', 'This connector has been disabled.');
    return null;
  }

  return { connector, supa };
}
