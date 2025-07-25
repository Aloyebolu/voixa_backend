import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, unfollowId } = await request.json();

    if (!userId || !unfollowId) {
      return NextResponse.json({ error: "Missing userId or unfollowId" }, { status: 400 });
    }

    await connectDB();

    // Remove the follow relationship
    await query(
      `DELETE FROM followers WHERE follower_id = $1 AND user_id = $2`,
      [userId, unfollowId]
    );

    const response = NextResponse.json({ success: true, message: "Unfollowed successfully" });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return setCorsHeaders(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
