import { authenticateBridge, jsonError, methodNotAllowed } from '../../lib/bridge-auth.js';
import { isValidEntityType, isLineEntity, entityTable } from '../../lib/bridge-utils.js';

const MAX_BATCH = 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = await authenticateBridge(req, res);
  if (!auth) return;
  const { connector, supa } = auth;

  const { entity_type, sync_mode, batch_id, cursor_after, records } = req.body ?? {};

  if (!isValidEntityType(entity_type)) {
    return jsonError(res, 422, 'invalid_entity_type', `entity_type "${entity_type}" is not supported.`);
  }
  if (!['full', 'incremental'].includes(sync_mode)) {
    return jsonError(res, 422, 'invalid_payload', 'sync_mode must be "full" or "incremental".');
  }
  if (!batch_id || typeof batch_id !== 'string') {
    return jsonError(res, 422, 'invalid_payload', 'batch_id is required.');
  }
  if (!Array.isArray(records)) {
    return jsonError(res, 422, 'invalid_payload', 'records must be an array.');
  }
  if (records.length > MAX_BATCH) {
    return jsonError(res, 413, 'batch_too_large', `Max ${MAX_BATCH} records per batch; got ${records.length}.`);
  }

  // Idempotent: if batch_id already processed, return cached result.
  const { data: existing } = await supa
    .from('sync_batches')
    .select('accepted_count, rejected_count, rejections, new_cursor')
    .eq('batch_id', batch_id)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({
      batch_id,
      accepted_count: existing.accepted_count,
      rejected_count: existing.rejected_count,
      rejections: existing.rejections ?? [],
      new_cursor: existing.new_cursor,
    });
  }

  const table = entityTable(entity_type);
  const isLine = isLineEntity(entity_type);
  const now = new Date().toISOString();
  const accepted = [];
  const rejections = [];

  for (const r of records) {
    if (!r || typeof r !== 'object') {
      rejections.push({ source_id: null, reason: 'record is not an object' });
      continue;
    }
    if (!r.source_id) {
      rejections.push({ source_id: null, reason: 'missing source_id' });
      continue;
    }
    if (!r.normalized || typeof r.normalized !== 'object') {
      rejections.push({ source_id: r.source_id, reason: 'missing or invalid normalized object' });
      continue;
    }
    if (isLine && !r.parent_source_id) {
      rejections.push({ source_id: r.source_id, reason: 'missing parent_source_id for line entity' });
      continue;
    }

    const row = {
      tenant_id: connector.tenant_id,
      source_system: r.source_system ?? 'sage_50',
      source_id: r.source_id,
      source_updated_at: r.source_updated_at ?? null,
      last_synced_at: now,
      normalized: r.normalized,
      raw_payload: r.raw_payload ?? null,
    };
    if (isLine) {
      row.parent_source_id = r.parent_source_id;
      row.line_number = r.line_number ?? null;
    }
    accepted.push(row);
  }

  let newCursor = cursor_after ?? null;
  if (accepted.length > 0) {
    const { error: upErr } = await supa
      .from(table)
      .upsert(accepted, { onConflict: 'tenant_id,source_system,source_id' });
    if (upErr) {
      return jsonError(res, 500, 'sync_failed', upErr.message);
    }
    const maxTs = accepted
      .map(a => a.source_updated_at)
      .filter(Boolean)
      .sort()
      .pop();
    if (maxTs) newCursor = maxTs;
  }

  const { error: batchErr } = await supa.from('sync_batches').insert({
    batch_id,
    connector_id: connector.id,
    tenant_id: connector.tenant_id,
    entity_type,
    sync_mode,
    record_count: records.length,
    accepted_count: accepted.length,
    rejected_count: rejections.length,
    rejections: rejections.length ? rejections : null,
    new_cursor: newCursor,
  });
  if (batchErr) {
    if (batchErr.code === '23505') {
      const { data: row } = await supa
        .from('sync_batches')
        .select('accepted_count, rejected_count, rejections, new_cursor')
        .eq('batch_id', batch_id)
        .single();
      return res.status(200).json({
        batch_id,
        accepted_count: row.accepted_count,
        rejected_count: row.rejected_count,
        rejections: row.rejections ?? [],
        new_cursor: row.new_cursor,
      });
    }
    return jsonError(res, 500, 'sync_failed', batchErr.message);
  }

  return res.status(200).json({
    batch_id,
    accepted_count: accepted.length,
    rejected_count: rejections.length,
    rejections,
    new_cursor: newCursor,
  });
}
