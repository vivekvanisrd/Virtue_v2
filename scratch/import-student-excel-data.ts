import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { CounterService } from "../src/lib/services/counter-service";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// Embedded TSV (Tab Separated Values) dataset shared by the user
const rawSpreadsheetData = `Admi No	Student Name	Parent Name	Contact	Branch	Class	Stop Name	Admission Fee	Concession	Tuition Fee	Transport Fee	Admission Fee	Total Due	Joining Date	Leaving Date	Status	Pending Dues
TEMP001	K.HARI CHANDANA	K.MAHESH KIRAN GOUD	 81212 76776	RCB	2ND	SELF	0	3000	33000	0	0	30000	19/6/2026		Active	0
TEMP002	V.SAI KUMAR	V.VENKATESH	93943861922	RCB	NUR	SELF	1000	0	25500	0	1000	26500	12/6/2026		Active	0
TEMP004	P.VEDASHRI	P.RAMESH	9705996381	RCB	1ST	SELF	1000	0	33000	0	1000	34000	13/6/2026		Active	0
TEMP005	R.VEDANSHI	R.DEVIDAS	9494825145	RCB	5TH	SELF	1000	0	37500	0	1000	38500	16/6/2026		Active	0
TEMP006	R.SHIVA	R.DEVIDAS	9494825145	RCB	4TH	SELF	1000	0	35500	0	1000	36500	16/6/2026		Active	0
TEMP007	R.ANVITHA	R.RAVINDER	8331989332	RCB	NUR	SELF	0	0	25500	0	0	25500	23/1/2026		Active	0
TEMP008	M.HARSHA	M.RAGHU	9959819698	RCB	NUR	SELF	0	0	25500	0	0	25500	8/6/2026		Active	0
TEMP009	M.JESHWANTH SAI	M.ASHOK	9502757100	RCB	NUR	SELF	0	0	25500	0	0	25500	17/6/2026		Active	0
TEMP011	CH.MOKSHAGNADHITH	CH.NARESH KUMAR	8328011073	RCB	2ND	SELF	2500	0	33000	0	2500	35500	17/6/2026		Active	0
TEMP012	CH.CHINMAIKRUTHI	CH.NARESH KUMAR	8328011073	RCB	UKG	SELF	2500	0	27500	0	2500	30000	17/6/2026		Active	0
TEMP013	B.SHREYANSH	B.VEERESHAM	9705217576	RCB	LKG	SELF	0	0	25500	0	0	25500	18/6/2026		Active	0
TEMPO10	M.JESHWIK SAI	M.ASHOK	9502757100	RCB	3RD	SELF	0	0	35500	0	0	35500	17/6/2026		Active	0
VM0581	M.HAYYAGREVA	M.SRINIVAS	9951020789	RCB	5TH	SELF	0	6500	37500	0	0	31000			Active	0
VR0018-26	K.ASHWANTH GOUD	K.MAHESH KIRAN GOUD	 81212 76776	RCB	8TH	STOP03-12000	0	500	38500	12000	0	50000			Active	0
VR0024-25	S.BHAVANI	S.VISHNUVARDHAN REDDY	9959207501	RCB	9TH	SELF	0	4000	42000	0	0	38000			Active	0
VR0036-26	B.DEVA	B.NARESH	8106402067	RCB	5TH	SELF	1000	0	37500	0	1000	38500	10/6/2026		Active	0
VR0037-26	B.SIRI	B.NARESH	8106402067	RCB	LKG	SELF	1000	0	25500	0	1000	26500	10/6/2026		Active	0
VR0039-26	S.MANOJ REDDY	S.NARENDER REDDY	9963383951	RCB	8TH	SELF	0	0	38500	0	0	38500	1/6/2026		Active	0
VR0040-26	S.RAMSUBASH REDDY	S.JAGAN REDDY	9505059255	RCB	LKG	SELF	2500	0	25500	0	2500	28000	4/6/2026		Active	0
VR0041-26	CH.MEGHANA REDDY	CH.GOVERDHAN REDDY	9959301406	RCB	LKG	STOP03-12000	0	2500	25500	12000	0	35000	5/6/2026		Active	0
VR0042-26	M.PREETHAM KUMAR	M.GOPI	8790286071	RCB	1ST	SELF	1500	0	33000	0	1500	34500	6/6/2026		Active	0
VR0043-26	M.HARSHA	M.RAGHU	995989698	RCB	NUR	SELF	0	0	25500	0	0	25500			Active	0
VR0044-26	G.HARSHAVARDHAN	G.SHIVAPRASAD	9912761014	RCB	4TH	SELF	2000	0	35500	0	2000	37500			Active	0
VR0046-26	K.CHAVITHA RATHOD	SAI RATHOD	9866554296	RCB	7TH	SELF	2500	0	38500	0	2500	41000	11/6/2026		Active	0
VR0048-26	D.ADARSH REDDY	D.RAM MOHAN REDDY	9494631061	RCB	3RD	SELF	1000	0	35500	0	1000	36500	4/6/2026		Active	0
VR0050-26	B.DEEKSHITH	B.NARESH	8008152002	RCB	NUR	SELF	1000	0	25500	0	1000	26500	8/6/2026		Active	0
VR0051-26	M.HARSHA	M.RAGHU	9959819698	RCB	NUR	SELF	0	0	25500	0	0	25500	8/6/2026		Active	0
VR0052-26	CH.SAHASRA	CH.MADHUSUDHAN	9912174413	RCB	2ND	SELF	2000	0	33000	0	2000	35000	1/6/2026		Active	0
VR01073	J.NAINIKA	J.DILEEP REDDY	9059280211	RCB	LKG	SELF	0	3500	25500	0	0	22000			Active	0
VR01081	C.VEDANSHI	C.SRINIVAS REDDY	9866338625	RCB	5TH		0	4500	37500		0	33000			Active	0
VR01082	C.ADVIK REDDY	C.SRINIVAS REDDY	9866338625	RCB	2ND		0	3000	33000		0	30000			Active	0
VR01091	M.BHAVAGNYA	M.NAGA MOHAN	9494987805	RCB	UKG	STOP01-6000	0	3500	27500	6000	0	30000			Active	0
VR01092	A.VEDHVIHAAN	A.SAI KIRAN	8106918707	RCB	UKG	SELF	0	4500	27500	0	0	23000			Active	0
VR01136	G.SAANVIKA	G.MADHUSUDHAN REDDY	9848707192	RCB	UKG		0	6500	27500		0	21000			Active	0
VR01216	B.VIGNYAN	B.VEERESHAM	9705217576	RCB	1ST		0	0	33000		0	33000			Active	0
VR01222	A.SAANVI	A.SAI KIRAN	8106918707	RCB	3RD	SELF	0	4500	35500	0	0	31000			Active	0
VR01257	R.ASHWIN	R.RAVINDER	8331989332	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
VR01273	AARON PRALOK	BHANU PRADEEP	9000617747	RCB	2ND	SELF	0	0	33000	0	0	33000			Active	0
VR01288	S.AKHIL REDDY	S.VISHNUVARDHAN REDDY	9959207501	RCB	5TH		0	5500	37500		0	32000			Active	0
VR01290	M.SRIJAN	M.SRIKANTH	9000578517	RCB	UKG	SELF	0	4000	27500	0	0	23500			Active	0
VR01296	R.MAYANSHI	R.VASANTH	8328230374	RCB	UKG		0	0	27500		0	27500			Active	0
VR01309	G.RITHWIK REDDY	G.MADHUSUDHAN REDDY	9848707192	RCB	3RD		0	6500	35500		0	29000			Active	0
VR01316	S.SRIHITHA	S.VISHNU	8008798925	RCB	7TH		0	0	38500		0	38500			Active	0
VR01320	P.AGHASTHYA	P.RAM REDDY	7093748800	RCB	UKG	STOP02-10000	0	0	27500	10000	0	37500	24/6/2025		Active	0
VR01326	P.AADHYA CHAMUNDESHWARI	P.SANDEEP	9652218099	RCB	LKG		0	1500	25500		0	24000			Active	0
VR0580	M.MANIVARDHAN	M.SRINIVAS	9951020789	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VR0739	R.KRANTHI	R.VASANTH	8328230374	RCB	3RD		0	0	35500		0	35500			Active	0
VR0983	G.VIGNYA TEJ	G.PANDU RANGAN	9642737879	RCB	5TH	STOP01-6000	0	0	37500	6000	0	43500			Active	0
VS0548-26	G.MANISH	G.VIJAY KUMAR	8919763227	RCB	4TH	SELF	0	3500	35500	0	0	32000			Active	0
VR01295	R.MANASWI	R.RAMESH	9441162075	RCB	LKG	SELF	0	2500	25500	0	0	23000			Active	0
VR01052	R.RISHAANK YADAV	R.RAMESH	9441162075	RCB	2ND	SELF	0	0	33000	0	0	33000			Active	0
TEMP014	B.KRUTHIKA	B.MOGULAIAH	9618661018	RCB	NUR	SELF	0	0	25500	0	0	25500			Active	0
TEMP015	MOHD ABDUL MATEEN	MOHD ANWAR	9949545808	RCB	NUR	SELF	1000	0	25500	0	1000	26500	19/6/2026		Active	0
VR0748	N.SAKETH	N.ANAND	7799838283	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VR01087	N.MANUSHREE	N.ANAND	7799838283	RCB	UKG	SELF	0	0	27500	0	0	27500			Active	0
VR01136	G.SAANVIKA	G.MADHUSUDHAN REDDY	9848707192	RCB	UKG	SELF	0	0	27500	0	0	27500			Active	0
VK465	P.SHANVITHA GANGA	P.BALA GANGADHAR REDDY	9912345081	RCB	8TH	SELF	0	0	38500	0	0	38500			Active	0
VR0470	P.THANVISHA	P.BALA GANGADHAR REDDY	9912345081	RCB	4TH	SELF	0	0	35500	0	0	35500			Active	0
VR0862	G.KARUNYA	G.SRIDHAR REDDY	9490139160	RCB	2ND	SELF	0	0	33000	0	0	33000			Active	
TEMP016	S.VENKATA ESHWAR	S.SANJEEV KUMAR		RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
TEMP017	M.VIRAT CHANDU	M.KASHYA	9493331421	RCB	8TH	SELF	1000	0	38500	0	1000	39500	22/6/2026		Active	0
TEMP018	P.SHREYANSH REDDY	P.AMARNATH REDDY	7382553868	RCB	LKG	STOP04--16000	0	0	25500	16000	0	41500			Active	0
VR0941	CH.ARADHYA	CH.VIJAY KUMAR	9949519945	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
VR0985	R.VARNIKA	R.SATHISH KUMAR	9441246001	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
TEMP019	R.AADHYA	R.SATHISH KUMAR	9441246001	RCB	NUR	SELF	0	0	25500	0	0	25500			Active	0
VR01200	B.VARUN REDDY	B.SUKENDAR REDDY	9963944844	RCB	UKG	SELF	0	0	27500	0	0	27500			Active	0
VR01199	B.VARSHITHA	B.SUKENDAR REDDY	9963944844	RCB	UKG	SELF	0	0	27500	0	0	27500			Active	0
VS0303	B.SRIKRITHI	B.GOPI KRISHNA	9848002279	RCB	5TH	STOP03-12000	0	5500	37500	12000	0	44000			Active	0
VS0534	A.VARNIKA	A.VINOD KUMAR	9160836555	RCB	5TH	STOP02-10000	0	5500	37500	10000	0	42000			Active	0
VR1102	S.HARINI	S.SATHYANARAYANA	9000578550	RCB	8TH	SELF	0	0	38500	0	0	38500			Active	0
VR01232	G.PREKSHITHA	G.ANJI REDDY	8919699964	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
TEMP020	M.VISHWADIKA	M.SRIKANTH	8088558868	RCB	LKG	SELF	0	2500	25500	0	0	23000			Active	0
TEMP021	D.AAYANSH REDDY	D. UPENDER REDDY	7702047416	RCB	LKG	STOP02-10000	0	2500	25500	10000	0	33000			Active	0
VR01193	M.TEJASWI	M.HARISH GOUD	9989080313	RCB	1ST	SELF	0		33000	0	0	33000			Active	0
VR0082-26	G.DIVYA SRI	G.NARSING RAO	9502222854	RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
VM0737	P.SRIKAMAL	P.ANJANEYULU	8978559784	RCB	3RD	STOP02-10000	0	0	35500	10000	0	45500			Active	0
VR1071	T.VANSHIKA	T.RAMALINGA REDDY	9490102656	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
VR014-25	S.VENNELA	S.MALLESHAM	9849536050	RCB	9TH	SELF	0	0	42000	0	0	42000			Active	0
VR01347	S.NAVYA SREE	S.SRISAILAM	9849536050	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VR01343	S.VYSHNAVDEEP	S.SRISAILAM	9849536050	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
VR01106	B.RAKSHITHA	B.RAJU	7995667946	RCB	8TH	SELF	0	0	38500	0	0	38500			Active	0
VR0940	P.DEVANSH	P.PRASHANTH	9493938690	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
TEMP022	J.HIMANSH	J.RAMCHANDER	9966322291	RCB	NUR	SELF	2000	0	25500	0	2000	27500			Active	0
VR01079	N.TARAK REDDY	N.SRIKANTH REDDY	8501905560	RCB	UKG	SELF	0	3500	27500	0	0	24000			Active	0
TEMP023	K.SHREYAN VEDH	K.SRIKANTH	9866609585	RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
VR01058	G.DHANA SRI	G.TRINAD RAO	9493313354	RCB	6TH	SELF	0	0	37500	0	0	37500			Active	0
VS0478	G.HANISH	G.TRINADH RAO	9493313354	RCB	5TH	SELF	0	0	37500	0	0	37500			Active	0
VR01105	B.SAHITHI	B.RAJU	7995667946	RCB	6TH	SELF	0	0	37500	0	0	37500			Active	0
TEMP024	HARI RUDRANSH	S.JAGADESHWAR	9603029034	RCB	NUR	SELF	0	3500	25500	0	0	22000			Active	0
TEMP025	G.AARADHYA	G.RAJASHEKHAR	9701221594	RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
VR0031-26	K.SIDDARTH	K.RAJU	9494917274	RCB	5TH	SELF	0	5500	37500	0	0	32000			Active	0
VR0032-26	K.SRIYAN	K.RAJU	9494917274	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VR01340	P.CHAITRA	P.DHARSHAN	8500580720	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VRCB062	P.VIKAS RAJ	P.DARSHAN	8500580720	RCB	UKG	SELF	0	0	27500	0	0	27500			Active	0
VS0455	G.SAMANVITHA	G.JAGANMOHAN REDDY	9985810440	RCB	5TH	STOP02-10000	0	0	37500	10000	0	47500			Active	0
VR0676	CH.ARYAN THANISHQ	CH.NARENDAR	9701082106	RCB	4TH	SELF	0	0	35500	0	0	35500			Active	0
TEMP026	B.AADYA SRI	B.SANTHOSH	8500082524	RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
VR1014	S.ADVIK	S.SANTHOSH KUMAR	9848560430	RCB	5TH	STOP01-6000	0	4500	37500	6000	0	39000			Active	0
VR012-25	D.SHRADHHAA	D.SRINIVAS	9701660387	RCB	9TH	STOP02-10000	0	0	42000	10000	0	52000			Active	0
VS0451	D.AVANI	D.SRINIVAS	9701660387	RCB	4TH	STOP02-10000	0	0	35500	10000	0	45500			Active	0
VR010-25	V.OMKAR REDDY	V.SATHISH REDDY	9652120836	RCB	9TH	STOP02-10000	0	0	42000	10000	0	52000			Active	0
VS01611	V.BHARGAV REDDY	V.SATHISH REDDY	9652120836	RCB	7TH	STOP02-10000	0	0	38500	10000	0	48500			Active	0
VR01090	P.MANSI	P.SRIDHAR REDDY	6303196311	RCB	2ND	SELF	0	0	33000	0	0	33000			Active	0
TEMP027	K.MADHUPUNARVI	K.MADHUMOHAN	9014495951	RCB	NUR	SELF	2000	0	25500	0	2000	27500			Active	0
TEMP028	D.AADYA SREE	D.SRIRAM PRASAD	9441823543	RCB	NUR	SELF	0	0	25500	0	0	25500			Active	0
VS0380	K.SAANVI	K.NAGARAJU GOUD	9492911341	RCB	5TH	SELF	0	0	37500	0	0	37500			Active	0
TEMP029	G.HARSHA VARDHAN	G.SHIVA PRASAD	9912761014	RCB	4TH	STOP02-10000	0	0	35500	10000	0	45500			Active	0
VR0897	M.HASYA GOURI	M.VEERA BHADRAREDDY	9440311915	RCB	6TH	STOP03-12000	0	0	37500	12000	0	49500			Active	0
VS409	G.SRIVALLI	G.VARADHA RAJU	8520828167	RCB	5TH	STOP02-10000	0	0	37500	10000	0	47500			Active	0
VR1256	V.SHREYANSHI	V.CHANDRASHEKAR	9490866432	RCB	LKG	STOP03-12000	0	0	25500	12000	0	37500			Active	0
VR0655	B.NIHAN REDDY	B.SANTHOSH REDDY	9441763105	RCB	5TH	SELF	0	0	37500	0	0	37500			Active	0
VR0948	H.RAGHU VARDHAN	H.JANGAIAH	9441799692	RCB	1ST	SELF	0	0	33000	0	0	33000			Active	0
VR1196	CH.ADVAITH REDDY	CH.MADHUSUDHAN REDDY	9618506638	RCB	3RD	SELF	0	0	35500	0	0	35500			Active	0
VM0265	CH.KOMALI	CH.SUBHARAJU	9912906516	RCB	7TH	STOP02-10000	0	0	38500	10000	0	48500			Active	0
VR0525	CH.SOUKYA	CH.SUBHARAJU	9912906516	RCB	4TH	STOP02-10000	0	0	35500	10000	0	45500			Active	0
VR01128	SUSHANTH RATHOD	BABU RAO	8500226159	RCB	2ND	SELF	0	0	33000	0	0	33000			Active	0
VR01260	LAKSHITH RATHOD	BABU RAO	8500226159	RCB	LKG	SELF	0	0	25500	0	0	25500			Active	0
VR01022	N.SHREYANVI	N.NAVEEN REDDY	9848397697	RCB	1ST	STOP02-10000	0	0	33000	10000	0	43000			Active	
`;

