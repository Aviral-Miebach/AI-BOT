
//   static aigenerateReport = async (req, res) => {
//     let response = {
//       status: false,
//       message: "Unprocessable Entry from report",
//       data: {},
//       statusCode: 422,
//     };
//     let final_output = '';
//     //const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//     //const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//     try {
//       // ---------- 1) SCHEMA & GLOSSARY (views only) ----------
//       const SCHEMA = `
// You generate SAFE PostgreSQL SELECT queries for analytics using ONLY these tables & columns:
// default year = 2025
// - public.rpt_goctdetl01 (trandate,shiftid,startdttm,enddttm,dtrf,gpmode,timetakeninsec,numofdoc,recordtype,wgtavgtatinsec,wgtavgtatratio
// )
// - public.rpt_ibctdetl01 (trandate,shiftid,stinum,vendor,city,state,skugroup,skutype,skucata,skuscata,skubrand,businessline,skucolor,abcclass,rcvdqty,rcvdlines,rcvdskucount,rcvdvalue,rcvdvolume,rcvdunitwgt,rcvdgrosswgt,rcvdeqvlwgt,dtrf,status,skucode,rcpttype
// );
// - public.rpt_ibctstatus01 (trandate,shiftid,linenum,activity,stinum,vendor,city,state,region,skugroup,skutype,skucata,skuscata,skubrand,businessline,skucolor,abcclass,tranqty,tranlines,tranvalue,tranvolume,tranunitwgt,trangrosswgt,traneqvlwgt,durationinhr,timetakeninsec,recordtype,numofdoc
// );
// - public.rpt_ibctusrdetl01 (trandate,shiftid,linenum,activity,userid,userfname,userlname,skugroup,skutype,skucata,skuscata,skubrand,businessline,skucolor,abcclass,activityqty,activityvalue,activityvolume,activityunitwgt,activitygrosswgt,activityeqvlwgt,timetakeninsec,recordtype,numofdocnumofpallettonumofskuto
// );
// - public.rpt_obctdetl01 (trandate,shiftid,linenum,manifestnum,customer,city,state varchar(600) NULL,skugroup,skutype,skucata,skuscata,skubrand,businessline,skucolor,abcclass,ordqty,ordlines,ordskucount,ordvalue,ordvolume,ordunitwgt,ordgrosswgt,ordeqvlwgt,skucode,
// );
// - public.rpt_obctusrdetl01 (trandate,shiftid,activity,linenum,userid,userfname,userlname,skugroup,skutype,skucata,skuscata,skubrand,businessline,skucolor,skusize,abcclass,activityqty,activityvalue,activityvolume,activityunitwgt,activitygrosswgt,activityeqvlwgt,cusclass,cusgroup,cuschannel,recordtype,numofdoc,numofpalletto,numofskuto
// );
//   Always return only the SQL query as plain text — do not include markdown code blocks, backticks, or any explanation.
// `;

//       // ---------- 2) KPI / STATUS RULES ----------
//       const GLOSSARY = `
// `;

//       // ---------- 3) FEW-SHOT EXAMPLES (anchor the model) ----------
//       const EXAMPLES = `
// -- Example A1: Truck Turnaround time by date (default year = 2025)
// -- Replace '2025-06-01' with the requested date.
// select (SUM(rg.timetakeninsec)/SUM(rg.numofdoc)) as "truckturnaroundtimeinsecs"  
// from rpt_goctdetl01 rg  where rg.trandate ='2025-06-01' group by rg."trandate"



// -- Example A2: Truck Turnaround Time of June (default year = 2025)
// select 
//     (SUM(rg.timetakeninsec) / SUM(rg.numofdoc)) as "truckturnaroundtimeinsecs"
// from public.rpt_goctdetl01 rg
// where to_char(rg.trandate, 'YYYY-MM') = (extract(year from CURRENT_DATE)::text || '-06')
// group by date_trunc('month', rg.trandate)


//SELECT
//   t1."WHSENAME",
//   t1."WHSECODE",
//   AVG(CAST(t2."TIMETAKENINSEC" AS numeric)) AS "Average_Turnaround_Time_Seconds"
// FROM "public"."WHSEMST00" AS t1
// INNER JOIN "public"."RPT_GOCTDETL01" AS t2
//   ON t1."WHSE" = t2."WHSE"
// WHERE
//   t2."TRANDATE" <= $1
// GROUP BY
//   t1."WHSENAME",
//   t1."WHSECODE"
// LIMIT 100

