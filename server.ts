import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { getRoomParticipant } from './app/utils/userUtils.js';
import { getUserIdFromSocket } from './app/utils/auth';
import { handleRoomAction } from './app/lib/rooms/actions';
import { getRedisClient } from './app/lib/redis/redis';
import { getRedisKeys } from './app/lib/rooms/joinRoom';
import { RoomActionType, RoomPayload, RoomType } from './types/room';
import { MessageActionType, MessageData } from './types/message';
import { sendMessage } from './app/lib/messages/sendMessage';
import { getRedisKey } from './app/lib/redis/redisKeys';
import { success } from 'zod';





dotenv.config();
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



io.on('connection', (socket) => {

  const { userId, token } = getUserIdFromSocket(socket);
  socket.join(`${userId}`);
  if (!userId) {
    console.warn('⚠️ Missing user_id in connection query');
    socket.disconnect();
    return;
  }

  console.log(`🧑‍💻 Socket.io connected: user=${userId}`);

  // 📩 Handle messages
  socket.on('convo_event', async ({conversationId, type, extra}: {conversationId : string, type : MessageActionType, extra : {messageData?  : MessageData, p? : string, targetId? : string}}) => {
    let payload;
    const targetId = extra?.targetId || undefined
    try {
      switch (type) {
        case 'send_message':
          await sendMessage({userId, extra})
          payload = {  }
          console.log("This is the participant", payload)
          await sendToConvo('success', conversationId, payload, [], type);
          break;
    default:
          console.warn(`⚠️ Unhandled convo_event type: ${type}`); // Log a warning for unexpected cases
          break;



      }

    } catch (err) {
      console.error('❌ Error:', err);
    }
  });

  /**
   * Sends data to all participants of a room, excluding specified users.
   * @param {string} roomId - The ID of the room.
   * @param {object} payload - The data to send.
   * @param {string[]} excludedUsers - Array of user IDs to exclude.
   * @param {string} type - The type of data being sent to the room
   */
  async function sendToRoom(status: string, roomId: string, payload: object, excludedUsers: string[] = [], type: string) {
    try {
      //   const result = await client.query(
      //     "SELECT user_id FROM room_roles WHERE room_id = $1 AND status = 'inside'",
      //     [roomId]
      //   );
      const rolesKey = getRedisKey('room', roomId, 'roles')
      const redis = await getRedisClient();
      const cachedResult = await redis.hGetAll(rolesKey);
      const participantIds = Object.keys(cachedResult)
        .filter(userId => !excludedUsers.includes(userId));

      participantIds.forEach(userId => {
        if (status === 'error') {
          payload = { error: payload };
        }
        io.to(`${userId}`).emit('room_event', { payload, type, status });
      });

      console.log(`📤 Data sent to participants of room ${roomId} excluding ${excludedUsers.join(', ')} with type "${type}"`);
    } catch (err) {
      console.error('❌ Error fetching room participants:', err);
    }
  }

    /**
   * Sends data to all participants of a room, excluding specified users.
   * @param {string} convoId - The ID of the room.
   * @param {object} payload - The data to send.
   * @param {string[]} excludedUsers - Array of user IDs to exclude.
   * @param {string} type - The type of data being sent to the room
   */
  async function sendToConvo(status: string, convoId: string, payload: object, excludedUsers: string[] = [], type: string) {
    try {
      //   const result = await client.query(
      //     "SELECT user_id FROM room_roles WHERE room_id = $1 AND status = 'inside'",
      //     [roomId]
      //   );
      const { rolesKey } = getRedisKeys(convoId)
      const redis = await getRedisClient();
      const cachedResult = await redis.hGetAll(rolesKey);
      const participantIds = Object.keys(cachedResult)
        .filter(userId => !excludedUsers.includes(userId));

      participantIds.forEach(userId => {
        if (status === 'error') {
          payload = { error: payload };
        }
        io.to(`${userId}`).emit('room_event', { payload, type, status });
      });

      console.log(`📤 Data sent to participants of room ${convoId} excluding ${excludedUsers.join(', ')} with type "${type}"`);
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
  function sendToUser(status: string, userId: string | undefined, payload: RoomPayload, type: string) {
    try {
      io.to(`${userId}`).emit('room_event', { payload, type, status });
      console.log(`📤 Data sent to user ${userId} with type "${type}"`);
    } catch (err) {
      console.error(`❌ Error sending data to user ${userId}:`, err);
    }
  }

  socket.on('room_event', async ({ roomId, type, extra }: { roomId: string, type: RoomActionType, extra: { voiceData?: any, permitToken?: string, targetId?: string, roomType?: RoomType, message?: string } }) => {
    let payload;
    const permitToken = extra?.permitToken
    const targetId = extra?.targetId || undefined
    const roomType = extra?.roomType
    let result;
    console.log("The target is", targetId, "for type", type, roomId)
    try {
      switch (type) {
        case 'entrance':
          payload = { userId }
          console.log("This is the participant", payload)
          await sendToRoom('success', roomId, payload, [], type);
          break;
        case 'message':
          payload = { roomId, senderId: userId, message: extra.message, type };
          console.log(roomId)
          await sendToRoom('success', roomId, payload, [], type);
          break;
        case 'leave':
          await handleRoomAction(token, roomId, type, { permitToken });
          payload = { roomId, senderId: userId };
          await sendToRoom('success', roomId, payload, [userId], type);
          break;



        // This is used to send an invite for another user to join the speakers in a room
        case 'send_invite':
          const res = await getRoomParticipant(token, targetId, ['position']);
          const { position: posit } = res.participant
          console.log(posit)
          if (posit > 0) {
            console.warn(`⚠️ User ${targetId} is already a speaker ${roomId}`);
            const error = { error: 'User is already a speaker' };
            sendToUser('error', userId, error, type);
            return;
          }
          sendToUser('success', targetId, { token: permitToken, id: userId }, type);
          break;




        // This is called to set a user as invite directly or after receiving an invite request
        case 'set_as_speaker':
          console.log("Permit Token:", permitToken);
          result = await handleRoomAction(token, roomId, type, { permitToken, targetId }) || {};
          const position: number = result.body.position || 1; // Default to position 1 if not provided
          payload = { id: targetId, position: String(position) };
          console.log(payload)
          await sendToRoom('success', roomId, payload, [], type);
          break;



        // To remove a user from the speakers level and set them as viewer
        case 'set_as_viewer':
          await handleRoomAction(token, roomId, type, { targetId });
          console.log(targetId)
          payload = { id: targetId, position: 0 };
          await sendToRoom('success', roomId, payload, [], type);
          break;


        // TO remove a user from hosts leaving them with no power to operate the room
        case 'remove_from_host':
          await handleRoomAction(token, roomId, type, { targetId });
          payload = { id: targetId, role: "participant" };
          await sendToRoom('success', roomId, payload, [], type);
          break;


        // Give a user the Host power to operate in the room
        case 'set_as_host':
          await handleRoomAction(token, roomId, type, { targetId });
          payload = { id: targetId, role: "host" };
          await sendToRoom('success', roomId, payload, [], type);
          break;


        // Ban the user from entering the room(Moderators only can operate this function)
        case 'remove_from_room':
          await handleRoomAction(token, roomId, type, { targetId })
          payload = { id: targetId };
          await sendToRoom('success', roomId, payload, [], type);
          break;

        // Disable/Enable sending of messages
        case 'toggle_messaging':
          const { body } = await handleRoomAction(token, roomId, type, {});
          payload = { status: body?.newStatus };
          await sendToRoom('success', roomId, payload, [], type)
          break;

        // Change room type
        case 'change_room_type':
          await handleRoomAction(token, roomId, type, { roomType });
          payload = { type: roomType };
          sendToRoom('success', roomId, payload, [], type);
          break;
        case 'follow_room_holder':
          payload = { id: userId }
          sendToRoom('success', roomId, payload, [], type);
          break;
        case 'send_request':
          payload = { id: userId, roomId };
          sendToRoom('success', roomId, payload, [], type);
          break;
        case 'toggle_mic':
          result = await handleRoomAction(token, roomId, type, { targetId });
          payload = { id: targetId, is_muted: result?.body.newStatus };
          await sendToRoom('success', roomId, payload, [], type)
          break;
        case 'receive_voice':
          const voiceData = extra?.voiceData
          // console.log(voiceData)
          payload = {voiceData}
          await sendToRoom('success', roomId, payload, [], type)
        default:
          console.warn(`⚠️ Unhandled room_event type: ${type}`); // Log a warning for unexpected cases
          break;



      }

    } catch (err) {
      console.error('❌ Error:', err);
    }
  });
  socket.on('disconnect', () => {
    console.log(` ❌ Socket.io disconnected: user=${userId}`)
  })


  socket.on('ping-alive', async () => {
    console.log(`❤️ Ping received from user ${userId}`);

    try {
      // await client.query(
      //   "UPDATE users SET last_seen = NOW() WHERE id = $1",
      //   [userId]
      // );
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
// async function getRoomParticipants(roomId: string): Promise<string[]> {
//   try {
//     const result = await client.query(
//       'SELECT user_id FROM room_roles WHERE room_id = $1',
//       [roomId]
//     );
//     return result.rows.map(row => String(row.user_id));
//   } catch (err) {
//     console.error('❌ Error fetching room participants:', err);
//     return [];
//   }
// }

/**
 * Fetches all participants of a conversation.
 * @param {string} conversationId - The ID of the conversation.
 * @returns {Promise<string[]>} - List of user IDs.
 */
// async function getConversationParticipants(conversationId: string): Promise<string[]> {
//   try {
//     const result = await client.query(
//       'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
//       [conversationId]
//     );
//     return result.rows.map(row => String(row.user_id));
//   } catch (err) {
//     console.error('❌ Error fetching conversation participants:', err);
//     return [];
//   }
// }

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

// const PORT = process.env.PORT || 3000;
// // const url = __NEXT_HTTP_AGENT
// httpServer.listen(PORT, () => {

//   console.log(`🚀 Socket.io server is running on http://localhost:${PORT}`);
// });
