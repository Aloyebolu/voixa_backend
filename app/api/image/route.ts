import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";


export async function POST(req: NextRequest) {
    connectDB()
  try {
    // Read the image as a binary buffer
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    let id = formData.get("json")
    id = id?.slice(1, -1)
    console.log("This is the id: "+id+" and this id the file: "+file)
    if (!file) {
      return new NextResponse("No image uploaded", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Insert image into PostgreSQL
    const result = await query(
      "INSERT INTO images (image_data, user_id) VALUES ($1, $2) RETURNING id",
      [buffer, id]
    );
    console.log(result)
    const imageId = result[0].id;
    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error("Upload error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}