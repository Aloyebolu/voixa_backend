import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { setCorsHeaders, getUserIdFromRequest } from "@/app/lib/utils";
import { getRedisClient } from "@/app/lib/redis/redis";

export async function POST(request: NextRequest) {
    const MESSAGES_NO = 20;

    try {
        const redis = await getRedisClient()
        const { id: conversationId, page } = await request.json();

        await connectDB();
        const user = getUserIdFromRequest(request);
        const userId = user.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const offset = (page - 1) * MESSAGES_NO;

        // Redis fetch first
        const redisKey = `convo:${conversationId}`;
        const redisLength = await redis.lLen(redisKey);
        const redisStart = Math.max(0, redisLength - offset - MESSAGES_NO);
        const redisEnd = redisLength - offset - 1;
        const redisMessagesRaw = redisStart <= redisEnd
            ? await redis.lRange(redisKey, redisStart, redisEnd)
            : [];

        const redisMessages = redisMessagesRaw.map((msg) => JSON.parse(msg));
        const redisCount = redisMessages.length;

        // DB Fetch if needed
        let dbMessages = [];
        if (redisCount < MESSAGES_NO) {
            console.log(redisCount)
            const dbOffset = Math.max(0, offset - redisLength);
            const dbLimit = MESSAGES_NO - redisCount;
            dbMessages = await query(
                `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
                [conversationId, dbLimit, dbOffset]
            );
        }

        const messagesArray = [...redisMessages, ...dbMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Participants
        const participantsResult = await query(`
            SELECT u.id, u.name, i.image_path 
            FROM conversation_participants cp
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN user_images i ON i.user_id = u.id AND i.is_active = true
            WHERE cp.conversation_id = $1
        `, [conversationId]);

        const participants : { [key: string]: { id: string; name: string; imagePath: string | null; } } = {};
        participantsResult.forEach(user => {
            participants[user.id] = {
                id: user.id,
                name: user.name,
                imagePath: user.image_path || null
            };
        });

        // Conversation type
        const typeResult = await query(
            `SELECT type FROM conversations WHERE id = $1`,
            [conversationId]
        );

        // Update last read time
        const time = new Date().toISOString();
        await query(`
            INSERT INTO messages_last_read (user_id, conversation_id, last_updated)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, conversation_id)
            DO UPDATE SET last_updated = EXCLUDED.last_updated;
        `, [userId, conversationId, time]);

        const response = NextResponse.json({
            messages: messagesArray,
            participants,
            type: typeResult[0]?.type ?? 'Unknown'
        });

        return setCorsHeaders(response);

    } catch (error) {
        console.error('Error fetching messages:', error);
        return setCorsHeaders(NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return setCorsHeaders(new NextResponse(null, { status: 200 }));
}