// -- Example B1: Howmany stock transfer receipt done today (rcpttype=STASNRCPT/POASNRCPT/ASNRCPT)
// -- Replace '2025-06-01' with the requested date.
// select count(*) as totalsti from (
// select ri."stinum" from rpt_ibctdetl01 ri 
// where ri.trandate ='2025-06-01' 
// and ri.rcpttype = 'STASNRCPT' group by ri."stinum") as sub

// -- Example B2: Howmany stock transfer receipt done june month
// select count(*) as totalsti from (
// select ri."stinum" from rpt_ibctdetl01 ri 
// where to_char(ri.trandate, 'YYYY-MM') = (extract(year from CURRENT_DATE)::text || '-06') 
// and ri.rcpttype = 'STASNRCPT' group by ri."stinum") as sub

// -- Example B3: Howmany quantity received today
// select sum(ri.rcvdqty) as totalqty from rpt_ibctdetl01 ri 
// where ri.trandate ='2025-06-01' 
// and ri.rcpttype = 'STASNRCPT'

// -- Example B4: Howmany line items received today
// select count(*) as totallines from (select ri.skucode from rpt_ibctdetl01 ri 
// where ri.trandate ='2025-06-01' 
// and ri.rcpttype = 'STASNRCPT'group by ri.skucode) as sub

// -- Example B5: Average line items of sti received
// select 
//     (totallines::numeric / totalsti::numeric) as avg_lineitems_per_sti
// from (
//     select 
//         (select count(*) 
//          from (select ri.skucode 
//                from rpt_ibctdetl01 ri 
//                where ri.trandate = '2025-06-01' 
//                  and ri.rcpttype = 'STASNRCPT' 
//                group by ri."stinum",ri.skucode) as sub1) as totallines,
//         (select count(*) 
//          from (select ri."stinum" 
//                from rpt_ibctdetl01 ri 
//                where ri.trandate = '2025-06-01' 
//                  and ri.rcpttype = 'STASNRCPT' 
//                group by ri."stinum") as sub2) as totalsti
// ) as totals;

// -- Example B6: Time taken for unloading/putway today (activity=Unloading/Putaway)
// -- Replace '2025-06-01' with the requested date.
// select SUM(ri.timetakeninsec) as "unloadingtimeinsecs"  
// from rpt_ibctusrdetl01 ri  where ri.trandate ='2025-06-01' and ri.activity = 'Unloading' group by ri."trandate"

// -- Example B7: List users who unloading/putaway today
// -- Replace '2025-06-01' with the requested date.
// select userfname,SUM(ri.activityqty) as "unloadingqty"
// from rpt_ibctusrdetl01 ri  where ri.trandate ='2025-06-01' and ri.activity = 'Unloading' group by rg."userid",rg."userfname"


// -- Example C1: Howmany Unload qty completed today 
// -- Replace '2025-06-01' with the requested date.
// -- Replace Unloaded with the requested activity. (available activity Unloaded/Unloading Progress/Putaway)
// select sum(ri.tranqty) as totalqty 
// from rpt_ibctstatus01 ri where ri.activityunlo ='Unloaded' and ri.trandate ='2025-06-01'

// -- Example C2: Howmuch GRN completed today
// -- Replace '2025-06-01' with the requested date.
// select count(*) as totalsti from (
// select ri."stinum" from rpt_ibctstatus01 ri 
// where ri.activity ='GRN Confirmed' and ri.trandate ='2025-06-01' group by ri."stinum") as sub

