import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";
import { createPermit } from "@/app/lib/permits/createPermit";

export async function POST(request: NextRequest) {
  const viewerId = getUserIdFromRequest(request).userId;
  if (!viewerId) {
    return setCorsHeaders(
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  const {  action, to, data} = await request.json();
  const expiresIn = '5m'
  try {
    const token = createPermit({
      action,
      by: viewerId,
      to,
      data,
      expiresIn,
    });

    return setCorsHeaders(
      NextResponse.json({ token }, { status: 200 })
    );
  } catch (error) {
    console.error("Permit creation error:", error);
    return setCorsHeaders(
      NextResponse.json(
        { message: "Failed to create permit", error: 'Failed to create permit' },
        { status: 500 }
      )
    );
  }
}
// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}