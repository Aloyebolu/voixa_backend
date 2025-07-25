import { connectDB,  query } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    connectDB();
    const id = params.id;
    try {
        const res = await query(`SELECT user_id FROM conversation_participants WHERE conversation_id = '${id}'`);
        return NextResponse.json(res);
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}