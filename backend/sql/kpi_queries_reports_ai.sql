-- KPI query pack for reports-ai (public schema)
-- Uses current_date in DB timezone.

-- Current DB date/time reference
SELECT now() AS now_ts, current_date AS today_date, current_setting('TimeZone') AS tz;

-- Truck turnaround time by date (year=2025 in requested example)
SELECT
  "TRANDATE"::date AS tran_date,
  ROUND(AVG(NULLIF(regexp_replace(COALESCE("TIMETAKENINSEC"::text, ''), '[^0-9.-]', '', 'g'), '')::numeric), 2) AS avg_sec,
  COUNT(*) AS records
FROM public."RPT_IBCTSTATUS01"
WHERE "ACTIVITY" IN (
  'Dock to Stock',
  'Dock to Stock - ASN/Return Receiving',
  'Dock to Stock - Production receiving',
  'Dock to Stock over all - ASN/Return Receiving'
)
  AND date_part('year', "TRANDATE") = 2025
GROUP BY "TRANDATE"::date
ORDER BY "TRANDATE"::date;

-- Truck turnaround time of June 2025
SELECT
  ROUND(AVG(NULLIF(regexp_replace(COALESCE("TIMETAKENINSEC"::text, ''), '[^0-9.-]', '', 'g'), '')::numeric), 2) AS avg_sec,
  COUNT(*) AS records
FROM public."RPT_IBCTSTATUS01"
WHERE "ACTIVITY" IN (
  'Dock to Stock',
  'Dock to Stock - ASN/Return Receiving',
  'Dock to Stock - Production receiving',
  'Dock to Stock over all - ASN/Return Receiving'
)
  AND "TRANDATE" >= DATE '2025-06-01'
  AND "TRANDATE" < DATE '2025-07-01';

-- How many stock transfer receipts done today?
SELECT COUNT(DISTINCT "STINUM") AS stock_transfer_receipts_today
FROM public."RPT_IBCTDETL01"
WHERE "TRANDATE" = current_date;

-- How many stock transfer receipts done this month?
SELECT COUNT(DISTINCT "STINUM") AS stock_transfer_receipts_this_month
FROM public."RPT_IBCTDETL01"
WHERE "TRANDATE" >= date_trunc('month', current_date)::date
  AND "TRANDATE" < (date_trunc('month', current_date) + interval '1 month')::date;

-- How many quantity received today?
SELECT COALESCE(SUM("RCVDQTY"), 0) AS quantity_received_today
FROM public."RPT_IBCTDETL01"
WHERE "TRANDATE" = current_date;

-- How many line items received today?
SELECT COALESCE(SUM("RCVDLINES"), 0) AS line_items_received_today
FROM public."RPT_IBCTDETL01"
WHERE "TRANDATE" = current_date;

-- Average line items per STI received today
SELECT
  CASE
    WHEN COUNT(DISTINCT "STINUM") = 0 THEN 0
    ELSE ROUND(COALESCE(SUM("RCVDLINES"), 0)::numeric / COUNT(DISTINCT "STINUM"), 2)
  END AS avg_line_items_per_sti_today
FROM public."RPT_IBCTDETL01"
WHERE "TRANDATE" = current_date;

-- Time taken for unloading / putaway today
SELECT
  COALESCE(SUM(NULLIF(regexp_replace(COALESCE("TIMETAKENINSEC"::text, ''), '[^0-9.-]', '', 'g'), '')::numeric), 0) AS total_sec,
  ROUND(COALESCE(AVG(NULLIF(regexp_replace(COALESCE("TIMETAKENINSEC"::text, ''), '[^0-9.-]', '', 'g'), '')::numeric), 0), 2) AS avg_sec
FROM public."RPT_IBCTSTATUS01"
WHERE "TRANDATE" = current_date
  AND "ACTIVITY" IN ('Unloaded', 'Putaway');

-- List users who unloaded / putaway today
SELECT DISTINCT "USERID", "USERFNAME", "USERLNAME", "ACTIVITY"
FROM public."RPT_IBCTUSRDETL01"
WHERE "TRANDATE" = current_date
  AND ("ACTIVITY" ILIKE 'Unloading%' OR "ACTIVITY" ILIKE 'Putaway%')
ORDER BY "USERID", "ACTIVITY";

-- How many unload qty completed today?
SELECT COALESCE(SUM("TRANQTY"), 0) AS unload_qty_completed_today
FROM public."RPT_IBCTSTATUS01"
WHERE "TRANDATE" = current_date
  AND "ACTIVITY" = 'Unloaded';