async function main() {
  console.log("🚀 Starting student roster and billing ledger migration for FY 2026-27 / AY 2026-27...");

  console.log("🧹 Wiping old student and billing ledger tables to ensure fresh migration...");
  
  // Use TRUNCATE CASCADE to handle all foreign key dependencies automatically
  await prismaBypass.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "AcademicHistory",
      "AcademicRecord",
      "StudentGuardian",
      "Address",
      "FeeInvoiceItem",
      "FeeInvoice",
      "HomeworkSubmission",
      "Feedback",
      "ProfileChangeRequest",
      "NoticeAcknowledgement",
      "GuardianOTP",
      "GuardianSession",
      "GuardianAuth",
      "Guardian",
      "FamilyDetail",
      "Student"
    CASCADE
  `);
  
  // Reset TenancyCounter sequences so ERP IDs start from 1
  await prismaBypass.tenancyCounter.deleteMany({
    where: {
      type: { in: ["STUDENT_CODE", "STUDENT_ADMISSION", "REGISTRATION"] }
    }
  });
  console.log("✅ Wiped all historical data tables and reset ID counters successfully.");

  // 1. Resolve Global Configuration Context (VIVES Reddy Colony Branch)
  const schoolId = "VIVES";
  const schoolCode = "VIVES";
  const branchId = "VIVES-RCB";
  const branchCode = "VIVES-RCB";
  const academicYearId = "VIVES-HQ-AY-2026-27";
  const financialYearId = "VIVES-HQ-FY-2026-27";
  const yearLabel = "2627";

  const ay = await prismaBypass.academicYear.findUnique({ where: { id: academicYearId } });
  if (!ay) {
    console.error(`❌ Academic Year ${academicYearId} not found in database.`);
    return;
  }

  // 2. Load classes for quick mapping
  const classes = await prismaBypass.class.findMany({ where: { schoolId } });
  const classMap = new Map<string, string>(); // sheet label -> classId
  
  classes.forEach(c => {
    classMap.set(c.name.toUpperCase(), c.id);
  });

  function getMappedClassId(sheetClass: string): string | null {
    const rawClass = sheetClass.trim().toUpperCase();
    let targetName = "";
    if (rawClass === "NUR") targetName = "NURSERY";
    else if (rawClass === "LKG") targetName = "LKG";
    else if (rawClass === "UKG") targetName = "UKG";
    else if (rawClass === "1ST") targetName = "1ST GRADE";
    else if (rawClass === "2ND") targetName = "2ND GRADE";
    else if (rawClass === "3RD") targetName = "3RD GRADE";
    else if (rawClass === "4TH") targetName = "4TH GRADE";
    else if (rawClass === "5TH") targetName = "5TH GRADE";
    else if (rawClass === "6TH") targetName = "6TH GRADE";
    else if (rawClass === "7TH") targetName = "7TH GRADE";
    else if (rawClass === "8TH") targetName = "8TH GRADE";
    else if (rawClass === "9TH") targetName = "9TH GRADE";
    else if (rawClass === "10TH") targetName = "10TH GRADE";
    else targetName = rawClass;

    return classMap.get(targetName) || null;
  }

  // 3. Split TSV dataset rows
  const lines = rawSpreadsheetData.trim().split("\n");
  const headers = lines[0].split("\t").map(h => h.trim());
  const rows = lines.slice(1);

  console.log(`- Loaded ${rows.length} rows from dataset.`);

  let importedCount = 0;
  let siblingLinksCount = 0;
  let ledgerInvoicesCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split("\t").map(c => c.trim());
    if (cols.length < 5 || !cols[0]) continue;

    const admiNo = cols[0];
    const studentName = cols[1];
    const parentName = cols[2];
    const contactRaw = cols[3];
    const className = cols[5];
    const stopName = cols[6] || "SELF";
    
    // Financial Dues
    const admissionFee = parseFloat(cols[7]) || 0;
    const concession = parseFloat(cols[8]) || 0;
    const tuitionFee = parseFloat(cols[9]) || 0;
    const transportFee = parseFloat(cols[10]) || 0;
    const totalDue = parseFloat(cols[12]) || 0;
    
    // Dates & Status
    const joiningDateStr = cols[13];
    const status = cols[15] || "Active";

    const classId = getMappedClassId(className);
    if (!classId) {
      console.warn(`⚠️ Row ${i+2}: Class "${className}" could not be resolved. Skipping.`);
      continue;
    }

    // Split student name
    const studentParts = studentName.split(/\s+/);
    const studentFirst = studentParts[0];
    const studentLast = studentParts.slice(1).join(" ");

    // Split parent/guardian name
    const parentParts = parentName.split(/\s+/);
    const parentFirst = parentParts[0];
    const parentLast = parentParts.slice(1).join(" ");

    // Normalize phone number
    let phone = contactRaw.replace(/\s+/g, "");
    if (!phone || phone.length < 8) {
      // Fallback unique placeholder phone if contact is missing
      phone = `99900${admiNo.replace(/[^0-9]/g, "").padEnd(5, "0")}`;
    }

    // Parse Joining Date
    let joiningDate = new Date("2026-06-01"); // Default start of academic year
    if (joiningDateStr) {
      const parts = joiningDateStr.split("/");
      if (parts.length === 3) {
        joiningDate = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
      }
    }

    try {
      await prismaBypass.$transaction(async (tx) => {
        // A. Resolve or Create Student with proper ERP IDs
        let student = await tx.student.findFirst({
          where: { bookId: admiNo }
        });

        if (!student) {
          // Generate proper ERP IDs via CounterService
          const registrationId = await CounterService.generateRegistrationId({
            schoolId, schoolCode, branchId, branchCode
          }, tx);
          const admissionNumber = await CounterService.generateAdmissionNumber({
            schoolId, schoolCode, branchId, branchCode, year: yearLabel
          }, tx);
          const studentCode = await CounterService.generateStudentCode({
            schoolId, schoolCode, branchId, branchCode, year: yearLabel
          }, tx);

          student = await tx.student.create({
            data: {
              registrationId,
              admissionNumber,
              studentCode,
              bookId: admiNo,
              firstName: studentFirst,
              lastName: studentLast || null,
              gender: "MALE",
              status: "Active",
              schoolId,
              branchId
            }
          });
        }

        // B. Setup Placement Records
        let academicRec = await tx.academicRecord.findUnique({
          where: { studentId: student.id }
        });

        if (!academicRec) {
          await tx.academicRecord.create({
            data: {
              studentId: student.id,
              classId,
              academicYear: ay.name,
              schoolId,
              branchId,
              admissionDate: joiningDate
            }
          });
        }

        let studentAY = await tx.studentAcademicYear.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: student.id,
              academicYearId
            }
          }
        });

        if (!studentAY) {
          await tx.studentAcademicYear.create({
            data: {
              id: uuidv4(),
              studentId: student.id,
              classId,
              academicYearId,
              promotionStatus: "PENDING",
              renewalStatus: "PENDING",
              admissionNumber: student.admissionNumber,
              studentCode: student.studentCode,
              schoolId,
              branchId,
              admissionDate: joiningDate
            }
          });
        }

        // C. Resolve or Create Guardian (Check if phone already registered to avoid duplication & form siblings!)
        let guardian = await tx.guardian.findUnique({
          where: { phone }
        });

        if (!guardian) {
          guardian = await tx.guardian.create({
            data: {
              firstName: parentFirst,
              lastName: parentLast || null,
              phone,
              email: `${parentFirst.toLowerCase()}.${admiNo.toLowerCase()}@example.com`,
              schoolId
            }
          });
        }

        // D. Link StudentGuardian
        const link = await tx.studentGuardian.findFirst({
          where: {
            studentId: student.id,
            guardianId: guardian.id
          }
        });

        if (!link) {
          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardian.id,
              relationType: "FATHER",
              isPrimaryGuardian: true,
              feeResponsibility: true,
              activeStatus: "ACTIVE",
              schoolId,
              branchId
            }
          });
          siblingLinksCount++;
        }

        // E. Create billing ledger invoice if tuitionFee is set
        if (totalDue > 0) {
          const invoiceNum = `INV-2627-${admiNo}`;
          
          let invoice = await tx.feeInvoice.findUnique({
            where: { invoiceNumber: invoiceNum }
          });

          if (!invoice) {
            invoice = await tx.feeInvoice.create({
              data: {
                invoiceNumber: invoiceNum,
                studentId: student.id,
                academicYearId,
                financialYearId,
                totalAmount: totalDue,
                paidAmount: 0,
                balance: totalDue,
                dueDate: new Date("2026-06-30"),
                status: "PENDING",
                schoolId,
                branchId
              }
            });

            // Create items
            if (tuitionFee > 0) {
              await tx.feeInvoiceItem.create({
                data: {
                  invoiceId: invoice.id,
                  componentName: "Tuition Fee",
                  componentType: "TUTION",
                  amount: tuitionFee,
                  balance: tuitionFee
                }
              });
            }

            if (admissionFee > 0) {
              await tx.feeInvoiceItem.create({
                data: {
                  invoiceId: invoice.id,
                  componentName: "Admission Fee",
                  componentType: "ADMISSION",
                  amount: admissionFee,
                  balance: admissionFee
                }
              });
            }

            if (transportFee > 0) {
              await tx.feeInvoiceItem.create({
                data: {
                  invoiceId: invoice.id,
                  componentName: `Transport Fee (${stopName})`,
                  componentType: "TRANSPORT",
                  amount: transportFee,
                  balance: transportFee
                }
              });
            }

            if (concession > 0) {
              await tx.feeInvoiceItem.create({
                data: {
                  invoiceId: invoice.id,
                  componentName: "Fee Concession",
                  componentType: "CONCESSION",
                  amount: -concession,
                  balance: -concession
                }
              });
            }

            ledgerInvoicesCount++;
          }
        }
      }, { timeout: 30000, maxWait: 10000 });

      importedCount++;
    } catch (err) {
      console.error(`❌ Failed to import row ${i+2} (Admi No: ${admiNo}):`, err);
    }
  }

  console.log(`\n🎉 Roster and billing ledger migration finished:`);
  console.log(`- Total Students Processed: ${importedCount}`);
  console.log(`- Linked StudentGuardian Linkages: ${siblingLinksCount}`);
  console.log(`- Outstanding Fee Invoices Created: ${ledgerInvoicesCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
