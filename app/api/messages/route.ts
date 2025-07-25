import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import jwt from "jsonwebtoken";

const SECRET_KEY = "your_secret_key"; // Replace with the same key used in login

// Utility function to set CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// Middleware to verify JWT
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(request.headers);
    return {
      valid: false,
      response: setCorsHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return { valid: true, decoded };
  } catch (error) {
    console.log(error);
    return {
      valid: false,
      response: setCorsHeaders(
        NextResponse.json({ message: "Invalid token" }, { status: 401 })
      ),
    };
  }
}

// Handle POST
export async function POST(request: NextRequest) {
  // const { valid, response } = await verifyToken(request);
  // if (!valid) return response;

  connectDB();
  let { conversationId, senderId, message, reply, attachment, type } = await request.json();
  
  message = message.replace(/'/g, "''");
  const nowUTC = new Date().toISOString();

  try {
    // Insert the message into the database
    const data = await query(
      `INSERT INTO messages(created_at,conversation_id, sender_id, attachment, message, reply, type)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`
    , [nowUTC, conversationId, senderId, attachment, message, reply, type == null ? 'text' : type]);

    const messageId = data[0]?.id;

    // Update the last_updated field in the conversations table
    await query(`
  UPDATE conversations 
  SET last_updated = '${nowUTC}' 
  WHERE id = '${conversationId}'
`);
    await query(
      `UPDATE messages_last_read SET last_updated = $3 WHERE user_id = $1 AND conversation_id = $2`,
      [senderId, conversationId, nowUTC]
    );
    console.log(nowUTC);
    // Fetch participants of the conversation
    const participants = await query(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
      [conversationId]
    );

    // Prepare unread messages for other users
    const unreadInserts = participants
      .filter((p) => p.user_id !== senderId)
      .map((p) => `('${p.user_id}', '${messageId}', '${conversationId}')`)
      .join(",");


    const res = NextResponse.json({ success: true, messageId });
    return setCorsHeaders(res);
  } catch (error) {
    console.error("Error inserting message:", error);
    const res = NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}

// Handle DELETE
export async function DELETE(request: NextRequest) {
  const { valid, response } = await verifyToken(request);
  // if (!valid) return response;

  connectDB();
  const nowUTC = new Date().toISOString();
  const messageId = await request.json();
  const data = await query(
    `DELETE FROM messages WHERE id='${messageId}' RETURNING conversation_id`
  ); 
  const conversationId = data[0]?.conversation_id;
       // Update the last_updated field in the conversations table
      await query(`
        UPDATE conversations 
        SET last_updated = '${nowUTC}' 
        WHERE id = '${conversationId}'
      `);
  const res = NextResponse.json(data);

  return setCorsHeaders(res);
}

// Handle PUT
export async function PUT(request: NextRequest) {
  const { valid, response } = await verifyToken(request);
  if (!valid) return response;

  connectDB();
  const nowUTC = new Date().toISOString();
  const req = await request.json();
  const messageId = req[0];
  const message = req[1];
  const data = await query(
    `UPDATE messages SET message='${message}' WHERE id='${messageId}' RETURNING conversation_id`
  ); 
  const conversationId = data[0]?.conversation_id;
       // Update the last_updated field in the conversations table
      await query(`
        UPDATE conversations 
        SET last_updated = '${nowUTC}' 
        WHERE id = '${conversationId}'
      `);
  const res = NextResponse.json(data);
  return setCorsHeaders(res);
}

// Handle GET (fallback)
export async function GET() {
  const response = NextResponse.json({ status: 404, message: "Bad request" });
  return setCorsHeaders(response);
}

// Handle OPTIONS (Preflight Request)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
