// import { getRedisClient } from "../redis/redis";
// import { BatchProcessor } from "../batchProcessor";
// import { ERROR_CODES } from "../../utils/errorCodes";
// import { connectDB, query } from "../db";
// import { RoomData, UserRoleData } from "../../../types";

// // ── Types ────────────────────────────────────────────────────────────


// interface JoinRoomResult {
//   ok?: boolean;
//   data?: any;
//   status?: number
// } 

// // ── Redis key helpers ────────────────────────────────────────────────
// const REDIS_ROOM_PREFIX = "room";
// const REDIS_ROLES_PREFIX = "roles";

// export const getRedisKeys = (roomId: string) => ({
//   roomKey: `${REDIS_ROOM_PREFIX}:${roomId}`,
//   rolesKey: `${REDIS_ROOM_PREFIX}:${roomId}:${REDIS_ROLES_PREFIX}`,
// });

// // ── Database Functions ───────────────────────────────────────────────
// async function getRoomFromDB(roomId: string): Promise<RoomData | null> {
//   const queryText = `
//     SELECT 
//       r.*, 
//       ui.image_path AS holder_image_path,
//       ui.user_id AS holder_id,
//       (SELECT COUNT(*) FROM room_roles WHERE room_id = r.id AND status = 'inside') AS participant_count
//     FROM rooms r
//     LEFT JOIN user_images ui ON ui.user_id = 
//       (SELECT user_id FROM room_roles WHERE role='holder' AND room_id = r.id)
//       AND ui.is_active = true
//     WHERE r.id = $1
//   `;
//   const result = await query(queryText, [roomId]);
//   return result.length > 0 ? result[0] : null;
// }

// async function getSpeakersFromDB(roomId: string): Promise<UserRoleData[]> {
//   const queryText = `
//     SELECT 
//       u.id, u.name, u.country, 
//       rr.position, rr.role, rr.raised_hand, rr.is_muted, 
//       ui.image_path
//     FROM room_roles rr
//     JOIN users u ON rr.user_id = u.id
//     LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
//     WHERE rr.room_id = $1 AND rr.position > 0
//   `;
//   const result = await query(queryText, [roomId]);
//   return result;
// }

// export async function getUserRoleFromDB(roomId: string, userId: string): Promise<UserRoleData | null> {
//   const queryText = `
//     SELECT 
//       u.id, u.name, u.country, 
//       rr.position, rr.role, rr.raised_hand, rr.is_muted, 
//       ui.image_path
//     FROM room_roles rr
//     JOIN users u ON rr.user_id = u.id
//     LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
//     WHERE rr.room_id = $1 AND rr.user_id = $2
//   `;
//   const result = await query(queryText, [roomId, userId]);
//   return result.length > 0 ? result[0] : null;
// }

// async function getProfileFromDB(userId: string): Promise<Partial<UserRoleData> | null> {
//   const queryText = `
//     SELECT 
//       u.name, u.country, 
//       ui.image_path
//     FROM users u
//     LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
//     WHERE u.id = $1
//   `;
//   const result = await query(queryText, [userId]);
//   return result.length > 0 ? result[0] : null;
// }

// // ── Main Join Room Function ───────────────────────────────────────────
// export async function joinRoom(roomId: string, userId: string): Promise<JoinRoomResult> {
// //   await query(""); // Initialize DB pool
// const redis = await getRedisClient();
// const bp = await BatchProcessor.getInstance();
// const { roomKey, rolesKey } = getRedisKeys(roomId);

// try {
//       connectDB()
//     // 1. Load Room
//     let room: RoomData | null = await redis.hGetAll(roomKey);
//     if (!room || Object.keys(room).length === 0) {
//       room = await getRoomFromDB(roomId);
//       if (!room) return { ok: false, status: 404, data: { error: "Room not found" } };

//       await redis.hSet(roomKey, Object.fromEntries(
//         Object.entries(room).map(([k, v]) => [k, String(v)])
//       ));
//       const speakers = await getSpeakersFromDB(roomId);
//       for (const speaker of speakers) {
//         await redis.hSet(rolesKey, speaker.id, JSON.stringify(speaker));
//       }
//     }

