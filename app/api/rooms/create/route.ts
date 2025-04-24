import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

// Utility function to set CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}
// Handle POST
export async function POST(request: NextRequest) {

  connectDB();
  const { title, description, hostId } = await request.json();

  const data = await query(
    `INSERT INTO rooms(room_title, room_description, host_id) 
     VALUES ($1, $2, $3) 
     RETURNING *`, 
    [title, description, hostId]
  );
  console.log(data[0]); // This will give you the inserted row
  
  const res = NextResponse.json(data);
  return setCorsHeaders(res);
}


// Handle PUT
export async function PUT(request: NextRequest) {

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