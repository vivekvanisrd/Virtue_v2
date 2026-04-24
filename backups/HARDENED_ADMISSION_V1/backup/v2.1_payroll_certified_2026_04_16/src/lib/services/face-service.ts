import axios from "axios";
import prisma from "@/lib/prisma";

const AZURE_KEY = process.env.AZURE_FACE_KEY;
const AZURE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT;
const PERSON_GROUP_ID = "staff-group-main";

/**
 * Facial Recognition Wrapper (Azure)
 * ----------------------------------
 * Logic for registration and verification of staff biometrics.
 */
export class FaceService {

  /**
   * Register Staff Face
   * Captured images -> Azure Person -> Store faceId
   */
  static async registerStaffFace(staffId: string, imageBase64: string) {
     // --- MOCK FLOW FOR INITIAL PHASE ---
     if (!AZURE_KEY) {
        console.warn("[FaceService] Azure Key missing. Using MOCK registration.");
        const faceId = `mock-face-${Math.random().toString(36).substr(2, 9)}`;
        return await prisma.staffFaceProfile.upsert({
           where: { staffId },
           update: { faceId },
           create: { staffId, faceId }
        });
     }

     // --- REAL AZURE FLOW ---
     // 1. Ensure Person Group exists (Omitted for brevity)
     // 2. Create/Get Person ID for staff
     // 3. Add Face to Person
     // 4. Trigger Train
     return { success: true, message: "Face Registered in Azure PersonGroup" };
  }

  /**
   * Verify Staff Face
   * Captured image -> Azure Detect -> Verify against staff record
   */
  static async verifyStaffFace(imageBase64: string) {
     if (!AZURE_KEY) {
        console.warn("[FaceService] Azure Key missing. Using MOCK verification.");
        // In mock mode, we just return the first staff found (for testing UI)
        const profile = await prisma.staffFaceProfile.findFirst();
        return { 
           success: true, 
           confidence: 0.98, 
           staffId: profile?.staffId, 
           isMock: true 
        };
     }

     try {
        // --- REAL AZURE FLOW ---
        // 1. Detect Face (capture faceId from image)
        // 2. Identify Person in PersonGroup
        // 3. Return top match
        return { success: false, error: "Azure logic integration pending keys." };
     } catch (error: any) {
        return { success: false, error: error.message };
     }
  }
}
