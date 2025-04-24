import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key'; // Replace with the same key used in login

// Utility function to set CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

// Middleware to verify JWT
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(request.headers)
    return { valid: false, response: setCorsHeaders(NextResponse.json({ message: 'Unauthorized' }, { status: 401 })) };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return { valid: true, decoded };
  } catch (error) {
    console.log(error)
    return { valid: false, response: setCorsHeaders(NextResponse.json({ message: 'Invalid token' }, { status: 401 })) };
  }
}

// Handle POST
export async function POST(request: NextRequest) {
  const { valid, response } = await verifyToken(request);
  // if (!valid) return response;

  connectDB();
  let { conversationId, senderId, message, reply } = await request.json();
  message = message.replace(/'/g, "''");

  const data = await query(
    `INSERT INTO messages(conversation_id, sender_id, message${reply == null ? '' : ',reply'}) 
     VALUES('${conversationId}', '${senderId}', '${message}'${reply !== null ? `,'${reply}'` : ''})`
  );

  const res = NextResponse.json(data);
  return setCorsHeaders(res);
}

// Handle DELETE
export async function DELETE(request: NextRequest) {
  const { valid, response } = await verifyToken(request);
  // if (!valid) return response;

  connectDB();
  const messageId = await request.json();
  const data = await query(`DELETE FROM messages WHERE id='${messageId}'`);
  const res = NextResponse.json(data);
  return setCorsHeaders(res);
}

// Handle PUT
export async function PUT(request: NextRequest) {
  const { valid, response } = await verifyToken(request);
  if (!valid) return response;

  connectDB();
  const req = await request.json();
  const messageId = req[0];
  const message = req[1];
  const data = await query(`UPDATE messages SET message='${message}' WHERE id='${messageId}'`);
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