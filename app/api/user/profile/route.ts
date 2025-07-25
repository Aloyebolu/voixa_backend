import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";
import { getRedisClient } from "@/app/lib/redis/redis";
import { getUserBadges } from "@/app/lib/badges/badgeService";
import { getTopBadges } from "@/app/lib/badges/badgeService";
import { getNameStyleFromBadges } from "@/app/lib/badges/badgeDisplay";

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  const redis = await getRedisClient();
  connectDB();

  const viewerId = getUserIdFromRequest(request).userId;
  const isOwner = userId === viewerId;

  const cacheKey = isOwner
    ? `profile:owner:${userId}`
    : `profile:view:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);

      // Log profile view if viewer is not the owner
      if (!isOwner) {
        await query(`
          INSERT INTO profile_views (profile_owner_id, viewer_id, viewed_at)
          VALUES ($1, $2, NOW())
        `, [userId, viewerId]);

        parsed.profileViews += 1;
      }

      console.log("Profile -> Redis")
      return setCorsHeaders(NextResponse.json(parsed));
    }

    // Log view if viewer is not owner
      console.log("Profile -> DB")
    if (!isOwner) {
      await query(`
        INSERT INTO profile_views (profile_owner_id, viewer_id, viewed_at)
        VALUES ($1, $2, NOW())
      `, [userId, viewerId]);
    }

    const [userProfile] = await query(`
      SELECT 
        u.id, u.name, u.age, u.gender, u.bio, u.country,
        (SELECT image_path FROM user_images WHERE user_id = u.id AND is_active = true LIMIT 1) AS image_path,
        (SELECT COUNT(*) FROM followers WHERE user_id = u.id) AS followers,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following,
        (SELECT COUNT(*) FROM followers WHERE user_id = u.id AND follower_id = $2) AS followed,
        (SELECT COUNT(*) FROM profile_views WHERE profile_owner_id = u.id) AS profile_views
      FROM users u
      WHERE u.id = $1
    `, [userId, viewerId]);

    // 👇 Get badges from Redis/db
    const [allBadges, topBadges] = await Promise.all([
      getUserBadges(userId),
      getTopBadges(userId),
    ]);
    console.log(allBadges)
    const name_style = getNameStyleFromBadges(allBadges[userId]);
    // const name_style = 'vip'

    const reconstructedData = {
      id: userProfile?.id,
      name: userProfile?.name,
      age: userProfile?.age,
      gender: userProfile?.gender,
      bio: userProfile?.bio,
      country: userProfile?.country,
      imagePath: userProfile?.image_path || null,
      followers: parseInt(userProfile?.followers || 0),
      following: parseInt(userProfile?.following || 0),
      followed: parseInt(userProfile?.followed || 0) > 0,
      profileViews: parseInt(userProfile?.profile_views || 0),
      badges: topBadges[userProfile?.id],
      name_style,
    };
    console.log(reconstructedData)
    await redis.setEx(cacheKey, 30, JSON.stringify(reconstructedData));
    return setCorsHeaders(NextResponse.json(reconstructedData));
  } catch (error) {
    console.error("Error fetching user profile:", error);
    const res = NextResponse.json({ message: "Internal Server Error", status: 500 });
    return setCorsHeaders(res);
  }
}
