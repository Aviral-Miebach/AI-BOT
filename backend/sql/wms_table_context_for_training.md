# WMS Table Context For Training
 
Source dump: 030326_wms_report_db_wms_dashboard_report-202603031018.sql
Generated on: 2026-03-03 17:40:39 +05:30
 
## Summary
- Total tables: 28
- Schema: public
 
## COMPMST00
- Purpose: Company/tenant master table.
- Columns: 29
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| COMPNAME | character varying(100) NOT NULL |
| COMPADDR1 | character varying(100) |
| COMPADDR2 | character varying(100) |
| COMPADDR3 | character varying(100) |
| PRODUCTKEY | character varying(100) |
| CURRSYM | character varying(60) |
| COMMREGNUM | character varying(60) |
| CSTREGNUM | character varying(60) |
| LSTREGNUM | character varying(60) |
| SMTPADDR | character varying(60) |
| POP3ADDR | character varying(60) |
| LANGID | character varying(60) |
| MAINDB | character varying(60) |
| INTERFACEDB | character varying(60) |
| MNDBDTFMT | character varying(60) |
| INDBDTFMT | character varying(60) |
| APPLOCK | character varying(100) |
| REGDATE | date |
| EXPDATE | date |
| MODULEINSTALLED | character varying(500) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | integer |
| COMPSNAME | character varying(60) |
| INDUSTRYTYPE | character varying(60) |
 
## CTLBRD01
- Purpose: Control/configuration parameter table.
- Columns: 24
- Key-like columns: id, STATUS
 
| Column | Definition |
|---|---|
| id | integer NOT NULL |
| CATEGORYID | integer NOT NULL |
| COMPANY | integer |
| WHSE | integer |
| INOWNER | integer |
| SETID | character varying(60) NOT NULL |
| FIELDNUM | character varying(60) |
| REMARK | character varying(2000) |
| STATUS | integer DEFAULT 10100 NOT NULL |
| CRUSERID | bigint |
| DTCR | timestamp with time zone |
| DTLM | timestamp with time zone |
| LMUSERID | bigint |
| UPDCNT | integer |
| SETTVAL | json |
| ctlbrdnum | integer |
| moduleid | character varying(50) |
| settype | character varying(50) |
| setval1 | character varying(50) |
| setval2 | character varying(50) |
| setval3 | character varying(50) |
| setval4 | character varying(50) |
| setval5 | character varying(50) |
| transtype | character varying(50) |
 
## CUSMST00
- Purpose: Customer master table.
- Columns: 78
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| CUSNAME | character varying(255) |
| CUSCLASS | character varying(255) |
| ADDR1 | character varying(100) |
| ADDR2 | character varying(100) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| PINCD | character varying(60) |
| COUNTRY | character varying(60) |
| PRIORITY | numeric(5,0) |
| TIN | character varying(60) |
| PAN | character varying(60) |
| CREDITLIMIT | character varying(255) |
| TEL | character varying(60) |
| FAX | character varying(60) |
| CONTACT | character varying(100) |
| EMAIL | character varying(100) |
| WEBSITE | character varying(60) |
| HOLDFLAG | character varying(60) |
| HOLDNUM | numeric(21,0) |
| STATUS | numeric(5,0) DEFAULT 10100 |
| CRUSERID | numeric(24,0) |
| DTCR | timestamp with time zone |
| DTLM | timestamp with time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| id | integer NOT NULL |
| COMPANY | numeric(20,0) |
| INOWNER | numeric(20,0) |
| CUSTOMER | character varying(60) NOT NULL |
| ADDR3 | character varying(100) |
| ADDR4 | character varying(100) |
| TRADETYPE | character varying(60) |
| CUSGROUP | character varying(60) |
| CUSSUBCLASS | character varying(60) |
| REGION | character varying(60) |
| MIXSKU | integer |
| CUSATR01 | character varying(100) |
| CUSATR02 | character varying(100) |
| CUSATR03 | character varying(100) |
| CUSATR04 | character varying(100) |
| CUSATR05 | character varying(100) |
| CUSATR06 | character varying(100) |
| CUSATR07 | character varying(100) |
| CUSATR08 | character varying(100) |
| CUSATR09 | character varying(100) |
| CUSATR10 | character varying(100) |
| CUSATR11 | character varying(100) |
| CUSATR12 | character varying(100) |
| CUSATR13 | character varying(100) |
| CUSATR14 | character varying(100) |
| CUSATR15 | character varying(100) |
| CREDITDAYS | numeric(24,3) |
| DELROUTE | character varying(60) |
| DELSTOP | numeric(5,0) |
| SELFLIFESAFEPERC | numeric(24,0) |
| MIXSKUINONESHLUID | character(1) |
| CUSCHANNEL | character varying(60) |
| WMSENABLED | character varying(60) |
| ERPCUSATR01 | character varying(60) |
| ERPCUSATR02 | character varying(60) |
| ERPCUSATR03 | character varying(60) |
| ERPCUSATR04 | character varying(60) |
| ERPCUSATR05 | character varying(60) |
| ERPCUSATR06 | character varying(60) |
| ERPCUSATR07 | character varying(60) |
| ERPCUSATR08 | character varying(60) |
| ERPCUSATR09 | character varying(60) |
| ERPCUSATR10 | character varying(60) |
| ERPCUSATR11 | character varying(60) |
| ERPCUSATR12 | character varying(60) |
| ERPCUSATR13 | character varying(60) |
| ERPCUSATR14 | character varying(60) |
| ERPCUSATR15 | character varying(60) |
| ERPCUSATR16 | character varying(60) |
| ERPCUSATR17 | character varying(60) |
| ERPCUSATR18 | character varying(60) |
| ERPCUSATR19 | character varying(60) |
| ERPCUSATR20 | character varying(60) |
 