// -- Example D1: Resource plan for Unloading/Putaway activity today shift
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     ROUND((asnqty.planvalue / bmvalue.bmvalue)/8 AS unloadingpersonsneeded
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYPARCVDQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (SELECT b.bmvalue 
//      FROM bmconf01 b 
//      WHERE b.bmactivity = 'BMACTIVITYPAPROD' 
//      LIMIT 1) AS bmvalue;



// -- Example D2: Resource plan for Picking activity today shift
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     ROUND((asnqty.planvalue / bmvalue.bmvalue)/8 AS pickingpersonsneeded
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYPICKQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (SELECT b.bmvalue 
//      FROM bmconf01 b 
//      WHERE b.bmactivity = 'BMACTIVITYPKPROD' 
//      LIMIT 1) AS bmvalue;

// -- Example D3: Resource plan for loading activity today shift
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     ROUND((asnqty.planvalue / bmvalue.bmvalue)/8 AS loadingpersonsneeded
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYLOADQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (SELECT b.bmvalue 
//      FROM bmconf01 b 
//      WHERE b.bmactivity = 'BMACTIVITYPKPROD' 
//      LIMIT 1) AS bmvalue;

// -- Example D4: Resource plan for shipment activity today shift
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     ROUND((asnqty.planvalue / bmvalue.bmvalue)/8 AS shipmentpersonsneeded
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYSHIPQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (SELECT b.bmvalue 
//      FROM bmconf01 b 
//      WHERE b.bmactivity = 'BMACTIVITYPKPROD' 
//      LIMIT 1) AS bmvalue;

// -- Example E1: Unloading Planned vs Actual today
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     asnqty.planvalue AS plannedunloadedqty,
//     actualunloadedqty.totalqty AS actualunloadedqty
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYPARCVDQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (select sum(ri.rcvdqty) as totalqty from rpt_ibctdetl01 ri 
// where ri.trandate ='2025-06-01' 
// and ri.rcpttype = 'STASNRCPT') AS actualunloadedqty;

// -- Example E2: Putaway Planned vs Actual today
// -- Replace '2025-06-01' with the requested date.
// SELECT 
//     asnqty.planvalue AS plannedputawayqty,
//     actualunloadedqty.totalqty AS actualputawayqty
// FROM 
//     (SELECT p.planvalue  
//      FROM planconf01 p 
//      WHERE p.planactivity = 'PLANACTIVITYPARCVDQTY' 
//        AND p.date = '2025-09-01' 
//      LIMIT 1) AS asnqty,
//     (select sum(ri.rcvdqty) as totalqty from rpt_ibctdetl01 ri 
// where ri.trandate ='2025-06-01' 
// and ri.rcpttype = 'STASNRCPT') AS actualunloadedqty;

// -- Example E3: Picking Planned vs Actual today
// -- Replace '2025-06-01' with the requested date.
// SELECT
//     asnqty.planvalue AS plannedpickedqty,
//     actualpickedqty.totalqty AS actualpickedqty
// FROM
//     (SELECT p.planvalue
//      FROM planconf01 p
//      WHERE p.planactivity = 'PLANACTIVITYPICKQTY'
//        AND p.date = '2025-06-01'
//      LIMIT 1) AS asnqty,
//     (select sum(ro.activityqty) as totalqty from public.rpt_obctusrdetl01 ro
// where ro.trandate ='2025-06-01' and ro.activity = 'Picking') AS actualpickedqty;

// -- Example E4: Loaded Planned vs Actual today
// -- Replace '2025-06-01' with the requested date.
// SELECT
//     asnqty.planvalue AS plannedloadedqty,
//     actualloadedqty.totalqty AS actualloadedqty
// FROM
//     (SELECT p.planvalue
//      FROM planconf01 p
//      WHERE p.planactivity = 'PLANACTIVITYLOADQTY'
//        AND p.date = '2025-06-01'
//      LIMIT 1) AS asnqty,
//     (select sum(ro.activityqty) as totalqty from public.rpt_obctusrdetl01 ro
// where ro.trandate ='2025-06-01' and ro.activity = 'Loading') AS actualloadedqty;

// -- Example F1: Howmany orders done today
// -- Replace '2025-06-01' with the requested date.
// select count(*) as totalorders from (
// select ro."manifestnum" from rpt_obctdetl01 ro 
// where ro.trandate ='2025-06-01' group by ro."manifestnum") as sub

// -- Example F2: Howmany line items Invoiced today (activity=Invoiced/Picked/Loaded/Picklist Generated/Picking Progress)
// select sum(ordlines) as orderlines from rpt_obctdetl01 ro 
// where ro.trandate ='2025-06-01' group by ro.trandate

// -- Example F3: Howmany qty Invoiced today (activity=Invoiced/Picked/Loaded/Picklist Generated/Picking Progress)
// select sum(ordqty) as orderqty  from rpt_obctdetl01 ro 
// where ro.trandate ='2025-06-01' group by ro.trandate


// -- Example F4: List users who Picking/Loading today (activity=Loading/Picking)
// -- Replace '2025-06-01' with the requested date.
// select userfname,SUM(ro.activityqty) as "unloadingqty"
// from rpt_obctusrdetl01 ro  where ro.trandate ='2025-06-01' and ro.activity = 'Loading' group by ro."userid",ro."userfname"

// `;


//       // ---------- 4) System prompt ----------
//       function buildSystemPrompt() {
//         return `
// You are a cautious SQL generator for Postgres.
// Use ONLY the listed tables/columns. Generate a SINGLE SELECT statement that answers the user's question.
// Rules:
// - SELECT-only. No INSERT/UPDATE/DELETE/ALTER/DROP/TRUNCATE/GRANT/REVOKE/COPY/CALL/DO/COMMENT/SET/RESET/SHOW.
// - Use fully-qualified table/view names (public.schema).
// - End with a semicolon.
// - Prefer GROUP BY when aggregating.
// - For "particular date", filter with DATE(column) = 'YYYY-MM-DD'.
// - Default year as the current year, default month current month, default day today.
// ${SCHEMA}

// ${GLOSSARY}

// ${EXAMPLES}
// `;
//       }

//       function buildSystemPromptSymmary(q,hasTimeInSecs) {
//         let promt = `User questoion: `+q+`. Show user friendly answer. Don't include any explanation, Add markdown the value`
//         if (hasTimeInSecs)
//           promt += `If value in seconds convert it to hours and minutes.`

//         promt += ``
//         return promt;
//       }

//       // ---------- 5) NL → SQL ----------
//       async function nlToSql(question) {
//         const { choices } = await openai.chat.completions.create({
//           model: "gpt-4o-mini",
//           temperature: 0.0,
//           messages: [
//             { role: "system", content: buildSystemPrompt() },
//             { role: "user", content: question }
//           ],
//         });
//         return (choices?.[0]?.message?.content || "").trim();
//       }

//       async function rowsToSummary(question,q,hasTimeInSecs) {
//         const { choices } = await openai.chat.completions.create({
//           model: "gpt-4o-mini",
//           temperature: 0.0,
//           messages: [
//             { role: "system", content: buildSystemPromptSymmary(q,hasTimeInSecs) },
//             { role: "user", content: question }
//           ],
//         });
//         console.log("choices",choices)
//         return (choices?.[0]?.message?.content || "").trim();
//       }

//       // ---------- 6) Guardrails (allowlist / denylist) ----------
//       const ALLOWED_VIEWS = [
//         "public.rpt_goctdetl01",
//         "public.rpt_ibctdetl01",
//         "public.rpt_ibctstatus01",
//         "public.rpt_ibctusrdetl01",
//         "public.rpt_obctdetl01",
//         "public.rpt_obctstatus01",
//         "public.rpt_obctusrdetl01"
//       ];
//       const DANGEROUS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|VACUUM|ANALYZE|REFRESH|SET|RESET|SHOW|COPY|DO|CALL|MERGE|COMMENT|PRAGMA)\b/i;

//       function validateSql(sql) {
//         if (!/^\s*select\b/i.test(sql)) {
//           throw new Error("Only SELECT queries are allowed.");
//         }
//         if (DANGEROUS.test(sql)) {
//           throw new Error("Dangerous SQL detected.");
//         }
//         // crude check that references only allowed views
//         // const lower = sql.toLowerCase();
//         // const fromMatches = lower.match(/\bfrom\s+([a-z0-9_."']+)/g) || [];
//         // const joinMatches = lower.match(/\bjoin\s+([a-z0-9_."']+)/g) || [];
//         // const objs = [...fromMatches, ...joinMatches].map(s => s.split(/\s+/)[1]?.replace(/["']/g, ""));
//         // for (const obj of objs) {
//         //   if (!obj) continue;
//         //   // allow table aliases: "public.ai_orders o" -> obj is "public.ai_orders"
//         //   if (!ALLOWED_VIEWS.includes(obj)) {
//         //     throw new Error(`Forbidden object referenced: ${obj}`);
//         //   }
//         // }
//         // add LIMIT for non-aggregated wide selects (optional safety)
//         if (!/group\s+by/i.test(sql) && !/limit\s+\d+/i.test(sql)) {
//           sql = sql.replace(/;?\s*$/, " LIMIT 1000;");
//         }
//         // enforce semicolon
//         if (!/;\s*$/.test(sql)) sql += ";";
//         return sql;
//       }

//       // ---------- 7) Run SQL ----------
//       async function runSql(sql) {
//         const [rows] = await sequelizeIndiawms.query(sql, { raw: true, plain: false });
//         return rows;
//       }

//       // ---------- 8) Pretty summaries ----------
//       function summarize(question, rows) {
//         if (!Array.isArray(rows) || rows.length === 0) return "No rows.";
//         const first = rows[0];
//         const keys = Object.keys(first);
//         // simple heuristics for known shapes
//         if (keys.includes("the_date") && keys.includes("total_orders")) {
//           const r = first;
//           return `On ${r.the_date}: total orders ${r.total_orders}, completed ${r.completed_orders}, processing ${r.processing_orders}, pending ${r.pending_orders}.`;
//         }
//         if (keys.includes("the_date") && keys.includes("total_tasks")) {
//           const r = first;
//           return `On ${r.the_date}: total picking tasks ${r.total_tasks}, completed ${r.completed_tasks}, processing ${r.processing_tasks}, pending ${r.pending_tasks}.`;
//         }
//         if (keys.includes("erp_order_type") && keys.includes("total_orders")) {
//           const lines = rows.map(r =>
//             `${r.erp_order_type}: total ${r.total_orders}, completed ${r.completed_orders}, processing ${r.processing_orders}, pending ${r.pending_orders}`
//           );
//           return `ERP order types:\n- ${lines.join("\n- ")}`;
//         }
//         // fallback
//         return `Returned ${rows.length} row(s). Keys: ${keys.join(", ")}`;
//       }

//       // ---------- 9) Demo run ----------
//       async function main() {
//         try {
//           //await sequelize.authenticate();
//           const { user_text } = req.params.user_text || req.body;
//           let q = user_text;
//           // const questions = [
//           //   // 1) Orders on a particular date
//           //   "For 2025-09-01, show total number of orders and counts of completed, processing, and pending.",
//           //   // 2) Picking tasks on a particular date
//           //   "For 2025-09-01, show total number of picking tasks and counts of completed, processing, and pending.",
//           //   // 3) ERP order types breakdown
//           //   "List erp_order_type and the counts of total, completed, processing, and pending orders."
//           // ];

//           //for (const q of questions) {
//             console.log("\nQ:", q);
//             const generated = await nlToSql(q);
//             console.log("\nGenerated SQL:\n", generated);

//             const safeSql = validateSql(generated);
//             const rows = await runSql(safeSql);
//             console.log("\nRows:\n", rows);
//             if(rows.length > 0){
//               const hasTimeInSecs = rows.some(obj =>
//                 Object.keys(obj).some(key => key.includes('timeinsecs'))
//               );
//             let output = await rowsToSummary(JSON.stringify(rows),q,hasTimeInSecs);
//           console.log("output",output);
//             // let output =summarize(q, rows);
//             // console.log("\nSummary:\n", output);
//             // console.log("\n" + "-".repeat(80));

//             const now = new Date().toISOString();

//             // Create new AI chat message
//             // const newMessage = await AICHAT.create({
//             //   COMMENT:output,
//             //   SENDER:'AI',
//             //   DTCR: now,
//             //   DTLM: now,
//             // });

//             return output;
//             }else{
//               return "No data found";
//             }
//           //}
//         } catch (err) {
//           console.error("Error:", err.message);
//         } finally {
//           //await sequelize.close();
//         }
//       }

//       final_output = await main();
//       return res.status(200).json({
//         status: 200,
//         message: "Data fetch successfully",
//         data: final_output,
//       });
//     } catch (error) {
//       //ERROR RESPONSE
//       console.log("Error \n", error);
//       response.status = false;
//       response.message = error.message || response.message;
//       response.validation = error.cause || {};
//       response.statusCode = error.statusCode || response.statusCode;
//     }
//     return this.sendResponse(res, response);
//   };

 
