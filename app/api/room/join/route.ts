// File: app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/app/lib/utils";
import { joinRoom } from "@/app/lib/rooms/joinRoom";



// Helper functions
function setCorsHeaders(response: NextResponse): NextResponse {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
export async function OPTIONS(): Promise<NextResponse> {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = getUserIdFromRequest(request);
  // const userId = DEFAULT_USER_ID; 
  if (!userId) {
    console.warn('Unauthorized access attempt');
    return setCorsHeaders(
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  const { roomId: roomIdString } = await request.json();
  const roomId = String(roomIdString);
  const result = await joinRoom(roomId, userId);
  if (!result.ok) return NextResponse.json(result.data, { status: result.status });
  const res=  NextResponse.json(result.data);
  return setCorsHeaders(res)

}