-- How much GRN completed today?
SELECT COALESCE(SUM("TRANQTY"), 0) AS grn_completed_today
FROM public."RPT_IBCTSTATUS01"
WHERE "TRANDATE" = current_date
  AND "ACTIVITY" = 'GRN Confirmed';

-- How many orders done today?
SELECT COUNT(DISTINCT "MANIFESTNUM") AS orders_done_today
FROM public."RPT_OBCTDETL01"
WHERE "TRANDATE" = current_date;

-- How many line items invoiced today?
SELECT COALESCE(SUM("TRANLINES"), 0) AS line_items_invoiced_today
FROM public."RPT_OBCTSTATUS01"
WHERE "TRANDATE" = current_date
  AND "ACTIVITY" = 'Invoiced';

-- How many quantity invoiced today?
SELECT COALESCE(SUM("TRANQTY"), 0) AS qty_invoiced_today
FROM public."RPT_OBCTSTATUS01"
WHERE "TRANDATE" = current_date
  AND "ACTIVITY" = 'Invoiced';

-- List users who are picking/loading today
SELECT DISTINCT "USERID", "USERFNAME", "USERLNAME", "ACTIVITY"
FROM public."RPT_OBCTUSRDETL01"
WHERE "TRANDATE" = current_date
  AND ("ACTIVITY" ILIKE 'Picking%' OR "ACTIVITY" ILIKE 'Loading%')
ORDER BY "USERID", "ACTIVITY";

-- Resource plan for unloading / putaway (today shift) - source PLANCONF01
SELECT COALESCE(SUM("PLANVALUE"), 0) AS resource_plan_unloading_putaway_today
FROM public."PLANCONF01"
WHERE "PLANDATE" = current_date
  AND ("PLANACTIVITY" ILIKE '%RCPT%' OR "PLANACTIVITY" ILIKE '%PUT%');

-- Resource plan for picking (today shift)
SELECT COALESCE(SUM("PLANVALUE"), 0) AS resource_plan_picking_today
FROM public."PLANCONF01"
WHERE "PLANDATE" = current_date
  AND "PLANACTIVITY" ILIKE '%PICK%';

-- Resource plan for loading (today shift)
SELECT COALESCE(SUM("PLANVALUE"), 0) AS resource_plan_loading_today
FROM public."PLANCONF01"
WHERE "PLANDATE" = current_date
  AND "PLANACTIVITY" ILIKE '%LOAD%';

-- Resource plan for shipment (today shift)
SELECT COALESCE(SUM("PLANVALUE"), 0) AS resource_plan_shipment_today
FROM public."PLANCONF01"
WHERE "PLANDATE" = current_date
  AND ("PLANACTIVITY" ILIKE '%SHIP%' OR "PLANACTIVITY" ILIKE '%MANIFEST%');

-- Putaway planned vs actual today
WITH p AS (
  SELECT COALESCE(SUM("PLANVALUE"), 0) AS planned
  FROM public."PLANCONF01"
  WHERE "PLANDATE" = current_date
    AND "PLANACTIVITY" ILIKE '%PUT%'
), a AS (
  SELECT COALESCE(SUM("TRANQTY"), 0) AS actual
  FROM public."RPT_IBCTSTATUS01"
  WHERE "TRANDATE" = current_date
    AND "ACTIVITY" = 'Putaway'
)
SELECT p.planned, a.actual
FROM p CROSS JOIN a;

-- Picking planned vs actual today
WITH p AS (
  SELECT COALESCE(SUM("PLANVALUE"), 0) AS planned
  FROM public."PLANCONF01"
  WHERE "PLANDATE" = current_date
    AND "PLANACTIVITY" ILIKE '%PICK%'
), a AS (
  SELECT COALESCE(SUM("TRANQTY"), 0) AS actual
  FROM public."RPT_OBCTSTATUS01"
  WHERE "TRANDATE" = current_date
    AND "ACTIVITY" ILIKE 'Picked%'
)
SELECT p.planned, a.actual
FROM p CROSS JOIN a;

-- Loading planned vs actual today
WITH p AS (
  SELECT COALESCE(SUM("PLANVALUE"), 0) AS planned
  FROM public."PLANCONF01"
  WHERE "PLANDATE" = current_date
    AND "PLANACTIVITY" ILIKE '%LOAD%'
), a AS (
  SELECT COALESCE(SUM("ACTIVITYQTY"), 0) AS actual
  FROM public."RPT_OBCTUSRDETL01"
  WHERE "TRANDATE" = current_date
    AND "ACTIVITY" ILIKE 'Loading%'
)
SELECT p.planned, a.actual
FROM p CROSS JOIN a;
