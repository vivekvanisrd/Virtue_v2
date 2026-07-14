import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { prismaBypass } from "../src/lib/prisma";
import { v4 as uuidv4 } from "uuid";

// Embedded TSV dataset (exact copy of user roster)
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
TEMP018	P.SHREYANSH REDDY	P.AMARNATH REDDY	7382553868	RCB	LKG	STOP04-16000	0	0	25500	16000	0	41500			Active	0
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
VR01022	N.SHREYANVI	N.NAVEEN REDDY	9848397697	RCB	1ST	STOP02-10000	0	0	33000	10000	0	43000			Active	0
`;

async function main() {
  const schoolId = "VIVES";
  const branchId = "VIVES-RCB";

  console.log("🚀 Initializing profile backfill for Excel-imported students via embedded TSV...");

  // Resolve Master Fee Components
  const tuitionMaster = await prismaBypass.feeComponentMaster.findFirst({
    where: { schoolId, name: "Tuition Fee" }
  });
  const transportMaster = await prismaBypass.feeComponentMaster.findFirst({
    where: { schoolId, name: "Transport Fee" }
  });

  if (!tuitionMaster || !transportMaster) {
    throw new Error("Required core fee component masters (Tuition Fee, Transport Fee) are missing from registry.");
  }

  let familyCreated = 0;
  let addressCreated = 0;
  let financialCreated = 0;
  let transportCreated = 0;
  let componentsCreated = 0;

  // Split TSV dataset rows
  const lines = rawSpreadsheetData.trim().split("\n");
  const rows = lines.slice(1);

  console.log(`Loaded ${rows.length} rows from embedded TSV.`);

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split("\t").map(c => c.trim());
    if (cols.length < 5 || !cols[0]) continue;

    const admiNo = cols[0];
    const parentNameRaw = cols[2];
    const contactRaw = cols[3];
    const stopField = cols[6] || "SELF";
    
    // Financials
    const concession = parseFloat(cols[8]) || 0;
    const tuitionFee = parseFloat(cols[9]) || 0;
    const transportFee = parseFloat(cols[10]) || 0;
    const totalDue = parseFloat(cols[12]) || 0;

    // Find the student in DB
    const student = await prismaBypass.student.findFirst({
      where: { bookId: admiNo, schoolId }
    });

    if (!student) {
      console.warn(`[WARN] Row ${i+2}: Student with bookId "${admiNo}" not found in database. Skipping.`);
      continue;
    }

    const parentName = parentNameRaw || "Parent of " + student.firstName;
    const phone = contactRaw.replace(/\s+/g, "") || "0000000000";

    await prismaBypass.$transaction(async (tx) => {
      // 1. Check & Backfill Family Detail
      const existingFamily = await tx.familyDetail.findUnique({
        where: { studentId: student.id }
      });
      if (!existingFamily) {
        const spaceIdx = parentName.indexOf(" ");
        const first = spaceIdx > 0 ? parentName.substring(0, spaceIdx) : parentName;

        await tx.familyDetail.create({
          data: {
            studentId: student.id,
            fatherName: parentName,
            fatherPhone: phone,
            fatherEmail: `${first.toLowerCase()}.${admiNo.toLowerCase()}@example.com`,
            motherName: "Mother of " + student.firstName,
            emergencyName: parentName,
            emergencyPhone: phone,
            emergencyRelation: "FATHER"
          }
        });
        familyCreated++;
      }

      // 2. Check & Backfill Address Record
      const existingAddress = await tx.address.findUnique({
        where: { studentId: student.id }
      });
      if (!existingAddress) {
        await tx.address.create({
          data: {
            studentId: student.id,
            currentAddress: "VIVES Campus Student Address",
            permanentAddress: "VIVES Campus Student Address",
            city: "Hyderabad",
            state: "Telangana",
            country: "India",
            pincode: "500001"
          }
        });
        addressCreated++;
      }

      // 3. Check & Backfill FinancialRecord
      let financial = await tx.financialRecord.findUnique({
        where: { studentId: student.id }
      });

      if (!financial) {
        financial = await tx.financialRecord.create({
          data: {
            studentId: student.id,
            schoolId,
            paymentType: "Term-wise",
            tuitionFee: tuitionFee,
            admissionFee: 0,
            cautionDeposit: 0,
            transportFee: transportFee,
            annualTuition: totalDue,
            term1Amount: totalDue * 0.50,
            term2Amount: totalDue * 0.25,
            term3Amount: totalDue * 0.25,
            totalDiscount: concession
          }
        });
        financialCreated++;
      }

      // 4. Check & Backfill StudentFeeComponent rows
      if (tuitionFee > 0) {
        const existTuitionComp = await tx.studentFeeComponent.findFirst({
          where: { studentFinancialId: financial.id, componentId: tuitionMaster.id }
        });
        if (!existTuitionComp) {
          await tx.studentFeeComponent.create({
            data: {
              studentFinancialId: financial.id,
              componentId: tuitionMaster.id,
              schoolId,
              branchId,
              baseAmount: tuitionFee,
              discountAmount: concession,
              waiverAmount: 0,
              isApplicable: true
            }
          });
          componentsCreated++;
        }
      }

      if (transportFee > 0) {
        const existTransComp = await tx.studentFeeComponent.findFirst({
          where: { studentFinancialId: financial.id, componentId: transportMaster.id }
        });
        if (!existTransComp) {
          await tx.studentFeeComponent.create({
            data: {
              studentFinancialId: financial.id,
              componentId: transportMaster.id,
              schoolId,
              branchId,
              baseAmount: transportFee,
              discountAmount: 0,
              waiverAmount: 0,
              isApplicable: true
            }
          });
          componentsCreated++;
        }
      }

      // 5. Check & Backfill StudentTransport
      if (transportFee > 0 && stopField && stopField !== "SELF") {
        const existingTransport = await tx.studentTransport.findUnique({
          where: { studentId: student.id }
        });

        if (!existingTransport) {
          const stopCode = stopField.includes("-") ? stopField.split("-")[0].trim() : stopField;

          // Resolve or Create Route
          let route = await tx.route.findFirst({
            where: { routeCode: stopCode, schoolId }
          });
          if (!route) {
            route = await tx.route.create({
              data: {
                routeName: `Route ${stopCode}`,
                routeCode: stopCode,
                schoolId,
                branchId
              }
            });
          }

          // Resolve or Create VehicleStop
          let stop = await tx.vehicleStop.findFirst({
            where: { stopName: `${stopCode} Stop`, routeId: route.id }
          });
          if (!stop) {
            stop = await tx.vehicleStop.create({
              data: {
                stopName: `${stopCode} Stop`,
                routeId: route.id,
                pickupTime: "08:00 AM",
                dropTime: "04:30 PM",
                monthlyFee: transportFee / 10,
                schoolId,
                branchId
              }
            });
          }

          // Create StudentTransport allocation
          await tx.studentTransport.create({
            data: {
              studentId: student.id,
              routeId: route.id,
              pickupStopId: stop.id,
              dropStopId: stop.id,
              monthlyFee: transportFee / 10,
              schoolId,
              branchId,
              status: "Active"
            }
          });
          transportCreated++;
        }
      }
    }, { timeout: 30000 });
  }

  console.log("\n🎉 Profile backfill completed successfully:");
  console.log(`- Created Family Records: ${familyCreated}`);
  console.log(`- Created Address Records: ${addressCreated}`);
  console.log(`- Created Financial Profiles: ${financialCreated}`);
  console.log(`- Created Fee Component Settings: ${componentsCreated}`);
  console.log(`- Created Transport Assignments (StudentTransport): ${transportCreated}`);
}

main()
  .catch(console.error)
  .finally(() => prismaBypass.$disconnect());
