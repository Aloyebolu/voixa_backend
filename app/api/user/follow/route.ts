import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key'; // Replace with the same key used in login

// Utility function to set CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

// Middleware to verify JWT
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(request.headers)
    return { valid: false, response: setCorsHeaders(NextResponse.json({ message: 'Unauthorized' }, { status: 401 })) };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return { valid: true, decoded };
  } catch (error) {
    console.log(error)
    return { valid: false, response: setCorsHeaders(NextResponse.json({ message: 'Invalid token' }, { status: 401 })) };
  }
}

// Handle POST
export async function POST(request: NextRequest) {
  connectDB();
  const { userId, followerId } = await request.json(); 

    // if (!userId || !followerId) {
    //   return NextResponse.json({ error: "Missing userId or followerId" }, { status: 400 });
    // }
    const check = await query(
      `SELECT * FROM followers WHERE user_id = '${followerId}' AND follower_id = '${userId}'`
    );
    if (check.length > 0) {
      const res = NextResponse.json(
        { error: "Already following" },
        { status: 400 }
      );
      return setCorsHeaders(res);
    } else if (check.length == 0) {
      const result = await query(
        `INSERT INTO followers (user_id, follower_id) VALUES ('${followerId}', '${userId}') RETURNING *`
      );
      const res = NextResponse.json(result[0]);
      return setCorsHeaders(res);
    }
  
}

// Handle OPTIONS (Preflight Request)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
// export async function DELETE(request: NextRequest) {
//   await connectDB();

//   try {
//     const { userId, followerId } = await request.json();

//     if (!userId || !followerId) {
//       return NextResponse.json({ error: "Missing userId or followerId" }, { status: 400 });
//     }

//     const result = await query(
//       `DELETE FROM followers WHERE user_id = '${userId}' AND follower_id = '${followerId}' RETURNING *`
//     );

//     return NextResponse.json(result[0], {
//       status: 200,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
//         "Access-Control-Allow-Headers": "Content-Type, Authorization",
//       },
//     });

//   } catch (error) {
//     console.error("Error deleting follower:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
// export async function GET(request: NextRequest) {
//     connectDB()
//     const { userId } = await request.json();
//     const data = await query(`SELECT * FROM followers WHERE user_id = '${userId}'`)
//     const ret = []
//     for(const i in data){
//         const results = await query(`
//             SELECT
//               badge_owners.*,
//               badges.name AS badge_name
//             FROM badge_owners
//             JOIN badges ON badge_owners.badge_id = badges.id
//             WHERE badge_owners.user_id = '${data[i].follower_id}'
//           `);
//         const badges = results.map(row => ({
//             badgeId: row.badge_id,
//             name: row.badge_name,
//             // owned_at: row.created_at, // or any other column you have
//         }));
//         const user = await query(`SELECT * FROM users WHERE id = '${data[i].follower_id}'`)
//         ret.push({
//             name: user[0].name,
//             country: user[0].country,
//