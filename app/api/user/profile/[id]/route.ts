import { NextResponse, NextRequest } from "next/server";
import { connectDB, query } from "@/app/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    connectDB()
    const id =  params.id;
    const data = await query(`SELECT id, name, age, gender, description, FROM users WHERE id = '${id}'`)
    const followers = await query(`SELECT COUNT(*) as followers FROM followers WHERE following_id = '${id}'`)
    const following = await query(`SELECT COUNT(*) as following FROM followers WHERE follower_id = '${id}'`)
    const badges = await query(`SELECT * FROM badges WHERE user_id = '${id}'`)
    const reconstructedData = {
        followers,
        following,
        ...data[0],
        badges,
    }
    return NextResponse.json(reconstructedData)
} 
