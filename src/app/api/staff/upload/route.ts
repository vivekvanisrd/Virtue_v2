import { NextRequest, NextResponse } from "next/server";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import prisma from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "SECURE_AUTH_REQUIRED" }, { status: 401 });
    }
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;
    const customName = formData.get("customName") as string | null;
    const documentIdToReplace = formData.get("documentIdToReplace") as string | null;
    const formTargetStaffId = formData.get("targetStaffId") as string | null;
    
    if (!file || !documentType) {
      return NextResponse.json({ success: false, error: "Missing file or documentType" }, { status: 400 });
    }
    
    // Resolve target staff ID (Admins can impersonate)
    const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
    const staffId = (isAuthorizedAdmin && formTargetStaffId) ? formTargetStaffId : identity.staffId;
    
    // Validate file size (10 KB to 10 MB)
    const fileSize = file.size;
    if (fileSize < 10 * 1024) {
      return NextResponse.json({ success: false, error: "Minimum file size is 10 KB." }, { status: 400 });
    }
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Maximum allowed file size is 10 MB." }, { status: 400 });
    }
    
    // Validate extension
    const extension = path.extname(file.name).toLowerCase();
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json({ success: false, error: "Only PDF, JPG, JPEG and PNG files are allowed." }, { status: 400 });
    }
    
    const mimeType = file.type;
    if (documentType === "PROFILE_PICTURE") {
      const allowedImageMimes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedImageMimes.includes(mimeType)) {
        return NextResponse.json({ success: false, error: "Profile picture must be a JPG, JPEG or PNG image." }, { status: 400 });
      }
    } else {
      const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedMimes.includes(mimeType)) {
        return NextResponse.json({ success: false, error: "Only PDF, JPG, JPEG and PNG files are allowed." }, { status: 400 });
      }
    }
    
    // Query staff code
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { staffCode: true, schoolId: true }
    });
    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff profile not found" }, { status: 404 });
    }
    
    const schoolId = staff.schoolId;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "staff", staffId);
    await fs.mkdir(uploadDir, { recursive: true });
    
    // 📸 Handle PROFILE PICTURE Upload
    if (documentType === "PROFILE_PICTURE") {
      const storedFileName = `profile_pic${extension}`;
      const filePath = path.join(uploadDir, storedFileName);
      
      // Clean previous profile pictures with different extensions
      const possibleExtensions = [".jpg", ".jpeg", ".png"];
      for (const ext of possibleExtensions) {
        try {
          await fs.unlink(path.join(uploadDir, `profile_pic${ext}`));
        } catch (e) {}
      }
      
      // Save new photo file
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
      
      const fileUrl = `/uploads/staff/${staffId}/${storedFileName}`;
      
      await prisma.staff.update({
        where: { id: staffId },
        data: { photoUrl: fileUrl }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: "Profile picture uploaded successfully.",
        data: { photoUrl: fileUrl }
      });
    }
    
    // 📂 Handle STANDARD DOCUMENT Upload
    const cleanDocType = documentType.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const storedFileName = `${staff.staffCode}_${cleanDocType}_${timestamp}${extension}`;
    const filePath = path.join(uploadDir, storedFileName);
    
    // Write new file
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
    
    const fileUrl = `/uploads/staff/${staffId}/${storedFileName}`;
    let resultDoc;
    
    // If replacing an existing document record
    if (documentIdToReplace) {
      const existingDoc = await prisma.staffDocument.findUnique({
        where: { id: documentIdToReplace }
      });
      
      if (!existingDoc || existingDoc.staffId !== staffId) {
        return NextResponse.json({ success: false, error: "Target document not found or unauthorized." }, { status: 404 });
      }
      
      // Delete old file
      const oldFilePath = path.join(uploadDir, existingDoc.storedFileName);
      try {
        await fs.unlink(oldFilePath);
      } catch (err) {}
      
      resultDoc = await prisma.staffDocument.update({
        where: { id: existingDoc.id },
        data: {
          originalFileName: file.name,
          storedFileName,
          fileUrl,
          fileSize,
          fileExtension: extension,
          mimeType,
          customName: customName || existingDoc.customName,
          lastUpdatedDate: new Date()
        }
      });
    } else {
      // Create new record
      resultDoc = await prisma.staffDocument.create({
        data: {
          staffId,
          documentType,
          customName,
          originalFileName: file.name,
          storedFileName,
          fileUrl,
          fileSize,
          fileExtension: extension,
          mimeType,
          schoolId
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: documentIdToReplace ? "Document replaced successfully." : "Upload completed successfully.",
      data: resultDoc 
    });
    
  } catch (err: any) {
    console.error("Staff Document Upload Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
