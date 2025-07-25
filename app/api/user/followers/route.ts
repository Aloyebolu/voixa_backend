import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
    const LIMIT = 15
  try {
    const { userId, page } = await request.json();

    if (!userId || !page || !LIMIT) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    await connectDB();

    const offset = (page - 1) * LIMIT;

    // Fetch followers with pagination
    const followersData = await query(
      `SELECT users.id, users.name, users.avatar 
       FROM followers 
       JOIN users ON followers.follower_id = users.id 
       WHERE followers.user_id = $1 
       LIMIT $2 OFFSET $3`,
      [userId, LIMIT, offset]
    );
 
    const followers = followersData.map((follower: any) => ({
      id: follower.id,
      name: follower.name,
      avatar: follower.avatar,
    }));

    const response = NextResponse.json({ followers });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error fetching followers:", error);
    return setCorsHeaders(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
