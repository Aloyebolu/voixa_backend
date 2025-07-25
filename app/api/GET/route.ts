import {  NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import {  setCorsHeaders } from "@/app/lib/utils";

export async function GET() {
    console.log("Connecting DB")
  await connectDB();
  

 const result = await query("SELECT * from users ")
 console.log(result)
 return NextResponse.json(result)
}


// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}