import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    connectDB()
    const imageId = params.id;

  try {
    // Fetch the image data from PostgreSQL
    const result = await query("SELECT image_data FROM images WHERE user_id = $1", [imageId]);

    if (!result) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const imageBuffer = result[0].image_data;
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Change based on your image type
      },
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}