import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders} from "@/app/lib/utils";


export async function POST(request: NextRequest) {
    // Parse the request body to extract the last query time
    const { last_query_time, id } = await request.json(); // assuming you send this timestamp in the body of the GET request
    const user= getUserIdFromRequest(request);
    const userId = user.userId
    if (!userId) {
        console.error("Unauthorized: Invalid token");
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // Connect to the database
    await connectDB();
    // Ensure last_query_time matches the DB timestamp format (if it's not already in the correct format)
    const formattedLastQueryTime = last_query_time 
        ? `'${new Date(last_query_time).toISOString().replace('T', ' ').replace('Z', '')}'` 
        : null; // Convert to database-compatible format or null

    // Combined query to get conversations
    const data = await query(`
        SELECT DISTINCT u.name, c.*, cp.conversation_id, mlr.last_count
        FROM conversation_participants cp
        JOIN conversations c ON cp.conversation_id = c.id
        JOIN messages_last_read mlr ON cp.conversation_id = mlr.conversation_id AND mlr.user_id = cp.user_id
        JOIN users u ON u.id = cp.user_id
        WHERE cp.user_id = '${id}'
          AND (
            mlr.last_count != (
              SELECT COUNT(*) 
              FROM messages m
              WHERE m.conversation_id = cp.conversation_id
                AND m.created_at > mlr.last_updated
            )
            OR c.last_updated > ${formattedLastQueryTime}
          )
    `);

    // console.log(data);
    const ret = [];
    for (const i in data) {
        const type = await query(`
            SELECT type 
            FROM conversations 
            WHERE id = '${data[i].conversation_id}'
        `);
        // console.log(type);
        
        if (type[0]?.type === 'private') {
            const participant = await query(`
                SELECT user_id 
                FROM conversation_participants 
                WHERE user_id != '${id}' 
                AND conversation_id = '${data[i].conversation_id}'
            `);
            // console.log(participant);
            
            const participantName = await query(`
                SELECT name, id 
                FROM users 
                WHERE id = '${participant[0].user_id}'
            `);
            // console.log(participantName[0].id);

            const lastMessage = await query(`
                SELECT * 
                FROM messages 
                WHERE conversation_id = '${data[i].conversation_id}' 
                ORDER BY created_at DESC
            `);
            const unreadMessageCount = await query(`
                SELECT COUNT(*) AS unread_count
                FROM messages m
                LEFT JOIN messages_last_read mlr
                  ON m.conversation_id = mlr.conversation_id AND mlr.user_id = $1
                WHERE m.conversation_id = $2
                  AND (
                    mlr.last_updated IS NULL
                    OR m.created_at > mlr.last_updated
                  );
            `, [id, data[i].conversation_id]);
            await query('UPDATE messages_last_read SET last_count = $1 WHERE user_id = $2 AND conversation_id = $3', 
                [unreadMessageCount[0]?.unread_count || 0, id, data[i].conversation_id]);
            const imageResult = await query(
                    `SELECT image_path FROM user_images WHERE user_id = $1 AND is_active = true LIMIT 1`,
                    [userId]
                  );
             const imagePath = imageResult[0]?.image_path || null;
            ret.push({
                conversationId: data[i].conversation_id,
                name: participantName[0].name,
                imagePath,
                lastMessage: lastMessage[0]?.message,
                lastMessageTime: lastMessage[0]?.created_at,
                unreadMessages: unreadMessageCount[0]?.unread_count || 0,
            });
            // console.log('ds', ret);
        } else if (type[0]?.type === 'group') {
            const participant = await query(`
                SELECT name 
                FROM conversations 
                WHERE id = '${data[i].conversation_id}'
            `);
            ret.push({
                conversationId: data[i].conversation_id,
                name: participant[0].name
            });
        }
    }

    const response = NextResponse.json(ret);

    return setCorsHeaders(response);
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 200 });
    return setCorsHeaders(response);
}