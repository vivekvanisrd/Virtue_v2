import { getAdmissionReferenceData } from '../src/lib/actions/reference-actions';

async function main() {
    console.log("--- Starting Reference Data Debug ---");
    // Mocking getSovereignIdentity would be hard here because of headers/cookies
    // But I want to see if it even runs or crashes.
    try {
        const res = await getAdmissionReferenceData();
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error("Execution Crash:", e.message);
    }
}

main().catch(console.error);
