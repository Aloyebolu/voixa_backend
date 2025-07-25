import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const filename = params.id;

    // Construct the full path to the file in your public/uploads/user-images directory
    const filePath = path.join(process.cwd(), "public/uploads/user-images", filename);

    // Read the image file from disk
    const fileBuffer = await fs.readFile(filePath);

    // Detect content-type based on extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  } catch (error) {
    console.error("Error reading image:", error);
    return new NextResponse("Image not found", { status: 404 });
  }
}
