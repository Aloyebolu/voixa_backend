import { createServer } from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import dotenv from 'dotenv';
import { getRoomParticipant} from './app/utils/userUtils.js';
import { getUserIdFromSocket } from './app/utils/auth'; 
import { handleRoomAction} from './app/lib/rooms/actions';
import { getRedisClient } from './app/lib/redis';
import { getRedisKeys } from './app/lib/rooms/joinRoom';
import { RoomActionType, RoomPayload, RoomType } from './types/room';





dotenv.config();
const { Client } = pg;

const httpServer = createServer();
declare module 'pg' {
  interface ClientBase {
    on(event: 'notification', listener: (msg: { payload: string }) => void): this;
  }
}
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const client = new Client({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'voixa',
  password: process.env.POSTGRES_PASSWORD || '1',
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

// redis = await getRedisClient()
client.connect()
.then(() => {
  console.log('🟢 Connected to PostgreSQL');
  
  client.query('LISTEN notify_change');
  
  client.on('notification', async (msg : {payload : string}) => {
    console.log('🔔 New update from DB');
    
    const payload= JSON.parse(msg.payload);
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
            const stringifyIds = (data : {id: string, sender_id: string, conversation_id: string, reply: string}) => {
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

  const {userId, token}= getUserIdFromSocket(socket);
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
  async function sendToRoom(status : string, roomId: string, payload: object, excludedUsers: string[] = [], type: string) {
    try {
    //   const result = await client.query(
    //     "SELECT user_id FROM room_roles WHERE room_id = $1 AND status = 'inside'",
    //     [roomId]
    //   );
      const {rolesKey} = getRedisKeys(roomId)
      const redis = await getRedisClient();
      const cachedResult = await redis.hGetAll(rolesKey);
      const participantIds = Object.keys(cachedResult)
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
  function sendToUser(status : string, userId: string | undefined, payload : RoomPayload, type: string) {
    try {
      io.to(`${userId}`).emit('room_event', { payload, type, status });
      console.log(`📤 Data sent to user ${userId} with type "${type}"`);
    } catch (err) {
      console.error(`❌ Error sending data to user ${userId}:`, err);
    }
  }

  socket.on('room_event', async ({ roomId, type , extra }: {roomId : string, type : RoomActionType, extra : {permitToken? : string, targetId ? : string, roomType? : RoomType, message? : string}}) => {
    let payload;
    const permitToken = extra?.permitToken
    const targetId = extra.targetId
    const roomType = extra?.roomType 
    console.log("The target is",targetId, "for type", type)
    try {
      switch (type) {
        case 'entrance':
          payload = {userId}
          console.log("This is the participant", payload) 
          await sendToRoom('success',roomId, payload, [], type);
          break;
        case 'message':
          payload = { roomId, senderId: userId, message: extra.message, type};
          console.log(roomId)
          await sendToRoom('success',roomId, payload, [], type); 
          break;
        case 'leave':
          await handleRoomAction(token, roomId, type, {permitToken} );
          payload = { roomId, senderId: userId };
          await sendToRoom('success',roomId, payload, [userId], type);
          break;
        


        // This is used to send an invite for another user to join the speakers in a room
        case 'send_invite':
          const res = await getRoomParticipant(token, targetId, ['position']);
          const {position: posit} = res.participant
          console.log(posit)
          if(posit> 0) {
            console.warn(`⚠️ User ${targetId} is already a speaker ${roomId}`);
            const error = { error: 'User is already a speaker' };
            sendToUser('error', userId, error , type );
            return;
          }
          sendToUser('success',targetId, { token: permitToken, id: userId }, type);
          break;




        // This is called to set a user as invite directly or after receiving an invite request
        case 'set_as_speaker':
          console.log("Permit Token:", permitToken);
          const result = await handleRoomAction(token, roomId, type, {permitToken, targetId}) || {};
          const position : number= result.body.position || 1; // Default to position 1 if not provided
          payload = { id: targetId, position : String(position) };
          console.log(payload)
          await sendToRoom('success', roomId, payload, [], type);
          break;

        

        // To remove a user from the speakers level and set them as viewer
        case 'set_as_viewer':
          await handleRoomAction(token, roomId,type, {targetId});
          console.log(targetId)
          payload = { id: targetId, position: 0 };
          await sendToRoom('success', roomId, payload, [], type);
          break;


        // TO remove a user from hosts leaving them with no power to operate the room
        case 'remove_from_host':
          await handleRoomAction(token, roomId, type, {targetId});
          payload = { id: targetId, role: "participant" };
          await sendToRoom('success', roomId, payload, [], type);
          break;


        // Give a user the Host power to operate in the room
        case 'set_as_host':
          await handleRoomAction(token, roomId, type, {targetId});
          payload = { id: targetId, role: "host" };
          await sendToRoom('success', roomId, payload, [], type);
          break;
        

        // Ban the user from entering the room(Moderators only can operate this function)
        case 'remove_from_room':
          await handleRoomAction(token, roomId,  type, {targetId})
          payload = {id: targetId};
          await sendToRoom('success', roomId, payload, [], type);
          break;

        // Disable/Enable sending of messages
        case 'toggle_messaging':
          await handleRoomAction(token, roomId, type, {});
          payload = {};
          await sendToRoom('success', roomId, payload, [], type)
          break;
        
        // Change room type
        case 'change_room_type':
          await handleRoomAction(token, roomId, type, {roomType});
          payload = { roomType };
          sendToRoom('success', roomId, payload, [], type);
          break;
        case 'follow_room_holder':
          payload = {id: userId}
          sendToRoom('success', roomId, payload, [], type);
          break;
        case 'send_request':
          payload = {id: userId, roomId};
          sendToRoom('success', roomId, payload, [], type);
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
async function getRoomParticipants(roomId: string): Promise<string[]> {
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
async function getConversationParticipants(conversationId: string): Promise<string[]> {
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
function emitToUsers(userIds: string[], event: string, data: object) {
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
// function formatMessageIds(message: object): object {
//   return {
//     ...message,
//     id: message.id != null ? String(message.id) : null,
//     sender_id: message.sender_id != null ? String(message.sender_id) : null,
//     conversation_id: message.conversation_id != null ? String(message.conversation_id) : null,
//     reply: message.reply != null ? String(message.reply) : null,
//   };
// }

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server is running on http://localhost:${PORT}`);
});
