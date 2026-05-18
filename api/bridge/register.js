import { getSupabaseAdmin } from '../../lib/supabase.js';
import { jsonError, methodNotAllowed, sha256Hex, PROTOCOL_VERSION } from '../../lib/bridge-auth.js';
import { newConnectorSecret } from '../../lib/bridge-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const proto = req.headers['x-bridge-protocol-version'];
  if (proto !== PROTOCOL_VERSION) {
    return jsonError(
      res,
      400,
      'unsupported_protocol_version',
      `Expected X-Bridge-Protocol-Version: ${PROTOCOL_VERSION}, got "${proto ?? '<missing>'}".`,
    );
  }

  const body = req.body ?? {};
  const {
    enrollment_token,
    connector_id,
    machine_name,
    windows_user,
    bridge_version,
    os_version,
  } = body;

  if (!enrollment_token || !connector_id) {
    return jsonError(res, 422, 'invalid_payload', 'enrollment_token and connector_id are required.');
  }
  if (!/^[0-9a-fA-F-]{36}$/.test(connector_id)) {
    return jsonError(res, 422, 'invalid_payload', 'connector_id must be a UUID.');
  }

  const supa = getSupabaseAdmin();

  const { data: enrollment, error: enrErr } = await supa
    .from('connector_enrollments')
    .select('token, tenant_id, used_at, expires_at')
    .eq('token', enrollment_token)
    .maybeSingle();

  if (enrErr) return jsonError(res, 500, 'register_failed', enrErr.message);
  if (!enrollment) return jsonError(res, 401, 'invalid_enrollment_token', 'Enrollment token is invalid.');
  if (enrollment.used_at) return jsonError(res, 401, 'invalid_enrollment_token', 'Enrollment token already used.');
  if (new Date(enrollment.expires_at) < new Date()) {
    return jsonError(res, 401, 'invalid_enrollment_token', 'Enrollment token expired.');
  }

  const { data: existing, error: exErr } = await supa
    .from('connectors')
    .select('id')
    .eq('id', connector_id)
    .maybeSingle();
  if (exErr) return jsonError(res, 500, 'register_failed', exErr.message);
  if (existing) {
    return jsonError(res, 409, 'connector_id_already_registered', 'Use a fresh connector_id.');
  }

  const secret = newConnectorSecret();
  const secret_hash = sha256Hex(secret);

  const { data: inserted, error: insErr } = await supa
    .from('connectors')
    .insert({
      id: connector_id,
      tenant_id: enrollment.tenant_id,
      secret_hash,
      enrollment_token,
      machine_name: machine_name ?? null,
      windows_user: windows_user ?? null,
      bridge_version: bridge_version ?? null,
      os_version: os_version ?? null,
      status: 'enrolled',
    })
    .select('id, tenant_id, config')
    .single();

  if (insErr) return jsonError(res, 500, 'register_failed', insErr.message);

  await supa
    .from('connector_enrollments')
    .update({
      used_at: new Date().toISOString(),
      used_by_connector_id: connector_id,
    })
    .eq('token', enrollment_token);

  const { data: tenant } = await supa
    .from('tenants')
    .select('id, name')
    .eq('id', inserted.tenant_id)
    .single();

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const proto_url = (req.headers['x-forwarded-proto'] ?? 'https').toString().split(',')[0];

  return res.status(200).json({
    connector_id: inserted.id,
    connector_secret: secret,
    tenant_id: inserted.tenant_id,
    tenant_name: tenant?.name ?? null,
    atlas_api_url: `${proto_url}://${host}`,
    config: inserted.config,
  });
}
