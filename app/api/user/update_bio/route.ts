import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest } from "@/app/lib/utils";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const {userId} = getUserIdFromRequest(request)
    const {  bio } = await request.json();
    console.log(bio, userId)

    if (!userId || typeof bio !== 'string') {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
    }

    await connectDB();
    console.log(bio)
    await query(
      `UPDATE users SET bio = $1 WHERE id = $2`,
      [bio.trim(), userId]
    );

    const response = NextResponse.json({ message: "Bio updated successfully" });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error updating bio:", error);
    return setCorsHeaders(
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