## PLANCONF01
- Purpose: Planning/configuration table for resource or process plans.
- Columns: 15
- Key-like columns: STATUS, DATE
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| PLANDATE | date NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| PLANACTIVITY | character varying(60) NOT NULL |
| PLANUOM | character varying(60) NOT NULL |
| PLANVALUE | numeric(24,3) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| PLANGROUP | character varying(60) |
| DATE | date |
 
## RPT_ACTIVITY01
- Purpose: Activity summary reporting table by date/type/status buckets.
- Columns: 14
- Key-like columns: DATE, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) |
| WHSE | numeric(5,0) |
| INOWNER | numeric(5,0) |
| DATE | date |
| TIME | time without time zone |
| TRANTYPE | character varying(60) |
| DESCRIPTION | character varying(60) |
| OPEN | bigint |
| PROCESSING | bigint |
| COMPLETED | bigint |
| UNITS | character varying(60) |
| PUBLISHID | integer |
| id | integer NOT NULL |
| CATEGORY | character varying |
 
## RPT_ACTIVITY01_20250403
- Purpose: Activity summary reporting table by date/type/status buckets.
- Columns: 14
- Key-like columns: DATE, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) |
| WHSE | numeric(5,0) |
| INOWNER | numeric(5,0) |
| DATE | date |
| TIME | time without time zone |
| TRANTYPE | character varying(60) |
| DESCRIPTION | character varying(60) |
| OPEN | integer |
| PROCESSING | integer |
| COMPLETED | integer |
| UNITS | character varying(60) |
| PUBLISHID | integer |
| id | integer |
| CATEGORY | character varying |
 
## RPT_GOCTDETL01
- Purpose: Operational cycle-time/detail report table (likely turnaround/processing metrics).
- Columns: 37
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| TRANTYPE | character varying(60) |
| TRANQTY | numeric(21,0) |
| TRANVALUE | numeric(24,3) |
| TRANVOLUME | numeric(24,3) |
| TRANUNITWGT | numeric(24,3) |
| TRANGROSSWGT | numeric(24,3) |
| TRANEQVLWGT | numeric(24,3) |
| DTRF | timestamp with time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| GPMODE | character varying(60) |
| DURATIONINHR | numeric(24,3) |
| id | integer |
| THDATE | date |
| TRANDATE | timestamp without time zone |
| STARTDTTM | timestamp with time zone |
| ENDDTTM | timestamp with time zone |
| WGTAVGTATRATIO | numeric(24,3) |
| WGTAVGTATINSEC | numeric(24,3) |
| REGION | character varying(60) |
| CLUSTER | character varying(60) |
| WHSETYPE | character varying(60) |
| WHSESIZE | character varying(60) |
| WHSENAME | character varying(255) |
| WHSECODE | character varying(60) |
| COUNTRY | character varying(60) |
| TIMETAKENINSEC | numeric(24,3) |
| NUMOFDOC | numeric(21,0) |
| RECORDTYPE | character varying(60) |
 
## RPT_IBCTDETL01
- Purpose: Inbound operations reporting table (receipts, GRN, unload/putaway, inbound users/status).
- Columns: 42
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric NOT NULL |
| WHSE | numeric NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric NOT NULL |
| STINUM | character varying(60) |
| VENDOR | character varying(60) |
| VNDCLASS | character varying(60) |
| VNDGROUP | character varying(60) |
| VNDCHANNEL | character varying(60) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| REGION | character varying(60) |
| INOWNER | numeric |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| ABCCLASS | character varying(60) |
| RCVDQTY | numeric |
| RCVDLINES | numeric |
| RCVDSKUCOUNT | numeric |
| RCVDVALUE | numeric |
| RCVDVOLUME | numeric |
| RCVDUNITWGT | numeric |
| RCVDGROSSWGT | numeric |
| RCVDEQVLWGT | numeric |
| DTRF | timestamp(6) with time zone |
| STATUS | numeric NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric |
| SKUCODE | character varying(60) |
| ASMCODE | character varying(60) |
| id | integer |
| RECORDTYPE | character varying(60) |
| RCPTTYPE | character varying(60) |
 
## RPT_IBCTSTATUS01
- Purpose: Inbound operations reporting table (receipts, GRN, unload/putaway, inbound users/status).
- Columns: 42
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| ACTIVITY | character varying(100) NOT NULL |
| INOWNER | numeric(5,0) |
| STINUM | character varying(60) |
| VENDOR | character varying(60) |
| VNDCLASS | character varying(60) |
| VNDGROUP | character varying(60) |
| VNDCHANNEL | character varying(60) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| REGION | character varying(60) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| ABCCLASS | character varying(60) |
| TRANQTY | numeric(21,3) |
| TRANLINES | numeric(21,3) |
| TRANVALUE | numeric(24,3) |
| TRANVOLUME | numeric(24,3) |
| TRANUNITWGT | numeric(24,3) |
| TRANGROSSWGT | numeric(24,3) |
| TRANEQVLWGT | numeric(24,3) |
| DTRF | timestamp with time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| DURATIONINHR | numeric(21,0) |
| id | integer |
| TIMETAKENINHR | character varying |
| TIMETAKENINSEC | character varying |
| RECORDTYPE | character varying(60) |
 
