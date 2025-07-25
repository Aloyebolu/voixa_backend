import {  NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { param } from "framer-motion/client";

export async function GET(request : NextResponse, {params} : {params: {id: string}}){
    connectDB()
    const id = params.id
    const data = await query(`SELECT *  FROM messages  WHERE id =  '${id}'`)
    console.log('This is the data: '+data+ ', conversationId: '+ id)
    return NextResponse.json(data)
}