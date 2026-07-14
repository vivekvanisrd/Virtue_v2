import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { CounterService } from "../src/lib/services/counter-service";

const prisma = new PrismaClient();

const rawPaymentData = `SlNo	Date	Receipt No	Admi No	Student Name	Cash	Online	Total	Payment For	Fee Head	Collected By	Transaction Ref	Entry Status	Pending Amount
1	01/06/2026	305	VR0039-26	S.MANOJ REDDY	8000	0	8000	Day Care	Tuition	Manjula		Active	30500
2	4/6/2026	306	VR0040-26	S.RAMSUBASH REDDY	0	2500	2500	Full Year	Tuition	Manjula	65216983104	Active	25500
3	12/6/2026	322	TEMP002	V.SAI KUMAR	1000	0	1000	Admission	Admission	Manjula		Active	25500
4	8/6/2026	308	VR0041-26	CH.MEGHANA REDDY	23000	0	23000	Full Year	Tuition	Akshitha		Active	0
5	8/6/2026	401	VR0041-26	CH.MEGHANA REDDY	12000	0	12000	Full Year	Transport	Akshitha		Active	0
6	8/6/2026	309	VR0018-26	K.ASHWANTH GOUD	0	38000	38000	Full Year	Tuition	Akshitha	615955427315	Active	0
7	8/6/2026	310	TEMP001	K.HARI CHANDANA	0	30000	30000	Full Year	Tuition	Manjula	615955427315	Active	0
8	8/6/2026	311	VR0043-26	M.HARSHA	5000	0	5000	Term 1	Tuition	Manjula		Active	20500
9	13/6/2026	324	TEMP004	P.VEDASHRI	0	1000	1000	Admission	Admission	Manjula	616449729785	Active	33000
10	8/6/2026	313	VR01273	AARON PRALOK	27000	0	27000	Full Year	Tuition	Akshitha		Active	6000
11	16/6/2026	325	TEMP005	R.VEDANSHI	0	1000	1000	Admission	Admission	Akshitha	543474476488	Active	37500
12	16/6/2026	326	TEMP006	R.SHIVA	0	1000	1000	Admission	Admission	Akshitha	543474476488	Active	36500
13	17/6/2026	339	TEMP011	CH.MOKSHAGNADHITH	0	2500	2500	Admission	Admission	Akshitha	209149762152	Active	33000
14	10/6/2026	317	VR0983	G.VIGNYA TEJ	0	20000	20000	Term 1	Tuition	Akshitha	616192435893	Active	21000
15	10/6/2026	318	VR0983	G.VIGNYA TEJ	0	2500	2500	Other	Transport	Akshitha	616192532492	Active	21000
16	10/6/2026	319	VR01320	P.AGHASTHYA	0	33000	33000	Full Year	Tuition	Manjula	533420570248	Active	10000
17	17/6/2026	340	TEMP012	CH.CHINMAIKRUTHI	0	2500	2500	Admission	Admission	Akshitha	209149762152	Active	27500
18	10/6/2026	314	VR0036-26	B.DEVA	0	1000	1000	Admission	Admission	Manjula	507521097748	Active	37500
19	10/6/2026	316	VR0037-26	B.SIRI	1000	0	1000	Admission	Admission	Manjula		Active	25500
20	6/6/2026	307	VR0042-26	M.PREETHAM KUMAR	1500	0	1500	Admission	Admission	Manjula		Active	33000
21	8/6/2026	312	VR0044-26	G.HARSHAVARDHAN	0	13000	13000	Term 1	Tuition	Manjula	412915060945	Active	24500
22	11/6/2026	320	VR0046-26	K.CHAVITHA RATHOD	0	2500	2500	Admission	Admission	Manjula	723637427843	Active	38500
23	11/6/2026	321	VR0048-26	D.ADARSH REDDY	0	1000	1000	Admission	Admission	Akshitha	913289402669	Active	35500
24	16/6/2026	327	VR01290	M.SRIJAN	23500	0	23500	Full Year	Tuition	Akshitha		Active	0
25	16/6/2026	328	VS0548-26	G.MANISH	0	32000	32000	Full Year	Tuition	Akshitha	616774061878	Active	0
26	16/6/2026	329	VR01222	A.SAANVI	0	31000	31000	Full Year	Tuition	Akshitha	259979521177	Active	0
27	16/6/2026	330	VR01092	A.VEDHVIHAAN	0	23000	23000	Full Year	Tuition	Akshitha	259979521177	Active	0
28	16/6/2026	331	VR01073	J.NAINIKA	0	22000	22000	Full Year	Tuition	Akshitha	473593870639	Active	0
29	17/6/2026	332	VM0581	M.HAYYAGREVA	0	31000	31000	Term 1	Tuition	Akshitha	96868868586	Active	0
30	17/6/2026	333	VR0580	M.MANIVARDHAN	0	27000	27000	Full Year	Tuition	Akshitha	968638685386	Active	8500
31	17/6/2026	334	VR01257	R.ASHWIN	5000		5000	Other	Tuition	Akshitha		Active	28000
32	17/6/2026	335	TEMP007	R.ANVITHA	3000	0	3000	Other	Tuition	Akshitha		Active	22500
33	17/6/2026	336	TEMP008	M.HARSHA	17000	0	17000	Other	Tuition	Akshitha		Active	8500
34	17/6/2026	337	TEMP009	M.JESHWANTH SAI	0	1000	1000	Other	Tuition	Akshitha	209149762152	Active	24500
35	17/6/2026	338	TEMPO10	M.JESHWIK SAI	0	1000	1000	Other	Tuition	Akshitha	124874117984	Active	34500
36	10/6/2026	315	VR0050-26	B.DEEKSHITH	1000	0	1000	Admission	Admission	Manjula		Active	16500
37	12/6/2026	323	VR0050-26	B.DEEKSHITH	9000	0	9000	Term 1	Tuition	Manjula		Active	16500
38	18/6/2026	341	VR01316	S.SRIHITHA	0	18000	18000	Term 1	Tuition	Manjula	783061854570	Active	20500
39	18/6/2026	342	VR01326	P.AADHYA CHAMUNDESHWARI		24000	24000	Full Year	Tuition	Akshitha	61690382275	Active	0
40	18/6/2026	343	VR0024-25	S.BHAVANI	38000	0	38000	Full Year	Tuition	Manjula		Active	0
41	18/6/2026	344	VR01288	S.AKHIL REDDY	32000	0	32000	Full Year	Tuition	Manjula		Active	0
42	18/6/2026	345	VR0739	R.KRANTHI	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	30500
43	18/6/2026	346	VR01296	R.MAYANSHI	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	22500
44	18/6/2026	347	VR01309	G.RITHWIK REDDY	29000	0	29000	Full Year	Tuition	Akshitha		Active	0
45	18/6/2026	348	VR01136	G.SAANVIKA	21000	0	21000	Full Year	Tuition	Akshitha		Active	0
46	18/6/2026	349	VR01091	M.BHAVAGNYA	0	24000	24000	Full Year	Tuition	Akshitha	124923875333	Active	1000
47	18/6/2026	350	VR01081	C.VEDANSHI	0	33000	33000	Full Year	Tuition	Akshitha	50112174015	Active	0
48	18/6/2026	351	VR01082	C.ADVIK REDDY	0	30000	30000	Full Year	Tuition	Akshitha	50112174015	Active	0
49	18/6/2026	352	VR01216	B.VIGNYAN	0	10000	10000	Term 1	Tuition	Akshitha	934331809433	Active	23000
50	18/6/2026	353	TEMP013	B.SHREYANSH	0	10000	10000	Term 1	Tuition	Akshitha	422519470110	Active	15500
51	08/06/2026	402	VR0018-26	K.ASHWANTH GOUD	0	12000	12000		Transport	Akshitha	615955427315	Active	0
52	18/6/2026	354	VR01295	R.MANASWI	23000	0	23000	Full Year	Tuition	Akshitha		Active	0
53	18/6/2026	356	VR01052	R.RISHAANK YADAV	10000	0	10000	Term 1	Tuition	Akshitha		Active	23000
54	19/6/2026	357	TEMP014	B.KRUTHIKA	8000	0	8000	Term 1	Tuition	Akshitha		Active	17500
55	19/6/2026	358	TEMP015	MOHD ABDUL MATEEN	1000	0	1000	Admission	Tuition	Akshitha		Active	25500
56	20/6/2026	359	VR0748	N.SAKETH	30000	0	30000	Full Year	Tuition	Akshitha		Active	5500
57	20/6/2026	360	VR01087	N.MANUSHREE	10000	0	10000	Term 1	Tuition	Akshitha		Active	4500
58	20/6/2026	361	VR01136	G.SAANVIKA	2500	0	2500	Monthly Installment	Tuition	Akshitha		Active	0
59	20/6/2026	362	VR01087	N.MANUSHREE	0	13000	13000	Full Year	Tuition	Akshitha	T3mnlvbaltvvxj	Active	4500
60	20/6/2026	363	VK465	P.SHANVITHA GANGA	0	36000	36000	Full Year	Tuition	Akshitha	294020603328	Active	2500
61	20/6/2026	364	VR0470	P.THANVISHA	0	30000	30000	Full Year	Tuition	Akshitha	294020603328	Active	5500
62	20/6/2026	365	VR0862	G.KARUNYA	30000	0	30000	Full Year	Tuition	Manjula		Active	3000
63	21/6/2026	366	TEMP016	S.VENKATA ESHWAR	8300	0	8300	Term 1	Tuition	Shama		Active	17200
64	22/6/2026	367	TEMP017	M.VIRAT CHANDU	1000	0	1000	Admission	Tuition	Akshitha		Active	38500
65	22/6/2026	368	TEMP018	P.SHREYANSH REDDY		21000	21000	Full Year	Tuition	Akshitha	126875846351	Active	4500
66	22/6/2026	369	VR0941	CH.ARADHYA	0	16000	16000	Term 1	Tuition	Akshitha	17125600175	Active	17000
67	24/6/2026	370	VR0985	R.VARNIKA	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	28000
68	24/6/2026	371	TEMP019	R.AADHYA	3000	0	3000	Monthly Installment	Tuition	Akshitha		Active	22500
69	22/6/2026	406	TEMP018	P.SHREYANSH REDDY	0	16000	16000	Full Year	Transport	Akshitha		Active	4500
70	18/6/2026	405	VR01091	M.BHAVAGNYA	5000	0	5000	Term 1	Transport	Akshitha		Active	1000
71	25/6/2026	372	VR01200	B.VARUN REDDY	8000	0	8000	Term 1	Tuition	Akshitha		Active	19500
72	25/6/2026	373	VR01199	B.VARSHITHA	7300	0	7300	Term 1	Tuition	Akshitha		Active	20200
73	25/6/2026	374	VS0303	B.SRIKRITHI	0	32000	32000	Full Year	Tuition	Akshitha	T5101uyMy76UT	Active	0
74	25/6/2026	407	VS0303	B.SRIKRITHI	0	12000	12000	Full Year	Transport	Akshitha	T5101uyMy76UT	Active	0
75	25/6/2026	375	VS0534	A.VARNIKA	0	32000	32000	Full Year	Tuition	Akshitha	451958639147	Active	0
76	25/6/2026	408	VS0534	A.VARNIKA	10000	0	10000	Full Year	Transport	Akshitha		Active	0
77	27/6/2026	376	VR1102	S.HARINI	0	10000	10000	Term 1	Tuition	Akshitha	170448001958	Active	28500
78	29/6/2026	377	VR01232	G.PREKSHITHA	0	15000	15000	Term 1	Tuition	Akshitha	925129310972	Active	18000
79	30/6/2026	378	TEMP020	M.VISHWADIKA	0	23000	23000	Full Year	Tuition	Akshitha	927808297270	Active	0
80	30/06/2026	379	TEMP021	D.AAYANSH REDDY	0	23000	23000	Full Year	Tuition	Akshitha	429145348120	Active	0
81	30/06/2026	409	TEMP021	D.AAYANSH REDDY	0	10000	10000	Full Year	Transport	Akshitha	388292977405	Active	0
82	30/6/2026	380	VR01193	M.TEJASWI	0	11000	11000	Term 1	Tuition	Manjula	22004011182	Active	22000
83	01/07/2026	381	VR0082-26	G.DIVYA SRI	0	10000	10000	Term 1	Tuition	Akshitha	362376531140	Active	15500
84	01/07/2026	410	VM0737	P.SRIKAMAL	10000	0	10000	Term 1	Tuition	Akshitha		Active	35500
85	02/07/2026	382	VR1071	T.VANSHIKA	0	28000	28000	Full Year	Tuition	Akshitha	165720358550	Active	5000
86	02/07/2026	383	VR014-25	S.VENNELA	0	5000	5000	Monthly Installment	Tuition	Akshitha	227077805718	Active	37000
87	02/07/2026	384	VR01347	S.NAVYA SREE	0	5000	5000	Monthly Installment	Tuition	Akshitha	227077805718	Active	30500
88	02/07/2026	385	VR01343	S.VYSHNAVDEEP	0	5000	5000	Monthly Installment	Tuition	Akshitha	227077805718	Active	28000
89	02/07/2026	386	VR01106	B.RAKSHITHA	0	5000	5000	Monthly Installment	Tuition	Akshitha	227077805718	Active	33500
90	02/07/2026	388	VR0940	P.DEVANSH		16000	16000	Term 1	Tuition	Akshitha	361019792198	Active	17000
91	02/07/2026	389	TEMP022	J.HIMANSH		2000	2000	Admission	Admission	Manjula	172735667193	Active	25500
92	03/07/2026	390	VR01079	N.TARAK REDDY	24000	0	24000	Full Year	Tuition	Akshitha		Active	0
93	03/07/2026	391	TEMP023	K.SHREYAN VEDH	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	20500
94	03/07/2026	392	VR01058	G.DHANA SRI	3400	0	3400	Monthly Installment	Tuition	Akshitha		Active	34100
95	03/07/2026	393	VS0478	G.HANISH	3300	0	3300	Monthly Installment	Tuition	Akshitha		Active	34200
96	03/07/2026	411	VS0478	G.HANISH	1000	0	1000	Monthly Installment	Transport	Akshitha		Active	34200
97	03/07/2026	412	VR01058	G.DHANA SRI	1000	0	1000	Monthly Installment	Transport	Akshitha		Active	34100
98	02/07/2026	387	VR01105	B.SAHITHI	0	5000	5000	Monthly Installment	Tuition	Akshitha	227077805718	Active	32500
99	03/07/2026	394	TEMP024	HARI RUDRANSH	0	22500	22500	Full Year	Tuition	Manjula	177153804844	Active	0
100	04/07/2026	395	TEMP025	G.AARADHYA	0	10000	10000	Term 1	Tuition	Akshitha	383698951414	Active	15500
101	04/07/2026	396	VR0031-26	K.SIDDARTH	0	32000	32000	Full Year	Tuition	Akshitha	845754343587	Active	0
102	4/7/2026	397	VR0032-26	K.SRIYAN	0	28000	28000	Full Year	Tuition	Akshitha	845754343587	Active	7500
103	04/07/2026	398	VR01340	P.CHAITRA	0	31000	31000	Full Year	Tuition	Akshitha	821589620060	Active	4500
104	04/07/2026	399	VRCB062	P.VIKAS RAJ	0	24000	24000	Full Year	Tuition	Akshitha	821589620060	Active	3500
105	04/07/2026	400	VS0455	G.SAMANVITHA	0	5000	5000	Monthly Installment	Tuition	Akshitha	128532564639	Active	32500
106	04/07/2026	501	VR0676	CH.ARYAN THANISHQ	0	10000	10000	Term 1	Tuition	Akshitha	29444817317	Active	25500
107	06/07/2026	502	TEMP026	B.AADYA SRI	0	2400	2400	Monthly Installment	Tuition	Akshitha	603439227545	Active	23100
108	06/07/2026	503	VR1014	S.ADVIK	0	33000	33000	Full Year	Tuition	Akshitha	260851301637	Active	0
109	06/07/2026	504	VR012-25	D.SHRADHHAA	15000	0	15000	Term 1	Tuition	Akshitha		Active	27000
110	06/07/2026	505	VS0451	D.AVANI	15000	0	15000	Term 1	Tuition	Akshitha		Active	20500
111	06/07/2026	506	VR010-25	V.OMKAR REDDY	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	37000
112	06/07/2026	507	VS01611	V.BHARGAV REDDY	5000	0	5000	Monthly Installment	Tuition	Akshitha		Active	33500
113	06/07/2026	508	VR01090	P.MANSI	0	14000	14000	Term 1	Tuition	Akshitha	476451614096	Active	19000
114	06/07/2026	509	TEMP027	K.MADHUPUNARVI	0	2000	2000	Admission	Tuition	Akshitha	284175962054	Active	23500
115	06/07/2026	510	TEMP028	D.AADYA SREE	0	20000	20000	Full Year	Tuition	Akshitha	432468512473	Active	5500
116	06/07/2026	511	VS0380	K.SAANVI	0	34000	34000	Full Year	Tuition	Akshitha	630233360048	Active	3500
117	03/07/2026	413	TEMP029	G.HARSHA VARDHAN	0	10000	10000	Full Year	Transport	Akshitha	513198553766	Active	35500
118	04/07/2026	414	VR0897	M.HASYA GOURI	0	12000	12000	Full Year	Transport	Akshitha	618555565441	Active	
119	04/07/2026	415	VS0455	G.SAMANVITHA	0	10000	10000	Full Year	Transport	Akshitha	12532864639	Active	
120	04/07/2026	416	VR0676	CH.ARYAN THANISHQ	0	5000	5000	Term 1	Transport	Akshitha	29444817317	Active	
121	06/07/2026	417	VR1014	S.ADVIK	0	7000	7000	Term 1	Transport	Akshitha	260851301637	Active	
122	06/07/2026	418	VR010-25	V.OMKAR REDDY	10000	0	10000	Full Year	Transport	Akshitha		Active	
123	06/07/2026	419	VS01611	V.BHARGAV REDDY	10000	0	10000	Full Year	Transport	Akshitha		Active	
124	06/07/2026	420	VR012-25	D.SHRADHHAA	10000	0	10000	Full Year	Transport	Akshitha		Active	
125	06/07/2026	421	VS0451	D.AVANI	10000	0	10000	Full Year	Transport	Akshitha		Active	
126	06/07/2026	422	VS409	G.SRIVALLI	0	10000	10000	Full Year	Transport	Akshitha	559496683883	Active	
127	06/07/2026	512	VS409	G.SRIVALLI	0	30000	30000	Full Year	Tuition	Akshitha	908517656456	Active	
128	06/07/2026	513	VR1256	V.SHREYANSHI	0	23000	23000	Full Year	Tuition	Akshitha	16183149426	Active	
129	07/06/2026	514	VR0655	B.NIHAN REDDY	10000	0	10000	Term 1	Tuition	Akshitha		Active	
130	07/07/2026	515	VR0948	H.RAGHU VARDHAN	0	5000	5000	Monthly Installment	Tuition	Akshitha	146150014937	Active	
131	07/07/2026	516	VR1196	CH.ADVAITH REDDY	0	30000	30000	Full Year	Tuition	Akshitha	926249035448	Active	
132	07/07/2026	423	VR1256	V.SHREYANSHI	0	12000	12000	Full Year	Transport	Akshitha	41174116403	Active	
133	07/07/2026	424	VM0265	CH.KOMALI	0	10000	10000	Full Year	Transport	Akshitha	308196872502	Active	
134	07/07/2026	425	VR0525	CH.SOUKYA	0	10000	10000	Full Year	Transport	Akshitha	308196872502	Active	
135	07/07/2026	426	VR1196	CH.ADVAITH REDDY		5000	5000	Full Year	Transport	Akshitha	798976568874	Active	
136	08/07/2026	517	VR01128	SUSHANTH RATHOD		30000	30000	Full Year	Tuition	Akshitha	655592155669	Active	
137	08/07/2026	518	VR01260	LAKSHITH RATHOD		24000	24000	Full Year	Tuition	Akshitha	655501400527	Active	
138	08/07/2026	427	VR01022	N.SHREYANVI		10000	10000	Full Year	Transport	Akshitha	414901778150	Active	
`;