## RPT_IBCTUSRDETL01
- Purpose: Inbound operations reporting table (receipts, GRN, unload/putaway, inbound users/status).
- Columns: 54
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| ACTIVITY | character varying(100) NOT NULL |
| USERID | numeric(21,0) |
| USERFNAME | character varying(100) |
| USERLNAME | character varying(100) |
| INOWNER | numeric(5,0) |
| VNDCLASS | character varying(60) |
| VNDGROUP | character varying(60) |
| VNDCHANNEL | character varying(60) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| ABCCLASS | character varying(60) |
| ACTIVITYQTY | numeric(21,3) |
| ACTIVITYVALUE | numeric(24,3) |
| ACTIVITYVOLUME | numeric(24,3) |
| ACTIVITYUNITWGT | numeric(24,3) |
| ACTIVITYGROSSWGT | numeric(24,3) |
| ACTIVITYEQVLWGT | numeric(24,3) |
| STARTDTTM | timestamp without time zone |
| ENDDTTM | timestamp without time zone |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| id | integer |
| MINRCVDDTTM | timestamp without time zone |
| MAXRCVDDTTM | timestamp without time zone |
| TOMODE | character varying |
| NUMOFPALLETTO | character varying |
| NUMOFSKUTO | character varying |
| TIMETAKENINSEC | numeric(24,3) |
| REGION | character varying(60) |
| CLUSTER | character varying(60) |
| WHSETYPE | character varying(60) |
| WHSESIZE | character varying(60) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(60) |
| COUNTRY | character varying(60) |
| RECTYPE | character varying(60) |
| NUMOFDOC | numeric(24,0) |
| RECORDTYPE | character varying(60) |
| TIMETAKENINHR | numeric(24,3) |
 
## RPT_LOCUTLOG01
- Purpose: Location utility/log reporting table.
- Columns: 30
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| LOCTYPE | character varying(60) |
| PUTZONE | character varying(60) |
| LOCZONE | character varying(60) |
| LOCCLASS | character varying(60) |
| LOCCLASSDESC | character varying(100) |
| LOCSUBCLASS | character varying(60) |
| LOCFLOOR | character varying(60) |
| LOCLEVEL | character varying(60) |
| LOCACCCODE | character varying(60) |
| WORKAREA | character varying(60) |
| LOCATIONCOUNT | numeric(24,3) |
| BESTFITTYPE | character varying(60) |
| BESTFITTYPEDESC | character varying(60) |
| MAXCAPACITY | numeric(24,3) |
| UTILCAPACITY | numeric(24,3) |
| AVBLCAPACITY | numeric(24,3) |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| YTFCAPACITY | numeric(24,3) |
| id | integer |
| OPENLOCFLAG | character(1) |
 
## RPT_MNTRHISTUSER01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 28
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| USERID | numeric(21,0) NOT NULL |
| THYEAR | integer NOT NULL |
| THMONTH | integer NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYDESC | character varying(100) NOT NULL |
| THHOUR | numeric(24,3) |
| THQTY | numeric(24,3) |
| THPACK | numeric(24,3) |
| THPALLET | numeric(24,3) |
| THGROSSWGT | numeric(24,3) |
| BMQTYPERHOUR | numeric(24,3) |
| BMCASEPERHOUR | numeric(24,3) |
| BMPALLETPERHOUR | numeric(24,3) |
| BMGROSSWGTPERHOUR | numeric(24,3) |
| FROMDATE | date |
| TODATE | date |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| USERNAME | character varying(500) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## RPT_MNTRHISTWHSE01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 25
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| INOWNER | numeric(5,0) NOT NULL |
| THYEAR | integer NOT NULL |
| THMONTH | integer NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYGROUP | character varying(60) NOT NULL |
| UOM | character varying(60) |
| BMVALUE | numeric(24,3) |
| ACTIVITYVALUE | numeric(24,3) |
| ACTIVITYDESC | character varying(100) |
| ACTIVITYGROUPDESC | character varying(100) |
| UOMDESC | character varying(100) |
| FROMDATE | date |
| TODATE | date |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| INONAME | character varying(100) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## RPT_OBCTDETL01
- Purpose: Outbound operations reporting table (orders, invoicing, picking/loading users/status).
- Columns: 41
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| MANIFESTNUM | numeric(21,0) NOT NULL |
| CUSTOMER | character varying(60) |
| CUSCLASS | character varying(60) |
| CUSGROUP | character varying(600) |
| CUSCHANNEL | character varying(60) |
| CITY | character varying(60) |
| STATE | character varying(600) |
| REGION | character varying(600) |
| INOWNER | numeric(5,0) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| ABCCLASS | character varying(60) |
| ORDQTY | numeric(21,3) |
| ORDLINES | numeric(21,3) |
| ORDSKUCOUNT | numeric(21,3) |
| ORDVALUE | numeric(24,3) |
| ORDVOLUME | numeric(24,3) |
| ORDUNITWGT | numeric(24,3) |
| ORDGROSSWGT | numeric(24,3) |
| ORDEQVLWGT | numeric(24,3) |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| SKUCODE | character varying(60) NOT NULL |
| SHIPTO | character varying(60) NOT NULL |
| CORDQTY | bigint |
| RECORDTYPE | character varying(60) |
 
## RPT_OBCTSTATUS01
- Purpose: Outbound operations reporting table (orders, invoicing, picking/loading users/status).
- Columns: 46
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| ACTIVITY | character varying(100) NOT NULL |
| INOWNER | numeric(5,0) |
| MANIFESTNUM | numeric(21,0) |
| CUSTOMER | character varying(60) |
| CUSCLASS | character varying(60) |
| CUSGROUP | character varying(600) |
| CUSCHANNEL | character varying(60) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| SKUSIZE | character varying(60) |
| ABCCLASS | character varying(60) |
| TRANQTY | numeric(21,3) |
| TRANLINES | numeric(21,3) |
| TRANSKUCOUNT | numeric(21,3) |
| TRANVALUE | numeric(24,3) |
| TRANVOLUME | numeric(24,3) |
| TRANUNITWGT | numeric(24,3) |
| TRANGROSSWGT | numeric(24,3) |
| TRANEQVLWGT | numeric(24,3) |
| STARTDTTM | timestamp without time zone |
| ENDDTTM | timestamp without time zone |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| SHIPQTY | numeric(24,3) |
| PICKMODE | character varying(60) |
| ORDDATE | date |
| TIMETAKENINHR | character varying |
| TIMETAKENINSEC | character varying |
| DURATIONINHR | character varying |
| RECORDTYPE | character varying(60) |
| ORDTYPE | character varying |
 
