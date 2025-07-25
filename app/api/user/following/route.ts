import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  const LIMIT = 15;
  try {
    const { userId, page } = await request.json();

    if (!userId || !page || !LIMIT) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    await connectDB();

    const offset = (page - 1) * LIMIT;

    // Fetch following with pagination
    const followingData = await query(
      `SELECT users.id, users.name, users.country
       FROM followers 
       JOIN users ON followers.user_id = users.id 
       WHERE followers.follower_id = $1 
       LIMIT $2 OFFSET $3`,
      [userId, LIMIT, offset]
    );

    const following = followingData.map((user: any) => ({
      id: user.id,
      name: user.name,
      country: user.country,
    }));
    console.log(following)
    const response = NextResponse.json({ following });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error fetching following:", error);
    return setCorsHeaders(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}