import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

import {
  getTopBadges,
  getBadgesForUser,
} from "@/app/lib/badges/badgeService";
import {
  getNameStyleFromBadges,
  getBubbleStyleFromBadges,
  // getRoomEntranceStyleFromBadges,
} from "@/app/lib/badges/badgeDisplay";

export async function POST(request: NextRequest) {
  const viewerId = getUserIdFromRequest(request);
  const { fields, userId } = await request.json();

  if (!viewerId) {
    return setCorsHeaders(
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  connectDB();

  const allowedFields = [
    "id",
    "name",
    "role",
    "raised_hand",
    "is_muted",
    "status",
    "position",
    "image_path", // handled separately
    "country",

    // 🔥 new computed fields
    "top_badges",
    "name_style",
    "bubble_style",
    "entrance_style"
  ];

  const safeFields =
    fields && fields.length > 0
      ? fields.filter((f: string) => allowedFields.includes(f))
      : allowedFields;

  const includeImage = safeFields.includes("image_path");

  // 💥 Handle custom computed fields
  const includeTopBadges = safeFields.includes("top_badges");
  const includeNameStyle = safeFields.includes("name_style");
  const includeBubbleStyle = safeFields.includes("bubble_style");
  const includeEntranceStyle = safeFields.includes("entrance_style");

  const dbFields = safeFields.filter(
    (f: string) =>
      !["image_path", "top_badges", "name_style", "bubble_style", "entrance_style"].includes(f)
  );

  const fieldString = dbFields
    .map((f : string) =>
      f === "name" || f === "country" ? `u."${f}"` : `r."${f}"`
    )
    .join(", ");

  try {
    const participantResult = await query(
      `
      SELECT ${fieldString}
      FROM room_roles r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    const participant = participantResult[0] || {};
    participant.id = userId;

    // ✅ Image path
    if (includeImage) {
      const imageResult = await query(
        `SELECT image_path FROM user_images WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );
      participant.image_path = imageResult[0]?.image_path || null;
    }

    // ✅ Badge fields
    if (includeTopBadges || includeNameStyle || includeBubbleStyle || includeEntranceStyle) {
      const [badges, topBadges] = await Promise.all([
        getBadgesForUser(userId),
        includeTopBadges ? getTopBadges(userId) : Promise.resolve({}),
      ]);

      if (includeTopBadges) {
        participant.top_badges = topBadges[userId] || [];
      }

      if (includeNameStyle) {
        participant.name_style = getNameStyleFromBadges(badges);
      }

      if (includeBubbleStyle) {
        participant.bubble_style = getBubbleStyleFromBadges(badges);
      }

      if (includeEntranceStyle) {
        // participant.entrance_style = getRoomEntranceStyleFromBadges(badges);
        participant.entrance_style = 'hello'

      }
    }

    return setCorsHeaders(
      NextResponse.json({ participant }, { status: 200 })
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

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}