## RPT_OBCTUSRDETL01
- Purpose: Outbound operations reporting table (orders, invoicing, picking/loading users/status).
- Columns: 44
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| SHIFTID | character varying(60) NOT NULL |
| ACTIVITY | character varying(100) NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| USERID | numeric(21,0) |
| USERFNAME | character varying(100) |
| USERLNAME | character varying(100) |
| INOWNER | numeric(5,0) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| SKUSIZE | character varying(60) |
| ABCCLASS | character varying(60) |
| ACTIVITYQTY | numeric(21,3) |
| ACTIVITYVALUE | numeric(24,3) |
| ACTIVITYVOLUME | numeric(24,3) |
| ACTIVITYUNITWGT | numeric(24,3) |
| ACTIVITYGROSSWGT | numeric(24,3) |
| ACTIVITYEQVLWGT | numeric(24,3) |
| STARTDTTM | timestamp without time zone |
| ENDDTTM | timestamp without time zone |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| CUSCLASS | character varying(60) |
| CUSGROUP | character varying(60) |
| CUSCHANNEL | character varying(60) |
| NUMOFDOC | character varying |
| TOMODE | character varying |
| NUMOFPALLETTO | character varying |
| NUMOFSKUTO | character varying |
| TIMETAKENINSEC | numeric(21,0) |
| RECORDTYPE | character varying(60) |
| TIMETAKENINHR | numeric(24,3) |
 
## RPT_STKCTDETL01
- Purpose: Stock reporting table (SKU/quantity/value trends and stock movements).
- Columns: 34
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| RECORDTYPE | character varying(60) NOT NULL |
| INOWNER | numeric(5,0) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| SKUCOLOR | character varying(60) |
| SKUSIZE | character varying(60) |
| ABCCLASS | character varying(60) |
| STOCKSKUCOUNT | numeric(21,3) |
| STOCKBATCHCOUNT | numeric(21,3) |
| LOCATIONCOUNT | numeric(21,3) |
| STOCKQTY | numeric(21,3) |
| STOCKVALUE | numeric(24,3) |
| STOCKVOLUME | numeric(24,3) |
| STOCKUNITWGT | numeric(24,3) |
| STOCKGROSSWGT | numeric(24,3) |
| STOCKEQVLWGT | numeric(24,3) |
| DTRF | timestamp without time zone |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| LOCCLASS | character varying(60) |
| LOCSUBCLASS | character varying(60) |
| LOCZONE | character varying(60) |
 
## RPT_STKTRANDETL01
- Purpose: Stock reporting table (SKU/quantity/value trends and stock movements).
- Columns: 56
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANDATE | date NOT NULL |
| LINENUM | numeric(5,0) NOT NULL |
| VENDOR | character varying(60) |
| VNDCLASS | character varying(60) |
| VNDGROUP | character varying(60) |
| VNDCHANNEL | character varying(60) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| REGION | character varying(60) |
| INOWNER | numeric(20,0) |
| SKUCODE | character varying(60) |
| SKUDESC | character varying(500) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUBRAND | character varying(60) |
| BUSINESSLINE | character varying(60) |
| PLANCODE | character varying(60) |
| SKUCOLOR | character varying(60) |
| SKUSIZE | character varying(60) |
| PUTZONE | character varying(60) |
| ABCCLASS | character varying(60) |
| UNITWGT | numeric(24,3) |
| GROSSWGT | numeric(24,3) |
| EQVLWGT | numeric(24,3) |
| LENGTH | numeric(24,3) |
| BREADTH | numeric(24,3) |
| HEIGHT | numeric(24,3) |
| VOLUME | numeric(24,3) |
| MRP | numeric(24,3) |
| STOCKQTY | numeric(24,3) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| RCPTDATE | date |
| INTBATCH | character varying(60) |
| MFGDATE | date |
| EXPDATE | date |
| PALLETID | character varying(60) |
| CLUSTER | character varying(60) |
| WHSETYPE | character varying(60) |
| WHSESIZE | character varying(60) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(60) |
| COUNTRY | character varying(60) |
| DTRF | timestamp without time zone |
| PALLETCOUNT | numeric(21,3) |
| BATCH | character varying(60) |
| LOCATIONCOUNT | numeric(21,3) |
| FMSCLASS | character varying(60) |
 