async function main() {
  console.log("🚀 Starting fee payment register ingestion...");

  const schoolId = "VIVES";
  const schoolCode = "VIVES";
  const branchId = "VIVES-RCB";
  const branchCode = "VIVES-RCB";
  const academicYearId = "VIVES-HQ-AY-2026-27";
  const financialYearId = "VIVES-HQ-FY-2026-27";
  const yearLabel = "2627";

  // 1. Reset database tables for payments to allow safe reruns (idempotency)
  console.log("🧹 Resetting existing payments, allocations, ledger payments and journal collections...");
  
  await prismaBypass.collectionAllocation.deleteMany({});
  await prismaBypass.collection.deleteMany({});
  await prismaBypass.ledgerEntry.deleteMany({
    where: { type: "PAYMENT", schoolId }
  });
  await prismaBypass.journalLine.deleteMany({
    where: { journalEntry: { entryType: "RECEIPT", schoolId } }
  });
  await prismaBypass.journalEntry.deleteMany({
    where: { entryType: "RECEIPT", schoolId }
  });

  // Reset TenancyCounter for RECEIPTS
  await prismaBypass.tenancyCounter.deleteMany({
    where: { schoolId, branchId, type: "RECEIPT" }
  });

  // Reset invoice item and invoice totals to fully unpaid base
  console.log("🔄 Resetting invoice and invoice items balances...");
  await prismaBypass.$executeRawUnsafe(`
    UPDATE "FeeInvoiceItem" SET "paidAmount" = 0, "balance" = "amount";
  `);
  await prismaBypass.$executeRawUnsafe(`
    UPDATE "FeeInvoice" SET "paidAmount" = 0, "balance" = "totalAmount", "status" = 'PENDING' WHERE "schoolId" = 'VIVES' AND "branchId" = 'VIVES-RCB';
  `);

  // Reset account balances to default
  console.log("💰 Resetting Chart of Account balances...");
  const totalInvoicedSum = await prismaBypass.feeInvoice.aggregate({
    where: { schoolId, branchId },
    _sum: { totalAmount: true }
  });
  const totalInvoiced = Number(totalInvoicedSum._sum.totalAmount || 0);

  await prismaBypass.chartOfAccount.updateMany({
    where: { schoolId, accountCode: "1110" },
    data: { currentBalance: 0 }
  });
  await prismaBypass.chartOfAccount.updateMany({
    where: { schoolId, accountCode: "1120" },
    data: { currentBalance: 0 }
  });
  await prismaBypass.chartOfAccount.updateMany({
    where: { schoolId, accountCode: "1200" },
    data: { currentBalance: totalInvoiced }
  });

  console.log("✅ Wiped collections, reset invoice balances, and calibrated GL accounts.");

  // 2. Parse TSV payments
  const lines = rawPaymentData.trim().split("\n");
  const headers = lines[0].split("\t");
  const rows = lines.slice(1);

  console.log(`Parsed ${rows.length} payment rows from TSV.`);

  let collectionCount = 0;
  let skippedRowsCount = 0;

  function parseDate(dateStr: string): Date {
    const parts = dateStr.trim().split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day));
    }
    return new Date();
  }

  for (let i = 0; i < rows.length; i++) {
    const rowCells = rows[i].split("\t");
    if (rowCells.length < 10) continue;

    const slNo = rowCells[0].trim();
    const dateStr = rowCells[1].trim();
    const receiptNo = rowCells[2].trim();
    const admiNo = rowCells[3].trim();
    const studentName = rowCells[4].trim();
    const cashVal = parseFloat(rowCells[5].trim()) || 0;
    const onlineVal = parseFloat(rowCells[6].trim()) || 0;
    const totalVal = parseFloat(rowCells[7].trim()) || 0;
    const paymentFor = rowCells[8].trim();
    const feeHead = rowCells[9].trim();
    const collectedBy = rowCells[10].trim() || "Staff";
    const transactionRef = rowCells[11].trim();

    if (!admiNo) {
      skippedRowsCount++;
      continue;
    }

    // Resolve student
    const student = await prismaBypass.student.findFirst({
      where: { bookId: admiNo, schoolId }
    });

    if (!student) {
      console.warn(`⚠️ Student not found for Admi No: ${admiNo} (${studentName}) on row ${i + 2}. Skipping row.`);
      skippedRowsCount++;
      continue;
    }

    const activeAdmission = await prismaBypass.studentAcademicYear.findFirst({
      where: { studentId: student.id, schoolId }
    });

    if (!activeAdmission) {
      console.warn(`⚠️ Active admission not found for student ${student.firstName} ${student.lastName} (${admiNo}). Skipping row.`);
      skippedRowsCount++;
      continue;
    }

    const paymentDate = parseDate(dateStr);

    // Resolve accounts for double entry
    const cashAcc = await prismaBypass.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
    const bankAcc = await prismaBypass.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1120" } });
    const arAcc = await prismaBypass.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });

    // Map fee componentType based on Fee Head
    let componentType = "TUTION";
    if (feeHead.toLowerCase().includes("admission")) {
      componentType = "ADMISSION";
    } else if (feeHead.toLowerCase().includes("transport")) {
      componentType = "TRANSPORT";
    }

    // Process payments (handles Cash, Online, or Split payments as Option B)
    const subPayments = [];
    if (cashVal > 0) subPayments.push({ mode: "CASH", amount: cashVal, ref: "" });
    if (onlineVal > 0) subPayments.push({ mode: "ONLINE", amount: onlineVal, ref: transactionRef });

    // If both are 0 but totalVal is set, default to CASH
    if (subPayments.length === 0 && totalVal > 0) {
      subPayments.push({ mode: "CASH", amount: totalVal, ref: "" });
    }

    for (const subPay of subPayments) {
      try {
        await prismaBypass.$transaction(async (tx) => {
          // A. Find unpaid Invoice Items of the correct type for this student
          const unpaidItems = await tx.feeInvoiceItem.findMany({
            where: {
              invoice: { studentId: student.id, schoolId, status: { in: ["PENDING", "PARTIAL"] } },
              componentType,
              balance: { gt: 0 }
            },
            include: { invoice: true },
            orderBy: { invoice: { dueDate: "asc" } } // oldest first
          });

          if (unpaidItems.length === 0) {
            // Fallback: If no item matches this type, pay off any general unpaid items of other types
            console.warn(`ℹ️ No unpaid items of type ${componentType} found for ${student.firstName} (${admiNo}). Falling back to general queue.`);
            const generalUnpaid = await tx.feeInvoiceItem.findMany({
              where: {
                invoice: { studentId: student.id, schoolId, status: { in: ["PENDING", "PARTIAL"] } },
                balance: { gt: 0 }
              },
              include: { invoice: true },
              orderBy: { invoice: { dueDate: "asc" } }
            });
            unpaidItems.push(...generalUnpaid);
          }

          let remainingToAllocate = subPay.amount;
          const allocations: any[] = [];

          for (const item of unpaidItems) {
            if (remainingToAllocate <= 0) break;
            const itemBal = Number(item.balance);
            if (itemBal <= 0) continue;

            const allocAmt = Math.min(itemBal, remainingToAllocate);

            // Update item balance
            await tx.feeInvoiceItem.update({
              where: { id: item.id },
              data: {
                paidAmount: { increment: allocAmt },
                balance: { decrement: allocAmt }
              }
            });

            // Update Invoice balance
            const newPaid = Number(item.invoice.paidAmount) + allocAmt;
            const isFullyPaid = newPaid >= Number(item.invoice.totalAmount);
            await tx.feeInvoice.update({
              where: { id: item.invoiceId },
              data: {
                paidAmount: { increment: allocAmt },
                balance: { decrement: allocAmt },
                status: isFullyPaid ? "PAID" : "PARTIAL"
              }
            });

            allocations.push({
              invoiceId: item.invoiceId,
              invoiceItemId: item.id,
              amount: allocAmt
            });

            remainingToAllocate -= allocAmt;
          }

          // B. Generate Receipt Number via CounterService
          const receiptNumber = await CounterService.generateReceiptNumber({
            schoolId, schoolCode, branchId, branchCode, year: yearLabel
          }, tx);

          // C. Create Collection Record
          const collection = await tx.collection.create({
            data: {
              receiptNumber,
              bookReceiptNo: receiptNo,
              studentId: student.id,
              admissionId: activeAdmission.id,
              financialYearId,
              schoolId,
              branchId,
              amountPaid: subPay.amount,
              totalPaid: subPay.amount,
              paymentMode: subPay.mode,
              paymentReference: subPay.ref || null,
              collectedBy,
              status: "Success",
              paymentDate,
              allocatedTo: {
                paymentFor,
                feeHead,
                allocations
              },
              backboneAllocations: {
                create: allocations.map(a => ({
                  invoiceId: a.invoiceId,
                  invoiceItemId: a.invoiceItemId,
                  amount: a.amount
                }))
              }
            }
          });

          // D. Create LedgerEntry (Student Account Statement entry)
          await tx.ledgerEntry.create({
            data: {
              studentId: student.id,
              schoolId,
              branchId,
              financialYearId,
              academicYearId: activeAdmission.academicYearId,
              type: "PAYMENT",
              amount: subPay.amount,
              reason: `Fee Ingestion [${feeHead}] - Receipt Book: ${receiptNo} (${paymentFor})`,
              createdBy: collectedBy,
              createdAt: paymentDate
            }
          });

          // E. Create Double Entry Journal
          const debitAcc = subPay.mode === "CASH" ? cashAcc : bankAcc;
          if (debitAcc && arAcc) {
            const createdJe = await tx.journalEntry.create({
              data: {
                schoolId,
                branchId,
                financialYearId,
                entryType: "RECEIPT",
                totalDebit: subPay.amount,
                totalCredit: subPay.amount,
                description: `Fee Payment Ingestion: ${student.firstName} ${student.lastName} (${admiNo}) - Receipt Book Ref: ${receiptNo}`,
                entryDate: paymentDate,
                lines: {
                  create: [
                    { accountId: debitAcc.id, debit: subPay.amount, credit: 0 },
                    { accountId: arAcc.id, debit: 0, credit: subPay.amount }
                  ]
                }
              }
            });

            // Link collection to journal entry
            await tx.collection.update({
              where: { id: collection.id },
              data: { journalEntryId: createdJe.id }
            });

            // Update ChartOfAccount balances
            await tx.chartOfAccount.update({
              where: { id: debitAcc.id },
              data: { currentBalance: { increment: subPay.amount } }
            });

            await tx.chartOfAccount.update({
              where: { id: arAcc.id },
              data: { currentBalance: { decrement: subPay.amount } }
            });
          }

          collectionCount++;
        }, { timeout: 30000 });
      } catch (err: any) {
        console.error(`❌ Failed to record collection for row ${i + 2} (Admi: ${admiNo}):`, err.message);
      }
    }
  }

  console.log(`\n🎉 Fee collections ingestion finished!`);
  console.log(`- Total Collections Created: ${collectionCount}`);
  console.log(`- Skipped rows: ${skippedRowsCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
