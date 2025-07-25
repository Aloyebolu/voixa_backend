import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

export async function POST(request: NextRequest) {
  connectDB();
  const { blockedId } = await request.json();

  const user = getUserIdFromRequest(request);
  const userId = user.userId;
  if (!userId) {
    console.error("Unauthorized: Invalid token");
    return NextResponse.json(
      { error: "Unauthorized: Invalid token" },
      { status: 401 }
    );
  }

  if (!userId || !blockedId) {
    const res = NextResponse.json(
      { error: "Missing blockerId or blockedId" },
      { status: 400 }
    );
    return setCorsHeaders(res);
  }

  try {
    const result = await query(
      `INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [userId, blockedId]
    );

    if (result.length === 0) {
      const res = NextResponse.json(
        { message: "User already blocked" },
        { status: 200 }
      );
      return setCorsHeaders(res);
    }

    const res = NextResponse.json(result[0], { status: 201 });
    return setCorsHeaders(res);
  } catch (error) {
    console.error("Error blocking user:", error);
    const res = NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}

// Handle OPTIONS (Preflight Request)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