## RPT_TRHISTUSER01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 25
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| USERID | numeric(21,0) NOT NULL |
| THDATE | date NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYDESC | character varying(100) |
| THHOUR | numeric(24,3) |
| THQTY | numeric(24,3) |
| THPACK | numeric(24,3) |
| THPALLET | numeric(24,3) |
| THGROSSWGT | numeric(24,3) |
| BMQTYPERHOUR | numeric(24,3) |
| BMCASEPERHOUR | numeric(24,3) |
| BMPALLETPERHOUR | numeric(24,3) |
| BMGROSSWGTPERHOUR | numeric(24,3) |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| USERNAME | character varying(500) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp without time zone |
| DTLM | timestamp without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## RPT_TRHISTWHSE01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 22
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| INOWNER | numeric(5,0) NOT NULL |
| THDATE | date NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYGROUP | character varying(60) NOT NULL |
| UOM | character varying(60) |
| BMVALUE | numeric(24,3) |
| ACTIVITYVALUE | numeric(24,3) |
| ACTIVITYDESC | character varying(100) |
| ACTIVITYGROUPDESC | character varying(100) |
| UOMDESC | character varying(100) |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| INONAME | character varying(100) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## RPT_WHSECTDETL01
- Purpose: Warehouse-level consolidated reporting table.
- Columns: 56
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| TRANYEAR | numeric(5,0) |
| TRANMONTH | numeric(5,0) |
| REGION | character varying(60) |
| COUNTRY | character varying(60) |
| CLUSTER | character varying(60) |
| CITY | character varying(60) |
| WHSETYPE | character varying(60) |
| WHSESIZE | character varying(60) |
| OPERATION | character varying(60) |
| TOTALVOLUME | numeric(24,3) |
| AREASQFT | numeric(24,3) |
| OPERATIONMANPOWER | numeric(24,3) |
| INVENTORY | numeric(24,3) |
| STORAGEDENSITY | numeric(24,3) |
| TOTLOGISTICCOST | numeric(24,3) |
| HANDLINGCOST | numeric(24,3) |
| DOH | numeric(24,3) |
| PRODUCTIVITY | numeric(24,3) |
| CASEPICKPERC | numeric(24,3) |
| PCSPICKPERC | numeric(24,3) |
| PALLETPICKPERC | numeric(24,3) |
| COSTPERCASE | numeric(24,3) |
| STORAGETYPE | character varying(500) |
| PICKINGPROFILE | character varying(60) |
| AUTOMATION | character varying(60) |
| WAGERATE | character varying(60) |
| IRAPERC | numeric(21,3) |
| DOCKTOSTOCK | numeric(21,0) |
| STOCKTODOCK | numeric(21,0) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| UNLOADING | numeric(24,3) |
| PUTAWAY | numeric(24,3) |
| PICKING | numeric(24,3) |
| PACKING | numeric(24,3) |
| LOADING | numeric(24,3) |
| ORDLEVELQTY | numeric(24,3) |
| ORDLEVELVALUE | numeric(24,3) |
| ORDLEVELLINES | numeric(24,3) |
| PERFECTORDERINDEX | numeric(24,3) |
| LINEFILLRATE | numeric(24,3) |
| QTYFILLRATE | numeric(24,3) |
| VALUEFILLRATE | numeric(24,3) |
| LASTTIMEACCIDENT | numeric(5,0) |
| ACCIDENT | numeric(5,0) |
| NEARMISSES | numeric(5,0) |
| DTRF | timestamp(6) without time zone |
| COSTPERUNIT | numeric(24,3) |
| COSTPERPALLET | numeric(24,3) |
| COSTPERORDER | numeric(24,3) |
 
## RPT_WKTRHISTUSER01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 29
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| USERID | numeric(21,0) NOT NULL |
| THYEAR | integer NOT NULL |
| THMONTH | integer NOT NULL |
| THWEEK | integer NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYDESC | character varying(100) |
| THHOUR | numeric(24,3) |
| THQTY | numeric(24,3) |
| THPACK | numeric(24,3) |
| THPALLET | numeric(24,3) |
| THGROSSWGT | numeric(24,3) |
| BMQTYPERHOUR | numeric(24,3) |
| BMCASEPERHOUR | numeric(24,3) |
| BMPALLETPERHOUR | numeric(24,3) |
| BMGROSSWGTPERHOUR | numeric(24,3) |
| FROMDATE | date |
| TODATE | date |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| USERNAME | character varying(500) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## RPT_WKTRHISTWHSE01
- Purpose: Transaction history reporting table (user/warehouse wise historical actions).
- Columns: 26
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| COMPANY | numeric(5,0) NOT NULL |
| WHSE | numeric(5,0) NOT NULL |
| INOWNER | numeric(5,0) NOT NULL |
| THYEAR | integer NOT NULL |
| THMONTH | integer NOT NULL |
| THWEEK | integer NOT NULL |
| ACTIVITY | character varying(60) NOT NULL |
| ACTIVITYGROUP | character varying(60) NOT NULL |
| UOM | character varying(60) |
| BMVALUE | numeric(24,3) |
| ACTIVITYVALUE | numeric(24,3) |
| ACTIVITYDESC | character varying(100) |
| ACTIVITYGROUPDESC | character varying(100) |
| UOMDESC | character varying(100) |
| FROMDATE | date |
| TODATE | date |
| COMPNAME | character varying(100) |
| WHSENAME | character varying(100) |
| WHSECODE | character varying(100) |
| INONAME | character varying(100) |
| STATUS | numeric(5,0) NOT NULL |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp(6) without time zone |
| DTLM | timestamp(6) without time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
 
## SHIFTDETL01
- Purpose: Shift definition/details table.
- Columns: 15
- Key-like columns: id, STATUS
 
| Column | Definition |
|---|---|
| id | integer NOT NULL |
| COMPANY | bigint NOT NULL |
| INOWNER | bigint |
| INONAME | character varying(100) |
| WHSE | numeric(5,0) NOT NULL |
| WHSENAME | character varying(100) |
| SHIFTNAME | character varying(60) NOT NULL |
| SHIFTSTARTTIME | time without time zone NOT NULL |
| SHIFTENDTIME | time without time zone NOT NULL |
| BREAKSTARTTIME | time without time zone NOT NULL |
| BREAKENDTIME | time without time zone NOT NULL |
| STATUS | numeric(5,0) DEFAULT 10100 |
| SHIFTID | character varying(60) |
| SERVERDATEFLAG | character(1) |
| WORKINGDAYS | character varying[] |
 
