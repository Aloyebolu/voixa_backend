import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "../../lib/db";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { participants } = await request.json();

    // ✅ Validate input
    if (!Array.isArray(participants) || participants.length < 2) {
      return setCorsHeaders(
        NextResponse.json({code: 'E_TOO_FEW', message: 'At least 2 participants required' }, { status: 400 })
      );
    }

    // ✅ Check for duplicate userIds
    const userIds = participants.map((p) => p.userId);
    const uniqueIds = new Set(userIds);
    if (uniqueIds.size !== userIds.length) {
      return setCorsHeaders(
        NextResponse.json({code: 'E_DUPLICATE', message: 'Duplicate participant found' }, { status: 400 })
      );
    }

    const type = participants.length > 2 ? "group" : "private";

    await connectDB();

    // 🔍 Check if a private conversation already exists
    if (type === "private") {
      const [user1, user2] = participants.map((p) => p.userId);

      const existing = await query(
        `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.type = 'private'
          AND cp.user_id IN ($1, $2)
        GROUP BY c.id
        HAVING COUNT(DISTINCT cp.user_id) = 2
      `,
        [user1, user2]
      );

      if (existing.length > 0) {
        return setCorsHeaders(
          NextResponse.json(
            {
              conversationId: existing[0].id,
              type,
              message: "Existing private conversation found",
            },
            { status: 200 }
          )
        );
      }
    }

    // ➕ Create new conversation
    const conversationResult = await query(
      `INSERT INTO conversations (type) VALUES ($1) RETURNING id`,
      [type]
    );

    const conversationId = conversationResult[0].id;

    const participantQueries = participants.map(({ userId, role }) =>
      query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES ($1, $2, $3)`,
        [conversationId, userId, role || "member"]
      )
    );

    await Promise.all(participantQueries);

    return setCorsHeaders(
      NextResponse.json(
        {
          conversationId,
          type,
          message: "Conversation created successfully",
        },
        { status: 201 }
      )
    );
  } catch (error) {
    console.error("Error creating conversation:", error);
    return setCorsHeaders(
      NextResponse.json({ message: "Server error" }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}
