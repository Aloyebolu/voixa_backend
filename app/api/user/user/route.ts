import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

export async function POST(request: NextRequest) {
  const viewerId = getUserIdFromRequest(request).userId;
  if (!viewerId) {
    console.log('No viewer id is found');
  }

  connectDB();
  const { fields, userId } = await request.json();
  console.log(fields, userId);

  const allowedFields = [
    "id",
    "name",
    "email",
    "country",
    "age",
    "gender",
    "created_at",
    "bio",
    "image_path", // Add this as a pseudo-field to detect it
  ];

  // Default to all allowed fields if none are specified
  const safeFields = (fields && fields.length > 0) 
    ? fields.filter((f: string) => allowedFields.includes(f)) 
    : allowedFields;

  // Check if image_path is requested
  const includeImage = safeFields.includes("image_path");

  // Remove it from actual field list since it's not in the users table
  const dbFields = safeFields.filter((f: string) => f !== "image_path");
  const fieldString = dbFields.map((f) => `"${f}"`).join(", ");
  console.log(fieldString);

  try {
    const userResult = await query(
      `SELECT ${fieldString} FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const user = userResult[0] || {};

    // Ensure id is equal to userId
    user.id = userId;

    // If image_path was requested, fetch it from user_images
    if (includeImage) {
      const imageResult = await query(
        `SELECT image_path FROM user_images WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );
      user.image_path = imageResult[0]?.image_path || null;
    }

    return setCorsHeaders(
      NextResponse.json({ viewerId, user })
    );
  } catch (error) {
    console.error("User fetch error:", error);
    return setCorsHeaders(
      NextResponse.json(
        { message: "Failed to fetch user data" },
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
