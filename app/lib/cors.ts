// lib/cors.ts
import { NextResponse } from "next/server";

export function setCorsHeaders(res: NextResponse): NextResponse {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
