import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

function setCorsHeaders(response: NextResponse) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
}

export async function POST(request: NextRequest) {
    console.log("I did it")
    // Parse the request body to extract the last query time
    const { conversationId, userId } = await request.json(); // assuming you send this timestamp in the body of the GET request
    // Connect to the database
    await connectDB();
    const nowUTC = new Date().toISOString();
    await query(`
        INSERT INTO messages_last_read (user_id, conversation_id, last_updated)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, conversation_id)
        DO UPDATE SET last_updated = EXCLUDED.last_updated;
      `, [userId, conversationId, nowUTC]);
    console.log({ conversationId, userId, nowUTC })
    const response = NextResponse.json({});
    return setCorsHeaders(response);
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 200 });
    return setCorsHeaders(response);
}