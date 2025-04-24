import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Ensure the DB is connected
        await connectDB();
        
        // Destructure params to get the ID
        const { id } = params;

        // Use parameterized queries for security
        const messagesArray = await query(`
            SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at
        `, [id]);  // Pass the `id` as a parameter to prevent SQL injection
            const participantsArray = await query(`SELECT user_id FROM conversation_participants WHERE conversation_id = $1`, [id]);
        // Convert array into an object with user.id as the key
        const messages = messagesArray.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, typeof messagesArray[number]>);

        // Prepare the response
        const participants: Record<string, { name: string; id: string }> = {};
        for (const i in participantsArray) {
            const participantId = participantsArray[i].user_id as string;
            const name = await query(`SELECT name from users where id = $1`, [participantsArray[i].user_id])
            participants[participantId] = { name: name[0].name, id: participantId };
        }
        const type = await query(`SELECT type from conversations where id = $1`, [id])
        const response = NextResponse.json({messages, participants, type: type[0].type});
        console.log(type[0])
        // Allow access from any origin (CORS handling)
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;
    } catch (error) {
        // Handle any errors and send a 500 error response
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}