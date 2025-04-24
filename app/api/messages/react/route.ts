import { connectDB, query } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request:NextResponse){
    connectDB()
    const req = await request.json();
    const messageId = req[0]
    const reaction = req[1]
    const data = await query(`UPDATE messages SET reaction='${reaction}' WHERE id='${messageId}'`)
    return NextResponse.json(data)
}