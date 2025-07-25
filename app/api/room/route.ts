/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest } from "@/app/lib/utils";

// Function to apply CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

// Handle preflight (OPTIONS)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}

// Handle GET request
export async function POST(request: NextRequest) {
  await connectDB();
  const { roomId} = await request.json()
  const userId = getUserIdFromRequest(request)
  if(!userId){
    console.log("Invalid access")
  }
  if(roomId){
    const room = await query("SELECT status, type, id FROM rooms WHERE id = $1 ", [roomId]);
    const participants = await query(`
          SELECT 
            u.id, 
            u.country,
            u.name, 
            rr.position, 
            rr.role,
            ui.image_path
          FROM room_roles rr
          JOIN users u ON rr.user_id = u.id
          LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true
          WHERE rr.room_id = $1 AND rr.status = 'inside'
        `, [roomId]);
      const roomData = {...room[0], participants}
      console.log(roomData)

      const response = NextResponse.json(roomData);
    return setCorsHeaders(response);
  }
  try {
    // Fetch all rooms
    const rooms = await query("SELECT * FROM rooms");
    console.log(rooms)
    // For each room, fetch the participants
    const roomList = await Promise.all(
      rooms.map(async (room: { participants: any[]; id: string }) => {
        const participants: any[] = await query(`
          SELECT 
            u.id, 
            u.country,
            u.name, 
            rr.position, 
            rr.role,
            ui.image_path
          FROM room_roles rr
          JOIN users u ON rr.user_id = u.id
          LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true
          WHERE rr.room_id = $1 AND rr.status = 'inside'
        `, [room.id]);
        

        room.participants = participants ;
        return room;
      })
    );

    const response = NextResponse.json(roomList);
    return setCorsHeaders(response);

  } catch (err) {
    console.error("Error fetching rooms:", err);
    const errorResponse = NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    return setCorsHeaders(errorResponse);
  }
}
