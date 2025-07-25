import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

export async function POST(request: NextRequest) {
    try {
        const { last_query_time, id, limit = 20, offset = 0 } = await request.json();
        const user = getUserIdFromRequest(request);
        const userId = user?.userId;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
        }

        await connectDB();

        const formattedLastQueryTime = last_query_time
            ? new Date(last_query_time).toISOString().replace('T', ' ').replace('Z', '')
            : null;

        // ✅ 1. Fetch PRIVATE conversations in one efficient query
        const privateConversations = await query(`
            SELECT 
                c.id AS conversation_id,
                u.id AS participant_id,
                u.name AS participant_name,
                img.image_path,
                m.message AS last_message,
                m.created_at AS last_message_time,
                mlr.last_updated,
                (
                    SELECT COUNT(*) 
                    FROM messages m2
                    WHERE m2.conversation_id = c.id 
                      AND (mlr.last_updated IS NULL OR m2.created_at > mlr.last_updated)
                ) AS unread_count
            FROM conversation_participants cp
            JOIN conversations c ON cp.conversation_id = c.id
            JOIN conversation_participants cp2 
                ON cp2.conversation_id = cp.conversation_id AND cp2.user_id != cp.user_id
            JOIN users u ON u.id = cp2.user_id
            LEFT JOIN user_images img ON img.user_id = u.id AND img.is_active = TRUE
            LEFT JOIN messages_last_read mlr ON mlr.conversation_id = c.id AND mlr.user_id = cp.user_id
            LEFT JOIN LATERAL (
                SELECT message, created_at 
                FROM messages 
                WHERE conversation_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) m ON TRUE
            WHERE cp.user_id = $1
              AND c.type = 'private'
              ${formattedLastQueryTime ? `AND c.last_updated > $2` : ''}
            ORDER BY c.last_updated DESC
            LIMIT ${formattedLastQueryTime ? `$3` : '$2'} OFFSET ${formattedLastQueryTime ? `$4` : '$3'}
        `, formattedLastQueryTime ? [userId, formattedLastQueryTime, limit, offset] : [userId, limit, offset]);

        // ✅ 2. Fetch GROUP conversations
        // const groupConversations = await query(`
        //     SELECT 
        //         c.id AS conversation_id,
        //         c.name AS group_name,
        //         m.message AS last_message,
        //         m.created_at AS last_message_time,
        //         mlr.last_updated,
        //         (
        //             SELECT COUNT(*) 
        //             FROM messages m2
        //             WHERE m2.conversation_id = c.id 
        //               AND (mlr.last_updated IS NULL OR m2.created_at > mlr.last_updated)
        //         ) AS unread_count
        //     FROM conversation_participants cp
        //     JOIN conversations c ON cp.conversation_id = c.id
        //     LEFT JOIN messages_last_read mlr ON mlr.conversation_id = c.id AND mlr.user_id = cp.user_id
        //     LEFT JOIN LATERAL (
        //         SELECT message, created_at 
        //         FROM messages 
        //         WHERE conversation_id = c.id 
        //         ORDER BY created_at DESC 
        //         LIMIT 1
        //     ) m ON TRUE
        //     WHERE cp.user_id = $1
        //       AND c.type = 'group'
        //       ${formattedLastQueryTime ? `AND c.last_updated > $2` : ''}
        //     ORDER BY c.last_updated DESC
        //     LIMIT $3 OFFSET $4
        // `, formattedLastQueryTime ? [userId, formattedLastQueryTime, limit, offset] : [userId, limit, offset]);

        // ✅ 3. Bulk update unread counts for all conversations
        await query(`
            UPDATE messages_last_read
            SET last_count = sub.unread_count
            FROM (
                SELECT 
                    mlr.conversation_id,
                    COUNT(m.*) AS unread_count
                FROM messages_last_read mlr
                LEFT JOIN messages m ON m.conversation_id = mlr.conversation_id
                WHERE mlr.user_id = $1
                  AND (mlr.last_updated IS NULL OR m.created_at > mlr.last_updated)
                GROUP BY mlr.conversation_id
            ) sub
            WHERE messages_last_read.user_id = $1
              AND messages_last_read.conversation_id = sub.conversation_id
        `, [id]);

        // ✅ 4. Format response data
        const formattedPrivate = privateConversations.map(convo => ({
            conversationId: convo.conversation_id,
            name: convo.participant_name,
            imagePath: convo.image_path,
            lastMessage: convo.last_message,
            lastMessageTime: convo.last_message_time,
            unreadMessages: convo.unread_count
        }));

        // const formattedGroup = groupConversations.map(convo => ({
        //     conversationId: convo.conversation_id,
        //     name: convo.group_name,
        //     imagePath: null,
        //     lastMessage: convo.last_message,
        //     lastMessageTime: convo.last_message_time,
        //     unreadMessages: convo.unread_count
        // }));

        // ✅ 5. Merge & return
        const result = [...formattedPrivate].sort((a, b) =>
            new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
        console.log(result)

        return setCorsHeaders(NextResponse.json(result));
    } catch (err) {
        console.error("Conversation Fetch Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS() {
    return setCorsHeaders(new NextResponse(null, { status: 200 }));
}
