import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }){
    connectDB()
    const { id } = params;
    const data = await query(`SELECT *  FROM conversation_participants  WHERE user_id = '${id}'`)
    // const participant = await query(`SELECT *  from conversation_participants WHERE user_id != '${id}'`)
    // console.log(participant)
    console.log(data)
    // const ret = {
    //     conversationId: data[0].conversation_id,
    //     participantId: participant[0].user_id
    // }
    const ret = []
    for(const i in data){
        const type = await query(`SELECT type from conversations WHERE id = '${data[i].conversation_id}'`)
        console.log(type)
        if(type[0].type == 'private'){
            const participant = await query(`SELECT user_id from conversation_participants WHERE user_id != '${id}' and conversation_id = '${data[i].conversation_id}'`)
            console.log(participant)
            const participantName = await query(`SELECT name, id from users WHERE id = '${participant[0].user_id}'`)
            console.log(participantName[0].id)
            
            const lastMessage = await query(`SELECT * from messages where conversation_id='${data[i].conversation_id}' ORDER BY created_at DESC`)
           ret.push({
            conversationId: data[i].conversation_id,
            name: participantName[0].name,
            imageURL : `http://192.168.214.184:3000/api/image/${participantName[0].id}`,
            lastMessage : lastMessage[0]?.message
        }) 
        }else if(type[0].type== 'group'){
            const participant = await query(`SELECT name from conversations WHERE id != '${data[i].conversation_id}'`)
           ret.push({
            conversationId: data[i].conversation_id,
            name: participant[0].name
           })
        }
        
    }
    const response =  NextResponse.json(ret)
    response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
console.log(`localhost:3000/api/image/${id}`)
        return response;
}