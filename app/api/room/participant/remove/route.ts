import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

export async function POST(request: NextRequest) {
  const viewerId = getUserIdFromRequest(request);
  const { userId, roomId } = await request.json();
  if (!viewerId) {
    console.error("No viewer ID found in the request.");
    return setCorsHeaders(
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  connectDB();
  try {
    // Execute the first update query
    const updatePositionQuery = `
      UPDATE room_roles
      SET position = 0
      WHERE user_id = $1 AND room_id = $2 AND role != 'holder'
    `;
    const positionResult = await query(updatePositionQuery, [userId, roomId]);

    // Execute the second update query
    const updateStatusQuery = `
      UPDATE room_roles
      SET status = 'outside'
      WHERE user_id = $1 AND room_id = $2
    `;
    const statusResult = await query(updateStatusQuery, [userId, roomId]);

    // Check if any rows were affected
    if (positionResult.length === 0 && statusResult.length === 0) {
      return setCorsHeaders(
        NextResponse.json(
          { message: "No matching record found to update" },
          { status: 404 }
        )
      );
    }

    return setCorsHeaders(
      NextResponse.json({ message: "User removed successfully" }, { status: 200 })
    );
  } catch (error) {
    console.error("User removal error:", error);
    return setCorsHeaders(
      NextResponse.json(
        { message: "Failed to remove user" },
        { status: 500 }
      )
    );
  }
}
