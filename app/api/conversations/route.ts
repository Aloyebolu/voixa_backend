import { NextResponse} from 'next/server';
import { connectDB, query, disconnectDB } from '../../lib/db';

export async function POST(request: NextResponse) {
    try {
        const { type, participants } = await request.json();

        if (!type || !['private', 'group'].includes(type) || !Array.isArray(participants) || participants.length === 0) {
            return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
        }

        await connectDB();

        // Create conversation
        const conversationResult = await query(
            `INSERT INTO conversations (type) VALUES ($1) RETURNING id`,
            [type]
        );
        console.log(conversationResult)
        const conversationId = conversationResult[0].id;

        // Insert participants
        const participantValues = participants.map(userId => `('${conversationId}', '${userId}', 'member')`).join(',');
        await query(`INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES ${participantValues}`);

        // await disconnectDB();

        return NextResponse.json({ conversationId, message: 'Conversation created successfully' }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}