//     // 2. Load User Role
//     let role: UserRoleData | null = null;
//     const cachedRole = await redis.hGet(rolesKey, userId);
//     if (cachedRole) {
//       role = JSON.parse(cachedRole);
//     } else {
//       role = await getUserRoleFromDB(roomId, userId);
//       if (role) await redis.hSet(rolesKey, userId, JSON.stringify(role));
//     }

//     // 3. Check Bans
//     if (role?.status === "removed") {
//       return { ok: false, status: 403, data: ERROR_CODES.ROOM_BANNED };
//     }

//     // 4. Check Capacity
//     const { participant_count, max_participants } = await query(
//       `SELECT 
//         (SELECT COUNT(*) FROM room_roles WHERE room_id = $1 AND status = 'inside') AS participant_count,
//         max_participants
//       FROM rooms WHERE id = $1`,
//       [roomId]
//     ).then(res => res[0]);

//     if (participant_count >= max_participants) {
//       return { ok: false, status: 403, data: ERROR_CODES.ROOM_FULL };
//     }

//     // 5. Insert or Update Role
//     if (role) {
//       if (["holder", "host"].includes(role.role || '')) {
//         await query(
//           `UPDATE room_roles SET status = 'inside' WHERE user_id = $1 AND room_id = $2`,
//           [userId, roomId]
//         );
//       }

//       role.status = "inside";
//       await redis.hSet(rolesKey, userId, JSON.stringify(role));

//       await bp.addToQueue({
//         operation: "update",
//         entity: "room_roles",
//         data: { status: "inside" },
//         condition: { user_id: userId, room_id: roomId },
//         dedupeKey: `room_join:${userId}:${roomId}`
//       }, true);
//     } else {
//       const profile = await getProfileFromDB(userId);
//       if (!profile) return { ok: false, status: 404, data: { error: "User not found" } };
      
//       role = { id: userId, status: "inside", ...profile };

//       await redis.hSet(rolesKey, userId, JSON.stringify(role));

//       await bp.addToQueue({
//         operation: "insert",
//         entity: "room_roles",
//         data: {
//           user_id: userId,
//           room_id: roomId,
//           role: "listener",
//           status: "inside",
//           position: '0'
//         }
//       });
//     }

//     // 6. Get All Participants
//     const participants = await redis.hGetAll(rolesKey);
//     const activeParticipants = Object.values(participants)
//       .map((p: any) => JSON.parse(p))
//       .filter(p => ["holder", "host"].includes(p.role ?? '') || p.id === userId);

//     // 7. Response
//     console.log(activeParticipants)
//     return { ok: true, data: { ...room, participants: activeParticipants } };
//   } catch (error) {
//     console.error("joinRoom error:", error);
//     return { ok: false, status: 500, data: { error: "Internal server error" } };
//   }
// }
import { getRedisClient } from "../redis/redis";
import { BatchProcessor } from "../batchProcessor";
import { ERROR_CODES } from "../../utils/errorCodes";
import { connectDB, query } from "../db";
import { RoomData, UserRoleData } from "../../../types";
import { getUserBadges, getTopBadges } from "../badges/badgeService";
import { getNameStyleFromBadges } from "../badges/badgeDisplay";
import { getRedisKey } from "../redis/redisKeys";

interface JoinRoomResult {
  ok?: boolean;
  data?: any;
  status?: number;
}

const REDIS_ROOM_PREFIX = "room";
const REDIS_ROLES_PREFIX = "roles";

export const getRedisKeys = (roomId: string) => ({
  roomKey: `${REDIS_ROOM_PREFIX}:${roomId}`,
  rolesKey: `${REDIS_ROOM_PREFIX}:${roomId}:${REDIS_ROLES_PREFIX}`,
});

async function getRoomFromDB(roomId: string): Promise<RoomData | null> {
  const queryText = `
    SELECT 
      r.*, 
      ui.image_path AS holder_image_path,
      ui.user_id AS holder_id,
      (SELECT COUNT(*) FROM room_roles WHERE room_id = r.id AND status = 'inside') AS participant_count
    FROM rooms r
    LEFT JOIN user_images ui ON ui.user_id = 
      (SELECT user_id FROM room_roles WHERE role='holder' AND room_id = r.id)
      AND ui.is_active = true
    WHERE r.id = $1
  `;
  const result = await query(queryText, [roomId]);
  return result.length > 0 ? result[0] : null;
}

