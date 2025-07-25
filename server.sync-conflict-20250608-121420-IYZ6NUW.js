import { createServer } from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import dotenv from 'dotenv';
import { getRoomParticipant, getUser } from './app/utils/userUtils.js';
import { getUserIdFromSocket } from './app/utils/auth.js'; 
import { removeRoomParticipant, roomAction } from './app/utils/roomUtil.js';

dotenv.config();
const { Client } = pg;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const client = new Client({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'practice',
  password: process.env.POSTGRES_PASSWORD || 'Aloyebolu.123',
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

client.connect()
  .then(() => {
    console.log('🟢 Connected to PostgreSQL');

    client.query('LISTEN notify_change');

    client.on('notification', async (msg) => {
      console.log('🔔 New update from DB');

      const payload = JSON.parse(msg.payload);

      if (payload.data && payload.data.sender_id) {
        payload.data.sender_id = String(payload.data.sender_id);
      }

      if (payload.conversation_id) {
        const conversationId = payload.conversation_id;

        try {
          const result = await client.query(
            'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
            [conversationId]
          );

          const participantIds = result.rows.map(row => String(row.user_id));

          participantIds.forEach(userId => {
            const stringifyIds = (data) => {
              return {
                ...data,
                id: String(data.id),
                sender_id: String(data.sender_id),
                conversation_id: String(data.conversation_id),
                ...(data.reply !== null && { reply: String(data.reply) }),
              };
            };
            
            io.to(`${userId}`).emit('db_update', {
              ...payload,
              data: stringifyIds(payload.data),
            });
          });

          console.log(payload);
          console.log("hello world");

        } catch (err) {
          console.error('🔴 Error fetching conversation participants:', err);
        }
      } else if (payload.room_id) {
        io.to(`room_${payload.room_id}`).emit('db_update', payload);
        console.log('📡 Broadcasted to room:', payload.room_id);
      }
    });

  })
  .catch((err) => {
    console.error('🔴 PostgreSQL connection error:', err);
  });

io.on('connection', (socket) => {

  const {userId, token} = getUserIdFromSocket(socket);
socket.join(`${userId}`);
  if (!userId) {
    console.warn('⚠️ Missing user_id in connection query');
    socket.disconnect();
    return;
  }

  console.log(`🧑‍💻 Socket.io connected: user=${userId}`);

  // 🔁 Dynamic join for conversations
  socket.on('join_conversation', ({ conversationId }) => {
    
    console.log(`➡️ Joined conversation room: ${userId}_${conversationId}`);
  });

  // 🔁 Dynamic join for rooms
  socket.on('join_room', ({ roomId }) => {
    socket.join(`room_${roomId}`);
    console.log(`➡️ Joined public room: room_${roomId}`);
  });

  // 📴 Leave room events if needed
  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`${userId}_${conversationId}`);
    console.log(`⬅️ Left conversation room: ${userId}_${conversationId}`);
  });

  socket.on('leave_room', ({ roomId }) => {
    socket.leave(`room_${roomId}`);
    console.log(`⬅️ Left public room: room_${roomId}`);
  });

  // 📩 Handle messages
  socket.on('message', async (data) => {
    if (!data || typeof data.text !== 'string') {
      console.warn('⚠️ Invalid message payload:', data);
      return;
    }

    const message = {
      from: userId,
      text: data.text,
      conversation: data.conversationId || null,
      room_id: data.roomId || null,
      timestamp: new Date().toISOString()
    };

    if (data.conversationId) {
      socket.to(`${userId}_${data.conversationId}`).emit('new_message', message);

      try {
        const result = await client.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
          [data.conversationId]
        );

        const unreadInserts = result.rows
          .filter(row => row.user_id !== userId)
          .map(row => `('${row.user_id}', '${data.messageId}', '${data.conversationId}')`)
          .join(',');

        if (unreadInserts.length > 0) {
          await client.query(`
            INSERT INTO unread_messages (user_id, message_id, conversation_id)
            VALUES ${unreadInserts}
          `);
        }
      } catch (err) {
        console.error('❌ Error inserting unread messages:', err);
      }

    } else if (data.roomId) {
      socket.to(`room_${data.roomId}`).emit('new_message', message);
    }
  });

  // ✅ Mark messages as read
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      await client.query(
        'DELETE FROM unread_messages WHERE user_id = $1 AND conversation_id = $2',
        [userId, conversationId]
      );
      console.log(`✅ Marked all messages as read for user ${userId} in conversation ${conversationId}`);
    } catch (err) {
      console.error('❌ Error marking messages as read:', err);
    }
  });

  // 📨 Fetch unread messages for a conversation
  socket.on('get_unread_messages', async ({ conversationId }) => {
    try {
      const result = await client.query(
        `
        SELECT m.*
        FROM unread_messages u
        JOIN messages m ON m.id = u.message_id
        WHERE u.user_id = $1 AND u.conversation_id = $2
        ORDER BY m.created_at
        `,
        [userId, conversationId]
      );
    
      // Convert specific ID fields to string
      const formatted = result.rows.map(msg => ({
        ...msg,
        id: msg.id != null ? String(msg.id) : null,
        sender_id: msg.sender_id != null ? String(msg.sender_id) : null,
        conversation_id: msg.conversation_id != null ? String(msg.conversation_id) : null,
        reply: msg.reply != null ? String(msg.reply) : null,
      }));
    
      socket.emit('unread_messages', formatted);
      console.log(`📨 Sent ${formatted.length} unread messages to user ${userId} for conversation ${conversationId}`);
    } catch (err) {
      console.error('❌ Error fetching unread messages:', err);
    }
    
  });
  /**
   * @param {string} userId - The user id
   * 
   */
  socket.on('get_unread_conversations', async ({ userId }) => {
    try {
      const result = await client.query(
        `
        SELECT 
          conversation_id, 
          COUNT(*) AS unread_count 
        FROM unread_messages 
        WHERE user_id = $1 
        GROUP BY conversation_id
        `,
        [userId]
      );
  
      const formatted = result.rows.map(row => ({
        conversationId: row.conversation_id,
        unreadMessages: parseInt(row.unread_count, 10),
      }));
  
      socket.emit('unread_conversations', formatted);
      console.log(`📬 Sent unread count for ${formatted.length} conversations to user ${userId}`);
    } catch (err) {
      console.error('❌ Error fetching unread conversation counts:', err);
    }
  });

  /**
   * Sends data to all participants of a room, excluding specified users.
   * @param {string} roomId - The ID of the room.
   * @param {object} payload - The data to send.
   * @param {string[]} excludedUsers - Array of user IDs to exclude.
   * @param {string} type - The type of data being sent to the room
   */
  async function sendToRoom(status, roomId, payload, excludedUsers = [], type) {
    try {
      const result = await client.query(
        "SELECT user_id FROM room_roles WHERE room_id = $1 AND status = 'inside'",
        [roomId]
      );

      const participantIds = result.rows
        .map(row => String(row.user_id))
        .filter(userId => !excludedUsers.includes(userId));

      participantIds.forEach(userId => {
        if(status === 'error') {
          payload = { error: payload };
        }
        io.to(`${userId}`).emit('room_event', {payload, type, status});
      });

      console.log(`📤 Data sent to participants of room ${roomId} excluding ${excludedUsers.join(', ')} with type "${type}"`);
    } catch (err) {
      console.error('❌ Error fetching room participants:', err);
    }
  }

  /**
   * Sends data to a specific user.
   * @param {string} userId - The ID of the user.
   * @param {object} data - The data to send.
   * @param {string} type - The type of data being sent.
   */
  function sendToUser(status, userId, payload, type) {
    try {
      if(status === 'error') {
        payload = { error: payload };
      }
      io.to(`${userId}`).emit('room_event', { payload, type, status });
      console.log(`📤 Data sent to user ${userId} with type "${type}"`);
    } catch (err) {
      console.error(`❌ Error sending data to user ${userId}:`, err);
    }
  }

  socket.on('room_event', async ({ roomId, type, extra }) => {
    let payload;
    try {
      switch (type) {
        case 'entrance':
          payload = {userId}
          console.log("This is the participant", payload)
          await sendToRoom('success',roomId, payload, [userId], type);
          break;
        case 'message':
          payload = { roomId, senderId: userId, message: extra.message, type};
          await sendToRoom('success',roomId, payload, [], type); 
          break;
        case 'leave':
          await removeRoomParticipant(token, userId, roomId);
          payload = { roomId, senderId: userId };
          await sendToRoom('success',roomId, payload, [userId], type);
          break;
        case 'send_invite':
          const { targetId, permitToken } = extra;
          const res = await getRoomParticipant(token, targetId, ['position']);
          const {position: posit} = res.participant
          console.log(posit)
          if(posit> 0) {
            console.warn(`⚠️ User ${targetId} is already a speaker ${roomId}`);
            const error = { message: 'User is already a speaker' };
            sendToUser('error', userId, error , type );
            return;
          }
          sendToUser('success',targetId, { permitToken }, type);
          break;
        case 'set_as_speaker':
          const { targetId: speakerId, permitToken: speakerPermitToken } = extra; // Ensure permitToken is destructured
          console.log("Permit Token:", speakerPermitToken);
          const {position} = await roomAction(token, roomId, speakerId, 'set_as_speaker', {permitToken: speakerPermitToken});
          payload = { id: speakerId, position : String(position) };
          console.log(payload)
          await sendToRoom('success', roomId, payload, [], type);
          break;
        case 'set_as_viewer':
          const { targetId: viewerId } = extra; // Ensure targetId is destructured
          const viewerResult = await roomAction(token, roomId, viewerId, 'set_as_viewer', {});
          if (viewerResult.error) {
            sendToUser('error', userId, viewerResult.error, type);
            return;
          }
          payload = { id: viewerId, position: 0 };
          await sendToRoom('success', roomId, payload, [], type);
          break;
        case 'remove_from_host':
          const { targetId: targetIdToRemove } = extra;
          const removeResult = await roomAction(token, roomId, targetIdToRemove, 'remove_from_host', {});
          if (removeResult.error) {
            sendToUser('error', userId, removeResult.error, type);
            return;
          }
          payload = { id: targetIdToRemove, role: "participant" };
          await sendToRoom('success', roomId, payload, [], type);
          break;
        case 'set_as_host':
          const { targetId: hostId } = extra; // Ensure targetId is destructured
          const hostResult = await roomAction(token, roomId, hostId, type, {});
          if (hostResult.error) {
            sendToUser('error', userId, hostResult.error, type);
            return;
          }
          payload = { id: hostId, role: "host" };
          await sendToRoom('success', roomId, payload, [], type);
          break;
        default:
          console.warn(`⚠️ Unhandled room_event type: ${type}`); // Log a warning for unexpected cases
          break;
      }

    } catch (err) {
      console.error('❌ Error fetching user details:', err);
    }
  });
  socket.on('disconnect', () => {
      console.log(` ❌ Socket.io disconnected: user=${userId}`)
  })
  socket.on('ping-alive', async () => {
    console.log(`❤️ Ping received from user ${userId}`);

    try {
      await client.query(
        "UPDATE users SET last_seen = NOW() WHERE id = $1",
        [userId]
      );
    } catch (error) {
      console.error("❌ Failed to update last_seen:", error);
    }
  });
});

