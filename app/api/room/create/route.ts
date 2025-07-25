import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest } from "@/app/lib/utils";
import { joinRoom } from "@/app/lib/rooms/joinRoom";

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
  const { description, tag, max_participants, scheldueled_room, type} = await request.json();
  const hostId = getUserIdFromRequest(request).userId;
  if (!hostId) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return setCorsHeaders(res);
  }
  // Insert the room without host_id
  const roomData = await query(
    `INSERT INTO rooms(tag, room_description) 
     VALUES ($1, $2) 
     RETURNING id`, 
    [tag, description]
  );
  const room = roomData[0];

  // Insert the host into room_roles table linked to the room
  await query(
    `INSERT INTO room_roles(user_id, room_id, role, position)
     VALUES ($1, $2, $3, $4)`,
    [hostId, room.id, 'holder', 1]
  );
  const roomIdString = roomData[0].id
  const roomId = String(roomIdString);
  const result = await joinRoom(roomId, hostId);  
  console.log(result)
  const res = NextResponse.json(result.data);
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