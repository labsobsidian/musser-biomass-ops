import { randomBytes, randomUUID } from 'node:crypto';

const ENTITY_TABLES = {
  customers: 'sage_customers',
  vendors: 'sage_vendors',
  items: 'sage_items',
  inventory: 'sage_inventory',
  invoices: 'sage_invoices',
  invoice_lines: 'sage_invoice_lines',
  sales_orders: 'sage_sales_orders',
  sales_order_lines: 'sage_sales_order_lines',
  purchase_orders: 'sage_purchase_orders',
  purchase_order_lines: 'sage_purchase_order_lines',
  payments: 'sage_payments',
};

const LINE_ENTITIES = new Set([
  'invoice_lines',
  'sales_order_lines',
  'purchase_order_lines',
]);

export function isValidEntityType(t) {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(ENTITY_TABLES, t);
}

export function entityTable(t) {
  return ENTITY_TABLES[t];
}

export function isLineEntity(t) {
  return LINE_ENTITIES.has(t);
}

export function newConnectorSecret() {
  return `csec_live_${randomBytes(24).toString('hex')}`;
}

export function newCommandId() {
  return `cmd_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
