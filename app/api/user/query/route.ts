import { NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getTopBadges, getUserBadges } from "@/app/lib/badges/badgeService";
import { getNameStyleFromBadges } from "@/app/lib/badges/badgeDisplay";

export async function GET() {
  connectDB();

  // Fetch all users
const users = await query(`
  SELECT 
    u.id, 
    u.name, 
    u.country, 
    u.gender, 
    u.bio,
    ui.image_path
  FROM 
    users u
  LEFT JOIN 
    user_images ui ON u.id = ui.user_id AND ui.is_active = true
`);

  // Process each user in parallel
const allUserIds = users.map(u => u.id);

// 🔁 Batch fetch all badges and top badges
const badgeMap = await getUserBadges(allUserIds);
const topBadgeMap = await getTopBadges(allUserIds); // same batching approach

const results = users.map(user => {
  const allBadges = badgeMap[user.id] || [];
  const topBadges = topBadgeMap[user.id] || [];

  return {
    id: user.id,
    name: user.name,
    country: user.country,
    gender: user.gender,
    description: user.bio,
    topBadges,
    name_style: getNameStyleFromBadges(allBadges),
    image_path: user.image_path
  };
});


console.log(results.find((i)=>i.id=='10000012'))
  // Create and return response with CORS headers
  const response = NextResponse.json(results);
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}
