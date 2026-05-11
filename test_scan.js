
async function testScan() {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = `SOV2_VIVES-001_${timestamp}_TESTSIG`;

  console.log("Simulating Mobile App Scan...");
  console.log("Token Scanned:", token);

  const response = await fetch('http://localhost:3000/api/attendance/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      staffId: 'STF-2026-001', // Ensure this ID exists or the API will say "Staff not found"
      latitude: 17.3850,
      longitude: 78.4867
    })
  });

  const result = await response.json();
  console.log("Backend Response:", result);
}

testScan();