## SKUMST00
- Purpose: SKU/product master table (item attributes and classification).
- Columns: 185
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| SKUCODE | character varying(60) NOT NULL |
| SKUUSAGE | character varying(60) |
| BARCODE | character varying(60) |
| SKUDESC | character varying(200) |
| SKUUSAGEDESC | character varying(200) |
| SKUGROUP | character varying(60) |
| SKUTYPE | character varying(60) |
| SKUCATA | character varying(60) |
| SKUSCATA | character varying(60) |
| SKUCOLOR | character varying(60) |
| SKUNUM | character varying(60) |
| SKUSZSCALE | character varying(60) |
| UNITWGT | numeric(24,3) |
| UOM | character varying(60) |
| CONVFAC | numeric(24,3) |
| LENGTH | numeric(24,3) |
| BREADTH | numeric(24,3) |
| HEIGHT | numeric(24,3) |
| CRTDIM | character varying(60) |
| BATCHCTL | character varying(60) DEFAULT 'N'::character varying |
| SELFLIFETYPE | character varying(60) |
| SELFLIFEDURATION | numeric(24,3) |
| SELFLIFEMINREM | numeric(24,3) |
| ROUNDTOPACK | character varying(24) DEFAULT 'N'::character varying |
| ROUNDTOLU | character varying(24) DEFAULT 'N'::character varying |
| MIXBATCH | character varying(24) DEFAULT 'Y'::character varying |
| MIXSKU | character varying(24) DEFAULT 'Y'::character varying |
| SRCTRL | character varying(60) |
| LOADUNITREQ | character varying(60) |
| EXCEEDBESTFIT | character varying(24) DEFAULT 'N'::character varying |
| INTBATCHFLAG | character varying(24) DEFAULT 'N'::character varying |
| TOPUP | character varying(24) DEFAULT 'N'::character varying |
| PUTZONE | character varying(60) |
| PREPKREQ | character varying(24) DEFAULT 'N'::character varying |
| PREPKZONE | character varying(60) |
| INSPREQ | character varying(24) DEFAULT 'N'::character varying |
| REINSPPERIOD | numeric(24,3) |
| INSPZONE | character varying(60) |
| DMGZONE | character varying(60) |
| RETNZONE | character varying(60) |
| ABCCLASS | character varying(60) |
| MIXATR | character varying(60) DEFAULT 'Y'::character varying |
| ALLOCMETHOD | character varying(60) |
| SHELVBESTFITID | character varying(60) |
| SKUBILLGROUP | character varying(60) |
| DEFAULTPACKID | character varying(60) |
| DEFAULTLDUNIT | character varying(60) |
| SKUIMAGEID | text |
| BUYPRICE | numeric(24,3) |
| CURSALEPRICE | numeric(24,3) |
| MRP | character varying |
| MINWHQTY | numeric(24,3) |
| MAXWHQTY | numeric(24,3) |
| MINPICKFACEQTY | numeric(24,3) |
| MAXPICKFACEQTY | numeric(24,3) |
| HOLDFLAG | character varying(60) |
| HOLDNUM | numeric(21,0) |
| PIFLAG | character varying(24) |
| WGTCHKRCPT | character varying(24) DEFAULT 'N'::character varying |
| WGTTOLRCPT | numeric(24,3) |
| WGTCHKSHIP | character varying(24) DEFAULT 'N'::character varying |
| WGTTOLSHIP | numeric(24,3) |
| STATUS | numeric(5,0) DEFAULT 10100 |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp with time zone |
| DTLM | timestamp with time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| id | integer NOT NULL |
| COMPANY | numeric |
| INOWNER | bigint |
| PLANCODE | character varying(60) |
| HSNCODE | character varying(60) |
| SKUBRAND | character varying(60) |
| SKUSEASON | character varying(60) |
| VOLUME | numeric(24,3) |
| SEASONSEQ | numeric(10,0) |
| BUSINESSLINE | character varying(60) |
| SKUSIZE | character varying(60) |
| SKUATR01 | character varying(100) |
| SKUATR02 | character varying(100) |
| SKUATR03 | character varying(100) |
| SKUATR04 | character varying(100) |
| SKUATR05 | character varying(100) |
| SKUATR06 | character varying(100) |
| SKUATR07 | character varying(100) |
| SKUATR08 | character varying(100) |
| SKUATR09 | character varying(100) |
| SKUATR10 | character varying(100) |
| SKUATR11 | character varying(100) |
| SKUATR12 | character varying(100) |
| SKUATR13 | character varying(100) |
| SKUATR14 | character varying(100) |
| SKUATR15 | character varying(100) |
| ERPSKUATR01 | character varying(100) |
| ERPSKUATR02 | character varying(100) |
| ERPSKUATR03 | character varying(100) |
| ERPSKUATR04 | character varying(100) |
| ERPSKUATR05 | character varying(100) |
| ERPSKUATR06 | character varying(100) |
| ERPSKUATR07 | character varying(100) |
| ERPSKUATR08 | character varying(100) |
| ERPSKUATR09 | character varying(100) |
| ERPSKUATR10 | character varying(100) |
| ERPSKUATR11 | character varying(100) |
| ERPSKUATR12 | character varying(100) |
| ERPSKUATR13 | character varying(100) |
| ERPSKUATR14 | character varying(100) |
| ERPSKUATR15 | character varying(100) |
| ERPSKUATR16 | character varying(100) |
| ERPSKUATR17 | character varying(100) |
| ERPSKUATR18 | character varying(100) |
| ERPSKUATR19 | character varying(100) |
| ERPSKUATR20 | character varying(100) |
| SKULAUNCHDATE | date |
| SKULAUNCHTYPE | character varying(60) |
| GROSSWGT | numeric(24,3) |
| SALEUOM | character varying(60) |
| SALECONVFAC | numeric(24,3) |
| MAINTMFGDATE | character varying(24) DEFAULT 'N'::character varying |
| MAINTEXPDATE | character varying(24) DEFAULT 'N'::character varying |
| MAINTWRNTDATE | character varying(24) DEFAULT 'N'::character varying |
| MAINTMRP | character varying(24) |
| MIXMRP | character varying(24) DEFAULT 'Y'::character varying |
| MIXEXPIRY | character varying(24) DEFAULT 'Y'::character varying |
| KITPART | character varying(24) |
| MIXATR2 | character varying(60) DEFAULT 'Y'::character varying |
| TOPUPATR | character varying(60) |
| ORDENTPACKID | character varying(24) DEFAULT 'N'::character varying |
| ORDENTBATCH | character varying(24) DEFAULT 'N'::character varying |
| ORDENTMRP | character varying(24) DEFAULT 'N'::character varying |
| ORDENTVENDOR | character varying(24) DEFAULT 'N'::character varying |
| ORDENTRCPTDATE | character varying(24) DEFAULT 'N'::character varying |
| PICKMETHOD | character varying(60) |
| STOCKGROUP | character varying(60) |
| WORKFLOWID | character varying(60) |
| SKUHOLD | character varying(24) |
| STIBATCHCTL | character varying(24) DEFAULT 'N'::character varying |
| STIMAINTMFGDATE | character varying(24) DEFAULT 'N'::character varying |
| STIMAINTEXPDATE | character varying(24) DEFAULT 'N'::character varying |
| STIMAINTWRNTDATE | character varying(24) DEFAULT 'N'::character varying |
| STIMAINTMRP | character varying(24) |
| STIWGTCHK | character varying(24) DEFAULT 'N'::character varying |
| DISPLAYATR | character varying(100) |
| AUTOREPLENISH | character varying(24) DEFAULT 'N'::character varying |
| INTSRCTRL | character varying(60) |
| SELFLIFESAFEPERC | numeric(24,3) |
| EQVLWGT | numeric(24,3) |
| IBSELFLIFESAFEPERC | numeric(24,3) |
| SKUSTDQTY | numeric(24,3) |
| SKUBESTFIT | numeric(24,3) |
| ASMTYPE | character varying(60) |
| LOADBYSEQ | numeric(21,0) |
| MRPTOLRCPT | numeric(24,3) |
| PFMAXORDQTY | numeric(24,3) |
| SECPKREQ | character varying(24) DEFAULT 'N'::character varying |
| MNLENTRYRECEIVING | character varying(24) |
| MNLENTRYPUTAWAY | character varying(24) |
| MNLENTRYPICKING | character varying(500) |
| MNLENTRYLOADING | character varying(24) |
| MNLENTRYMERGEINVENTORY | character varying(24) |
| CUSTOMVALIDATION | character varying(500) |
| MIXPACK | character varying(24) DEFAULT 'Y'::character varying |
| MNLENTRYSTASNRECEIVING | character varying(24) |
| MNLENTRYSRTRECEIVING | character varying(24) |
| WGTUOM | character varying(60) |
| VOLUMEUOM | character varying(60) |
| QCHOLDREQ | character varying(24) DEFAULT 'N'::character varying |
| MNLENTRYCYCLECOUNT | character varying(24) |
| ERPACTIVEFLAG | character varying(24) |
| STIMAINTPACKID | character varying(24) |
| PAGROUP | character varying(60) |
| PLANNEDNOOFSKU | numeric(24,3) |
| PLANNEDLOC | numeric(24,3) |
| SKUCHILD_COUNT | integer DEFAULT 0 |
| DIVISION | character varying |
| DEPARTMENT | character varying |
| KIT_MANAGEMENT | character varying |
| MIXSKUINLOC | character varying(24) DEFAULT 'Y'::character varying |
| WHSE | bigint |
| RULEAPLDFLG | integer DEFAULT 0 |
| VENDOR | character varying |
| PFLOCID | character varying(60) |
| PACKTYPE | character varying |
| ALLOCFLOW | character varying(60) |
 
