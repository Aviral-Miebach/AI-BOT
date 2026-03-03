function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function formatTableRef(fqtn) {
  const [schema, table] = String(fqtn || "").split(".");
  if (!schema || !table) return fqtn;
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

const COMPANY_ANCHOR = "public.compmst00";
const COMPANY_JOIN_TARGETS = [
  "public.ctlbrd01",
  "public.cusmst00",
  "public.planconf01",
  "public.rpt_activity01",
  "public.rpt_activity01_20250403",
  "public.rpt_goctdetl01",
  "public.rpt_ibctdetl01",
  "public.rpt_ibctstatus01",
  "public.rpt_ibctusrdetl01",
  "public.rpt_locutlog01",
  "public.rpt_mntrhistuser01",
  "public.rpt_mntrhistwhse01",
  "public.rpt_obctdetl01",
  "public.rpt_obctstatus01",
  "public.rpt_obctusrdetl01",
  "public.rpt_stkctdetl01",
  "public.rpt_stktrandetl01",
  "public.rpt_trhistuser01",
  "public.rpt_trhistwhse01",
  "public.rpt_whsectdetl01",
  "public.rpt_wktrhistuser01",
  "public.rpt_wktrhistwhse01",
  "public.shiftdetl01",
  "public.skumst00",
  "public.usrmst00",
  "public.vndmst00",
  "public.whsemst00"
];

export function buildManualJoinRules(existingTables = []) {
  const existing = new Set(existingTables.map((name) => String(name || "").toLowerCase()));
  if (!existing.has(COMPANY_ANCHOR)) {
    return [];
  }

  const anchorRef = formatTableRef(COMPANY_ANCHOR);
  const rules = [
    `MANUAL JOIN STRATEGY: Prefer ${anchorRef} as the anchor for company-scoped joins in this schema.`,
    "MANUAL SQL STYLE: Use explicit INNER JOIN ... ON syntax; never use comma-separated FROM joins.",
    `MANUAL CAUTION: If multiple detail tables are joined only by ${anchorRef}."COMPANY", row multiplication is likely. Join only tables required by the question.`
  ];

  for (const target of COMPANY_JOIN_TARGETS) {
    if (!existing.has(target)) continue;
    const targetRef = formatTableRef(target);
    rules.push(`MANUAL_PREFERRED_JOIN INNER ${anchorRef}."COMPANY" = ${targetRef}."COMPANY"`);
  }

  return rules;
}
