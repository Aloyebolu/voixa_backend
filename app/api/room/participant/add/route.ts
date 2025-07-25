import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const viewerId = getUserIdFromRequest(request)?.userId;
    if (!viewerId) {
      console.error("No viewer ID found in the request.");
      return setCorsHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    connectDB();

    const {  userId } = await request.json();
    if (!userId) {
      return setCorsHeaders(
        NextResponse.json({ message: "User ID is required" }, { status: 400 })
      );
    }

    const result = await query(
      `
      INSERT INTO room_roles (user_id, role) 
      VALUES ($1, 'participant') 
      ON CONFLICT (user_id) DO NOTHING 
      RETURNING user_id;

      SELECT image_path 
      FROM user_images 
      WHERE user_id = $1 AND active = true;
      `,
      [userId]
    );

    const imagePath = result[1]?.image_path || null;

    return setCorsHeaders(
      NextResponse.json({ viewerId, userId, imagePath })
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return setCorsHeaders(
      NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
      )
    );
  }
}
