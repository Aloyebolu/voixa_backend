/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getRedisClient } from "@/app/lib/redis/redis";
import { getUserIdFromRequest } from "@/app/lib/utils";
import { ERROR_CODES } from "@/app/utils/errorCodes";
import { BatchProcessor } from "@/app/lib/batchProcessor";
// import { BatchProcessor } from "@/app/lib/batchProcessor";

// Constants
const REDIS_ROOM_PREFIX = 'room';
const REDIS_ROLES_PREFIX = 'roles';

// Types
interface RoomData {
  id?: string;
  [key: string]: any | null
}

interface UserRoleData {
  id: string;
  role?: string;
  status?: string;
  [key: string]: any;
}

// Helper functions
function setCorsHeaders(response: NextResponse): NextResponse {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function getRedisKeys(roomId: string) {
  return {
    roomKey: `${REDIS_ROOM_PREFIX}:${roomId}`,
    rolesKey: `${REDIS_ROOM_PREFIX}:${roomId}:${REDIS_ROLES_PREFIX}`
  };
}

async function getRoomFromDatabase(roomId: string): Promise<RoomData | null> {
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
    const result = await query(queryText, [roomId])
    
  return result.length > 0 ? result[0] : null;

  
}
async function getSpeakersRolesFromDatabase(roomId: string): Promise<UserRoleData[] | null> {
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

  const result: UserRoleData[] = await query(queryText, [roomId]);
  return result.length > 0 ? result : null;
}
async function getUserRoleFromDatabase(roomId: string, userId: string): Promise<UserRoleData | null> {
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

async function getUserProfileFromDatabase(userId: string): Promise<Partial<UserRoleData> | null> {
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

export async function OPTIONS(): Promise<NextResponse> {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let redis;
  
  try {
    // Initialize connections
    await connectDB();
    redis = await getRedisClient();
    const bp = await BatchProcessor.getInstance();

    // Authentication
    const { userId } = getUserIdFromRequest(request);
    // const userId = DEFAULT_USER_ID; 
    if (!userId) {
      console.warn('Unauthorized access attempt');
      return setCorsHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    // Request validation
    // const { roomId: roomIdString } = await request.json();
    const roomIdString = '50'
    const roomId = String(roomIdString);
    if (!roomId) {
      console.warn('Missing room ID in request', { userId });
      return setCorsHeaders(
        NextResponse.json({ error: "Room ID is required" }, { status: 400 })
      );
    }

    const { roomKey, rolesKey } = getRedisKeys(roomId);

    // 1. Get room data (Redis -> DB fallback)
    let roomData: RoomData | null = await redis.hGetAll(roomKey);
    
    if (!roomData || Object.keys(roomData).length === 0) {
      roomData = await getRoomFromDatabase(roomId);
      const speakers = await getSpeakersRolesFromDatabase(roomId)
      if (!roomData) {
        console.error('Room not found', { roomId, userId });
        return setCorsHeaders(
          NextResponse.json({ error: "Room not found" }, { status: 404 })
        );
      }

      // Cache room data in Redis
      const stringifiedRoom = Object.fromEntries(
        Object.entries(roomData).map(([key, val]) => [key, String(val)])
      );
      await redis.hSet(roomKey, stringifiedRoom);
      console.log('🛢️Room fetched from DB', { roomId });

      if(!speakers) {
        //  console.warn('No speakers found for room', { roomId });
        return setCorsHeaders(
          NextResponse.json({ error: "No speakers found for room" }, { status: 404 })
        );
      }
      // Cache speakers in Redis
      for (const speaker of speakers) {
        await redis.hSet(rolesKey, speaker.id, JSON.stringify(speaker));
      }
    }

    // 2. Get user role (Redis -> DB fallback)
    let userRole: UserRoleData | null = null;
    const cachedRole = await redis.hGet(rolesKey, userId);
    
    if (cachedRole) {
      userRole = JSON.parse(cachedRole);
      console.log('🔰User role fetched from Redis', { roomId, userId });
    } else {
      userRole = await getUserRoleFromDatabase(roomId, userId);
      
      if (userRole) {
        await redis.hSet(rolesKey, userId, JSON.stringify(userRole));
        console.log('🛢️User role fetched from database', { roomId, userId });
      }
    }

    // 3. Check if user is banned
    console.log(userRole)
    if (userRole?.status === "removed") {
      console.warn('‼️Banned user attempted to join room', { roomId, userId });
      return setCorsHeaders(
        NextResponse.json({
          code: ERROR_CODES.ROOM_BANNED.code,
          message: ERROR_CODES.ROOM_BANNED.defaultMessage
        }, { status: 403 })
      );
    }

    // 4. Check room capacity
    const { participant_count, max_participants } = await query(
      `SELECT 
        (SELECT COUNT(*) FROM room_roles WHERE room_id = $1 AND status = 'inside') AS participant_count,
        max_participants
      FROM rooms WHERE id = $1`,
      [roomId]
    ).then(res => res[0]);

    if (participant_count >= max_participants) {
      console.warn('Room full', { roomId, userId });
      return setCorsHeaders(
        NextResponse.json({
          code: ERROR_CODES.ROOM_FULL.code,
          message: ERROR_CODES.ROOM_FULL.defaultMessage
        }, { status: 403 })
      );
    }

    // 5. Update or create user role
    if (userRole) {
      if (["holder", "host"].includes(userRole.role || '')) {
        // For hosts/holders, update immediately in DB
        await query(
          `UPDATE room_roles SET status = 'inside' WHERE user_id = $1 AND room_id = $2`,
          [userId, roomId]
        );
        console.log('Host role updated in database', { userId, roomId });
      }
      
      // Update in Redis
      userRole.status = "inside";
      await redis.hSet(rolesKey, userId, JSON.stringify(userRole));

      // Also add to batch queue for deduplication
      await bp.addToQueue({
        operation: 'update',
        entity: 'room_roles',
        data: {
          status: 'inside',
        },
        condition: {
          user_id: userId,
          room_id: roomId
        },
        dedupeKey: `room_join:${userId}:${roomId}`
      }, true);
      console.log('New data added to the queue')
    } else {
      // New user - create basic role
      const userProfile = await getUserProfileFromDatabase(userId);
      if (!userProfile) {
        console.error('User profile not found', { userId });
        return setCorsHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 })
        );
      }

      userRole = {
        id: userId,
        status: "inside",
        ...userProfile
      };

      // Add to Redis immediately
      await redis.hSet(rolesKey, userId, JSON.stringify(userRole));
      console.log('New user added to room cache', { userId, roomId });
      
      // Add to batch queue for DB write
      await bp.addToQueue({
        operation: 'insert',
        entity: 'room_roles',
        data: {
          user_id: userId,
          room_id: roomId,
          role: 'listener',
          status: 'inside',
          created_at: new Date().toISOString()
        }
      });
    }

    // 6. Prepare response data
    const participants = await redis.hGetAll(rolesKey);
    const activeParticipants = Object.entries(participants)
      .map(([, data]) => JSON.parse(data))
      .filter(participant => 
        ['holder', 'host'].includes(participant.role || '') || 
        participant.id === userId
      );

    const responseData = {
      ...roomData,
      participants: activeParticipants
    };

    return setCorsHeaders(NextResponse.json(responseData));
  } catch (error) {
    console.error('Error in room join API:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: "Internal server error" }, 
        { status: 500 }
      )
    );
  } finally {
    if (redis) {
      // redis.quit(); // Uncomment if you need to manually close connection
    }
  }
}