/**
 * Fetches all participants of a room.
 * @param {string} roomId - The ID of the room.
 * @returns {Promise<string[]>} - List of user IDs.
 */
async function getRoomParticipants(roomId) {
  try {
    const result = await client.query(
      'SELECT user_id FROM room_roles WHERE room_id = $1',
      [roomId]
    );
    return result.rows.map(row => String(row.user_id));
  } catch (err) {
    console.error('❌ Error fetching room participants:', err);
    return [];
  }
}

/**
 * Fetches all participants of a conversation.
 * @param {string} conversationId - The ID of the conversation.
 * @returns {Promise<string[]>} - List of user IDs.
 */
async function getConversationParticipants(conversationId) {
  try {
    const result = await client.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rows.map(row => String(row.user_id));
  } catch (err) {
    console.error('❌ Error fetching conversation participants:', err);
    return [];
  }
}

/**
 * Emits a specific event to a list of user IDs.
 * @param {string[]} userIds - List of user IDs.
 * @param {string} event - The event name.
 * @param {object} data - The data to emit.
 */
function emitToUsers(userIds, event, data) {
  userIds.forEach(userId => {
    io.to(`${userId}`).emit(event, data);
  });
  console.log(`📤 Event "${event}" sent to users:`, userIds);
}

/**
 * Formats message-related IDs to strings for consistency.
 * @param {object} message - The message object.
 * @returns {object} - The formatted message object.
 */
function formatMessageIds(message) {
  return {
    ...message,
    id: message.id != null ? String(message.id) : null,
    sender_id: message.sender_id != null ? String(message.sender_id) : null,
    conversation_id: message.conversation_id != null ? String(message.conversation_id) : null,
    reply: message.reply != null ? String(message.reply) : null,
  };
}

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server is running on http://localhost:${PORT}`);
});
