import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET_KEY // Replace with a strong, secure key

export function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-override");
  return response;
}

// export function verifyTokenWithSecret(token: string): { valid: boolean; decoded?: any; response?: NextResponse } {
//   try {
//     const decoded = jwt.verify(token, SECRET_KEY);
//     return { valid: true, decoded };
//   } catch (error) {
//     return {
//       valid: false,
//       response: setCorsHeaders(NextResponse.json({ message: "Invalid token" }, { status: 401 })),
//     };
//   }
// }

import { decodeToken } from '../utils/auth';
import { Interface } from "readline";

export function getUserIdFromRequest(request: NextRequest): { role: string | null; userId: string | null; response?: NextResponse } {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return {
      userId: null,
      response: setCorsHeaders(NextResponse.json({ error: "Unauthorized: Token missing" }, { status: 401 })),
    };
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return {
      userId: null,
      response: setCorsHeaders(NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })),
    };
  }

  const overrideUserId = request.headers.get("x-user-override");
  const serverOverride = request.headers.get("x-server-override");
  const effectiveUserId = overrideUserId ? (decoded.role === "admin" ? overrideUserId : 'server') : decoded.userId;

  if (overrideUserId && decoded.role === "admin") {
    console.log(`🔐 Admin override: ${decoded.userId} acting as ${overrideUserId}`);
  }

  return { userId: effectiveUserId, role: decoded.role};
}