async function getSpeakersFromDB(roomId: string): Promise<UserRoleData[]> {
  const queryText = `
    SELECT 
      u.id, u.name, u.country, 
      rr.position, rr.role, rr.raised_hand, rr.is_muted, 
      ui.image_path
    FROM room_roles rr
    JOIN users u ON rr.user_id = u.id
    LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
    WHERE rr.room_id = $1 AND rr.position > 0
  `;
  const result = await query(queryText, [roomId]);
  return result;
}

export async function getUserRoleFromDB(roomId: string, userId: string): Promise<UserRoleData | null> {
  const queryText = `
    SELECT 
      u.id, u.name, u.country, 
      rr.position, rr.role, rr.raised_hand, rr.is_muted, 
      ui.image_path
    FROM room_roles rr
    JOIN users u ON rr.user_id = u.id
    LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
    WHERE rr.room_id = $1 AND rr.user_id = $2
  `;
  const result = await query(queryText, [roomId, userId]);
  return result.length > 0 ? result[0] : null;
}

async function getProfileFromDB(userId: string): Promise<Partial<UserRoleData> | null> {
  const queryText = `
    SELECT 
      u.name, u.country, 
      ui.image_path
    FROM users u
    LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
    WHERE u.id = $1
  `;
  const result = await query(queryText, [userId]);
  return result.length > 0 ? result[0] : null;
}

export async function joinRoom(roomId: string, userId: string): Promise<JoinRoomResult> {
  const redis = await getRedisClient();
  const bp = await BatchProcessor.getInstance();
  const roomKey = getRedisKey('room', roomId)
  const rolesKey = getRedisKey('room', roomId, REDIS_ROLES_PREFIX)

  try {
    connectDB();

    let room: RoomData | null = await redis.hGetAll(roomKey);
    if (!room || Object.keys(room).length === 0) {
      room = await getRoomFromDB(roomId);
      if (!room) return { ok: false, status: 404, data: { error: "Room not found" } };

      await redis.hSet(roomKey, Object.fromEntries(
        Object.entries(room).map(([k, v]) => [k, String(v)])
      ));
      const speakers = await getSpeakersFromDB(roomId);
      for (const speaker of speakers) {
        await redis.hSet(rolesKey, speaker.id, JSON.stringify(speaker));
      }
    }

    let role: UserRoleData | null = null;
    const cachedRole = await redis.hGet(rolesKey, userId);
    if (cachedRole) {
      role = JSON.parse(cachedRole);
    } else {
      role = await getUserRoleFromDB(roomId, userId);
    }

const badgeMap = await getUserBadges(userId); // Record<string, Badge[]>
const topBadgeMap = await getTopBadges(userId); // Record<string, Badge[]>

const badges = badgeMap[userId] || [];
const topBadges = topBadgeMap[userId] || [];

const name_style = getNameStyleFromBadges(badges);


    if (role) {
      if (["holder", "host"].includes(role.role || '')) {
        await query(
          `UPDATE room_roles SET status = 'inside' WHERE user_id = $1 AND room_id = $2`,
          [userId, roomId]
        );
      }

      role.status = "inside";
      role.name_style = name_style;
      role.topBadges = topBadges;

      await redis.hSet(rolesKey, userId, JSON.stringify(role));

      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { status: "inside" },
        condition: { user_id: userId, room_id: roomId },
        dedupeKey: `room_join:${userId}:${roomId}`
      }, true);
    } else {
      const profile = await getProfileFromDB(userId);
      if (!profile) return { ok: false, status: 404, data: { error: "User not found" } };

      role = {
        id: userId,
        status: "inside",
        ...profile,
        name_style,
        topBadges
      };

      await redis.hSet(rolesKey, userId, JSON.stringify(role));

      await bp.addToQueue({
        operation: "insert",
        entity: "room_roles",
        data: {
          user_id: userId,
          room_id: roomId,
          role: "listener",
          status: "inside",
          position: '0'
        }
      });
    }

    const participants = await redis.hGetAll(rolesKey);
    const activeParticipants = Object.values(participants)
      .map((p: any) => JSON.parse(p))
      .filter(p => ["holder", "host"].includes(p.role ?? '') || p.id === userId);

    return { ok: true, data: { ...room, participants: activeParticipants } };
  } catch (error) {
    console.error("joinRoom error:", error);
    return { ok: false, status: 500, data: { error: "Internal server error" } };
  }
}
