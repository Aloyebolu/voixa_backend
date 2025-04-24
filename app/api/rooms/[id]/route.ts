import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  connectDB();
  const { id } = params;
  console.log(id);
  const data = await query(`SELECT *  FROM rooms  WHERE id = $1`, [id]);
  const participants = await query(
    "SELECT * FROM room_roles WHERE room_id = $1"
  , [id]);
  const room = data[0]
  room.participants = participants
  const response = NextResponse.json(room);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  console.log(`localhost:3000/api/image/${id}`);
  return response;
}