## USRMST00
- Purpose: User master table.
- Columns: 63
- Key-like columns: STATUS
 
| Column | Definition |
|---|---|
| USERID | numeric(21,0) |
| COMPANY | numeric(5,0) NOT NULL |
| LOGINID | character varying(60) NOT NULL |
| USERFNAME | character varying(100) |
| USERLNAME | character varying(100) |
| CATEGORY | character varying(60) |
| USERADDR1 | character varying(100) |
| USERADDR2 | character varying(100) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| PINCD | character varying(60) |
| COUNTRY | character varying(60) |
| TEL | character varying(60) |
| BLOODGROUP | character varying(60) |
| EMAIL | character varying(60) |
| ECPHONENUM | character varying(60) |
| EMPNUM | character varying(60) |
| DESIGNATION | character varying(60) |
| MANAGERID | numeric(21,0) |
| PASSWORD | character varying(2000) |
| PWDDTLM | date |
| WRGATTEMPT | integer |
| LANGID | character varying(60) |
| FONTSETTING | character varying(60) |
| LASTLOGINDATE | date |
| LASTLOGOUTDATE | date |
| STATUS | numeric(5,0) DEFAULT 10100 |
| CRUSERID | numeric(21,0) |
| DTCR | date |
| DTLM | date |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| MULTIFACTOR | integer DEFAULT 0 |
| PWDLOCKED | integer DEFAULT 0 |
| MENUPROFILE | jsonb |
| FACILITYPROFILE | jsonb |
| PROFILE | json |
| USERATR01 | character varying(100) |
| USERATR02 | character varying(100) |
| USERATR03 | character varying(100) |
| USERATR04 | character varying(100) |
| USERATR05 | character varying(100) |
| USERATR06 | character varying(100) |
| USERATR07 | character varying(100) |
| USERATR08 | character varying(100) |
| USERATR09 | character varying(100) |
| USERATR10 | character varying(100) |
| USERATR11 | character varying(100) |
| USERATR12 | character varying(100) |
| USERATR13 | character varying(100) |
| USERATR14 | character varying(100) |
| USERATR15 | character varying(100) |
| INOGROUP | character varying(60) |
| INOWNER | numeric(20,0) |
| IMAGEID | numeric(20,0) |
| ACTIVESESSIONID | character varying(500) |
| USERCATVALUE | character varying(500) |
| MFAFLAG | character(1) |
| WHSE | numeric(5,0) |
| USERTYPE | character varying(60) |
| MHEOPERATOR | character(1) |
| PASSREFLAG | character(1) |
| TOKENVERSION | character varying(60) |
 
