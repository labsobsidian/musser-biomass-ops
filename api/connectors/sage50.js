// /api/connectors/sage50.js
//
// Future Sage 50 connector boundary. Sage 50 access is not available yet, so
// this module returns stable placeholder AR data with explicit demo metadata.
// Later implementations can swap this function to Sage AR Automation, a
// Sage-supported API/connector, ODBC/SDK export, or middleware.

const asOf = '2026-04-27';

const invoices = [
  {
    customer: 'Town & Country Store',
    invoiceNumber: 'MB-1048',
    invoiceDate: '2026-04-03',
    dueDate: '2026-04-18',
    amount: 7260.00,
    status: 'Overdue',
    daysOverdue: 9,
    bucket: '1-30',
    notes: 'Forest Fuel pellets to Hamilton, NY. Good account; follow up with statement and BOL.'
  },
  {
    customer: 'TJ Coal and Stove',
    invoiceNumber: 'MB-1051',
    invoiceDate: '2026-04-08',
    dueDate: '2026-04-23',
    amount: 6377.40,
    status: 'Overdue',
    daysOverdue: 4,
    bucket: '1-30',
    notes: 'Briquettes to Spartansburg, PA. Payment usually lands within 7 days of reminder.'
  },
  {
    customer: 'Northeast Stove Supply',
    invoiceNumber: 'MB-1054',
    invoiceDate: '2026-03-12',
    dueDate: '2026-04-11',
    amount: 14520.00,
    status: 'At risk',
    daysOverdue: 16,
    bucket: '1-30',
    notes: 'Large prospect account. Owner should review before collections tone escalates.'
  },
  {
    customer: 'Hudson Valley Hearth',
    invoiceNumber: 'MB-1039',
    invoiceDate: '2026-02-28',
    dueDate: '2026-03-30',
    amount: 11940.00,
    status: 'Overdue',
    daysOverdue: 28,
    bucket: '1-30',
    notes: 'Second reminder due. Ask for remittance date and confirm AP contact.'
  },
  {
    customer: 'Pocono Pellet Co.',
    invoiceNumber: 'MB-1022',
    invoiceDate: '2026-01-20',
    dueDate: '2026-02-19',
    amount: 18460.00,
    status: 'Critical',
    daysOverdue: 68,
    bucket: '61-90',
    notes: 'Hold new loads until owner approves. Needs direct phone call.'
  },
  {
    customer: 'Appalachian Coal & Stove',
    invoiceNumber: 'MB-1058',
    invoiceDate: '2026-04-20',
    dueDate: '2026-05-20',
    amount: 12880.00,
    status: 'Current',
    daysOverdue: 0,
    bucket: 'Current',
    notes: 'Current. No action needed.'
  },
  {
    customer: 'Blue Ridge Bedding',
    invoiceNumber: 'MB-1059',
    invoiceDate: '2026-04-24',
    dueDate: '2026-05-24',
    amount: 6201.00,
    status: 'Current',
    daysOverdue: 0,
    bucket: 'Current',
    notes: 'Alpha Fiber load. Watch for repeat order opportunity.'
  }
];

function summarizeAR() {
  const aging = {
    Current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  };

  for (const invoice of invoices) aging[invoice.bucket] += invoice.amount;

  const totalOpen = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdue = invoices.filter((invoice) => invoice.daysOverdue > 0);
  const overdueTotal = overdue.reduce((sum, invoice) => sum + invoice.amount, 0);
  const critical = invoices.filter((invoice) => invoice.status === 'Critical' || invoice.daysOverdue >= 60);

  return {
    source: 'placeholder',
    connector: 'sage50',
    demoMode: true,
    asOf,
    summary: {
      totalOpen: round2(totalOpen),
      overdueTotal: round2(overdueTotal),
      currentTotal: round2(aging.Current),
      invoiceCount: invoices.length,
      overdueCount: overdue.length,
      criticalCount: critical.length,
      dsoEstimate: 37
    },
    aging: Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount: round2(amount) })),
    invoices,
    collectionPriority: [
      'Call Pocono Pellet Co. before releasing any new load.',
      'Send statement and BOL copy to Northeast Stove Supply with owner-aware tone.',
      'Email Town & Country and TJ Coal friendly payment reminders today.',
      'Leave current Appalachian Coal & Stove and Blue Ridge Bedding invoices untouched.'
    ],
    aiSummary: 'Placeholder AR data shows $77,638.40 open, with $58,557.40 overdue. Pocono Pellet Co. is the only critical account and should be owner-reviewed before any additional shipment. The rest are normal follow-up reminders.'
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export { summarizeAR };