## VNDMST00
- Purpose: Vendor master table.
- Columns: 75
- Key-like columns: id, STATUS
 
| Column | Definition |
|---|---|
| id | integer NOT NULL |
| COMPANY | integer NOT NULL |
| INOWNER | integer NOT NULL |
| VENDOR | character varying(60) NOT NULL |
| VNDNAME | character varying(100) |
| VNDCLASS | character varying(60) |
| VNDRATING | integer |
| ADDR1 | character varying(255) |
| ADDR2 | character varying(100) |
| ADDR3 | character varying(100) |
| ADDR4 | character varying(100) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| PINCD | character varying(60) |
| COUNTRY | character varying(60) |
| STATUS | numeric(5,0) DEFAULT 10100 |
| CAPTUREEINVC | character(1) |
| TEL | character varying(60) |
| FAX | character varying(60) |
| TIN | character varying(60) |
| PAN | character varying(60) |
| CONTACT | character varying(100) |
| EMAIL | character varying(60) |
| WEBSITE | character varying(60) |
| HOLDFLAG | character varying(1) |
| HOLDNUM | integer |
| CRUSERID | numeric(21,0) |
| DTCR | timestamp with time zone |
| DTLM | timestamp with time zone |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| VNDATR01 | character varying(100) |
| VNDATR02 | character varying(100) |
| VNDATR03 | character varying(100) |
| VNDATR04 | character varying(100) |
| VNDATR05 | character varying(100) |
| VNDATR06 | character varying(100) |
| VNDATR07 | character varying(100) |
| VNDATR08 | character varying(100) |
| VNDATR09 | character varying(100) |
| VNDATR10 | character varying(100) |
| VNDATR11 | character varying(100) |
| VNDATR12 | character varying(100) |
| VNDATR13 | character varying(100) |
| VNDATR14 | character varying(100) |
| VNDATR15 | character varying(100) |
| ERPVNDATR01 | character varying(100) |
| ERPVNDATR02 | character varying(100) |
| ERPVNDATR03 | character varying(100) |
| ERPVNDATR04 | character varying(100) |
| ERPVNDATR05 | character varying(100) |
| ERPVNDATR06 | character varying(100) |
| ERPVNDATR07 | character varying(100) |
| ERPVNDATR08 | character varying(100) |
| ERPVNDATR09 | character varying(100) |
| ERPVNDATR10 | character varying(100) |
| ERPVNDATR11 | character varying(100) |
| ERPVNDATR12 | character varying(100) |
| ERPVNDATR13 | character varying(100) |
| ERPVNDATR14 | character varying(100) |
| ERPVNDATR15 | character varying(100) |
| VNDSUBCLASS | character varying(60) |
| VNDGROUP | character varying(60) |
| VNDGROUPNAME | character varying(100) |
| PROOFID | character varying(60) |
| PROOFTYPE | character varying(60) |
| SGST | numeric |
| CGST | numeric |
| ERPVNDATR16 | character varying(100) |
| ERPVNDATR17 | character varying(100) |
| ERPVNDATR18 | character varying(100) |
| ERPVNDATR19 | character varying(100) |
| ERPVNDATR20 | character varying(100) |
| VNDCHANNEL | character varying(60) |
| WHSE | numeric(5,0) |
 
## WHSEMST00
- Purpose: Warehouse master table.
- Columns: 37
- Key-like columns: STATUS, id
 
| Column | Definition |
|---|---|
| WHSENAME | character varying(100) |
| WHSEADDR1 | character varying(100) |
| WHSEADDR2 | character varying(100) |
| WHSEADDR3 | character varying(100) |
| TIN | character varying(60) |
| PAN | character varying(60) |
| TEL | character varying(60) |
| FAX | character varying(60) |
| STATUS | numeric(5,0) DEFAULT 1 |
| DTCR | date |
| DTLM | date |
| LMUSERID | numeric(21,0) |
| UPDCNT | numeric(5,0) |
| WHSE | integer NOT NULL |
| COMPANY | integer |
| id | integer NOT NULL |
| MODULEINSTALLED | character varying(500) |
| CRUSERID | numeric(21,0) |
| WHSECODE | character varying(60) |
| CITY | character varying(60) |
| STATE | character varying(60) |
| PINCD | character varying(60) |
| COUNTRY | character varying(60) |
| MAINAPPPATH | character varying(100) |
| RFAPPPATH | character varying(100) |
| MAINDB | character varying(60) |
| INTERFACEDB | character varying(60) |
| REGION | character varying(60) |
| CLUSTER | character varying(60) |
| WHSETYPE | character varying(60) |
| WHSESIZE | character varying(60) |
| PICKINGPROFILE | character varying(60) |
| AUTOMATION | character varying(60) |
| OPERATION | character varying(60) |
| AREASQFT | numeric(24,3) |
| STORAGETYPE | character varying(500) |
| WAGERATE | character varying(60) |
 
 